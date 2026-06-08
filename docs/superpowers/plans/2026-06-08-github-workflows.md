# GitHub Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `lint`/`typecheck` npm scripts and two GitHub Actions workflows — automated CI on push/PR and a manually-triggered E2E workflow.

**Architecture:** Three file changes: add scripts to `package.json` (plus a minimal `eslint.config.mjs` so `next lint` is non-interactive in CI), create `ci.yml` for automated checks, create `e2e.yml` for manual E2E. The Playwright config already has `reuseExistingServer: !!process.env.CI` — GitHub Actions sets `CI=true`, so Playwright will reuse the docker-compose stack started by the workflow rather than launching its own.

**Tech Stack:** GitHub Actions, Next.js 15 (`next lint`), TypeScript (`tsc --noEmit`), Jest + testcontainers, Playwright (chromium + webkit), Docker Compose.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add `lint` and `typecheck` scripts |
| `eslint.config.mjs` | Create | ESLint flat config — prevents interactive prompt in CI |
| `.github/workflows/ci.yml` | Create | Auto-triggered on push/PR: lint, typecheck, unit, integration |
| `.github/workflows/e2e.yml` | Create | Manual-only: full-stack E2E via Docker Compose |

---

### Task 1: Add npm scripts and ESLint config

**Files:**
- Modify: `package.json`
- Create: `eslint.config.mjs`

- [ ] **Step 1: Add `lint` and `typecheck` to `package.json` scripts block**

Replace the existing `scripts` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test:unit": "jest --selectProjects unit",
  "test:integration": "jest --selectProjects integration",
  "test:e2e": "playwright test",
  "prisma:migrate": "prisma migrate dev"
},
```

- [ ] **Step 2: Create `eslint.config.mjs`**

`next lint` with no config file prompts interactively — CI runners have no TTY, so the job hangs. Create the minimal flat config:

```js
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
```

`@eslint/eslintrc` is a transitive dependency of `eslint-config-next` — it is already in `node_modules`, no extra install needed.

- [ ] **Step 3: Verify `npm run lint` runs without interactive prompts**

```bash
npm run lint
```

Expected: lint output (warnings or errors are OK at this point; what matters is no prompt and no hang). If you see `Error: Cannot find module '@eslint/eslintrc'`, run `npm install --save-dev @eslint/eslintrc` then retry.

- [ ] **Step 4: Verify `npm run typecheck` runs**

```bash
npm run typecheck
```

Expected: exits 0 or prints type errors. Fix any type errors before continuing — they will fail the CI job.

- [ ] **Step 5: Commit**

```bash
git add package.json eslint.config.mjs package-lock.json
git commit -m "chore: add lint and typecheck npm scripts"
```

---

### Task 2: Create CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflows directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration
```

Notes:
- `ubuntu-latest` has Docker daemon pre-installed — testcontainers uses it for integration tests.
- `npx prisma generate` runs before `typecheck` so generated types are available to `tsc`.
- No `DATABASE_URL` needed — testcontainers manages its own PostgreSQL container.

- [ ] **Step 3: Validate YAML syntax**

```bash
npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow for lint, typecheck, unit, and integration tests"
```

---

### Task 3: Create E2E workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

Context: `playwright.config.ts` has `webServer.reuseExistingServer: !!process.env.CI`. GitHub Actions sets `CI=true` automatically. This means when the E2E job runs, Playwright will detect the stack is already up (started by the workflow) and skip launching its own `webServer.command`. The workflow owns the lifecycle: start → test → teardown.

- [ ] **Step 1: Create `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

on:
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start stack
        run: docker compose -f docker-compose.test.yml up -d --build

      - name: Wait for app
        run: |
          echo "Waiting for app to be ready..."
          for i in $(seq 1 24); do
            if curl -sf http://localhost:3000 > /dev/null; then
              echo "App ready after $((i * 5))s"
              exit 0
            fi
            echo "Attempt $i/24 — retrying in 5s..."
            sleep 5
          done
          echo "App did not become ready within 120s"
          docker compose -f docker-compose.test.yml logs
          exit 1

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Teardown stack
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

Notes:
- `npx playwright install --with-deps` installs all browsers in the project config (chromium for Mobile Chrome, webkit for Mobile Safari) plus OS dependencies.
- `CI=true` is set by GitHub Actions — Playwright's `reuseExistingServer` becomes `true`, so it uses the running stack and does not execute `webServer.command`.
- Wait loop: 24 × 5s = 120s max. On failure, prints container logs before exiting.
- `down -v` removes volumes — prevents state leaking between runs.

- [ ] **Step 2: Validate YAML syntax**

```bash
npx --yes js-yaml .github/workflows/e2e.yml > /dev/null && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add manual E2E workflow"
```
