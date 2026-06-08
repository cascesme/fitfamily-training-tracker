# GitHub Workflows Design

**Date:** 2026-06-08  
**Scope:** Two GitHub Actions workflows — automated CI and manual E2E.

---

## Goals

- Block merges to `main` on lint/type/unit/integration failures.
- Provide a manually-triggered E2E workflow that runs the full stack via Docker Compose.

---

## Workflow 1: CI (`ci.yml`)

**Trigger:** `push` and `pull_request` targeting `main`.

**Runner:** `ubuntu-latest` (has Docker daemon — required for testcontainers).

**Steps (in order):**

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 22, npm cache enabled
3. `npm ci`
4. `npx prisma generate` — generates the Prisma client types needed for `tsc`
5. `npx next lint` — ESLint via Next.js built-in (no `lint` script exists in package.json; use `npx next lint` directly or add a script)
6. `npx tsc --noEmit` — TypeScript type check
7. `npm run test:unit` — Jest unit tests, no DB
8. `npm run test:integration` — Jest + testcontainers; Docker daemon on `ubuntu-latest` provides the PostgreSQL container

**No secrets required.** Testcontainers manages its own DB. No `DATABASE_URL` env var needed.

---

## Workflow 2: E2E (`e2e.yml`)

**Trigger:** `workflow_dispatch` only (manual).

**Runner:** `ubuntu-latest`.

**Steps (in order):**

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 22, npm cache enabled
3. `npm ci`
4. `npx playwright install --with-deps chromium` — install browser + OS deps
5. `docker compose -f docker-compose.test.yml up -d --build` — start app + DB
6. Wait for app ready: `curl` retry loop (`curl -f http://localhost:3000` with retries, 5s intervals, max 60s)
7. `npm run test:e2e` — Playwright tests against `localhost:3000`
8. `actions/upload-artifact@v4` — upload `playwright-report/` on failure (always runs via `if: failure()`)
9. `docker compose -f docker-compose.test.yml down -v` — teardown (always runs via `if: always()`)

**No secrets required.** `docker-compose.test.yml` has all credentials baked in for local/CI use.

---

## File Layout

```
.github/
  workflows/
    ci.yml
    e2e.yml
```

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Two files vs one | Two files | Single responsibility; E2E config isolated |
| Node version | 22 | Matches `node:22-alpine` in Dockerfile |
| Lint command | `npx next lint` | No `lint` script in package.json; Next.js built-in |
| Playwright browsers | Chromium only | E2E tests don't require cross-browser; keeps job fast |
| Artifact upload | On failure only | Report only needed when debugging failures |

---

## Non-Goals

- No branch protection rules (configured in GitHub settings, not workflows).
- No deployment steps.
- No matrix builds (single Node version matches Dockerfile).
