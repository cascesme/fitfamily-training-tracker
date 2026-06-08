# FitFamily Training Tracker — Claude Code Guide

## Project Overview

Family fitness tracking PWA. Self-hosted on NAS via Docker. No auth. Two modes: Trainer (manage content) and Trainee (run sessions).

Stack: Next.js 15 (App Router) · TypeScript 5 · Tailwind CSS 4 · Prisma · PostgreSQL 17 · next-intl · Zod · Jest + Testcontainers · Playwright · Docker Compose.

Full spec: `docs/superpowers/specs/2026-06-08-fitfamily-training-tracker-design.md`

---

## Non-Negotiable Rules

### Architecture

- API routes call **one service method** and return. Zero business logic in routes.
- Repositories are the **only** files that import Prisma. Services never import Prisma directly.
- Business rules enforced in services, not the DB.
- Services depend on repository **interfaces**, not concrete implementations.

### SOLID — Enforced Always

**Single Responsibility (most critical):** every class/module has one reason to change.
- `ExerciseService` owns exercise business logic only.
- `ExerciseMediaService` owns media business logic only.
- Repositories do DB access only — no validation, no business rules.
- API routes do HTTP only — no validation logic beyond schema parsing.

**Open/Closed:** extend behavior via new classes/functions, not by mutating existing ones.

**Liskov Substitution:** repository mocks must be substitutable for real implementations in unit tests.

**Interface Segregation:** narrow interfaces per consumer. No fat "catch-all" repository interfaces.

**Dependency Inversion:** services depend on repository interfaces injected at construction, never on concrete classes.

### Version Policy

**Before adding any library, GitHub Action, or framework dependency:**
1. Web-search for the latest stable version.
2. Confirm compatibility with the current stack (Next.js 15, Node LTS, TypeScript 5, Prisma latest).
3. Pin to that exact version. Document the version in the relevant config file.
4. Never assume a version from memory — always verify.

---

## Testing Strategy

### TDD — Default Workflow

Write failing test first. Make it pass. Refactor. No exceptions for business logic.
Order: unit → integration → E2E.

### Unit Tests (Jest)

- Location: `tests/unit/`
- Scope: all service methods, Zod schemas, business rule enforcement (delete guards, media limit ≤ 10, biseries slot rules).
- Repositories mocked via interface (never a real DB).
- Must cover both happy paths and failure paths (guard violations, validation errors).

### Integration Tests (Jest + @testcontainers/postgresql)

- Location: `tests/integration/`
- Real PostgreSQL 17 container per suite — no mocks.
- Prisma migrations run before each suite.
- Covers: all repository methods, full service → repository → DB flows, session tracking, cascade rules.
- Must test failure paths: constraint violations, concurrent writes where relevant.

### E2E Tests (Playwright)

- Location: `tests/e2e/`
- Run against local Docker Compose stack.
- **Must cover both golden paths AND failure paths:**
  - Golden: trainer creates exercise with media, creates plan with biseries, trainee runs full plan, trainee logs single exercise.
  - Failure: delete exercise in use (blocked + error message), delete trainee in use (blocked), media upload over 10-item limit, biseries missing slot 1.
  - Edge: PWA installability (manifest + service worker), media display (video playback, YouTube embed, PDF download link).
- No skipping failure-path tests. They are as mandatory as golden paths.

---

## Code Style

- No comments unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant).
- No multi-paragraph docstrings.
- No backwards-compat shims for removed code.
- All user-facing strings via `next-intl` translation keys — zero hardcoded UI text.
- Zod schemas live in `src/lib/domain/`. Reuse across API routes and service layer.

---

## Business Rules (enforce in services)

- `Exercise` delete blocked if any `TrainingSessionLog` references it.
- `Trainee` delete blocked if any `TrainingSession` references them.
- `ExerciseMedia` count per exercise ≤ 10.
- `TrainingPlanItem` with `slot=2` requires `slot=1` to exist (biseries pair).

---

## Project Structure (abridged)

```
src/
  app/
    api/                  # Thin HTTP handlers only
    (trainer)/trainer/    # Trainer mode routes
    (trainee)/trainee/    # Trainee mode routes
  lib/
    services/             # Business logic — one class per entity concern
    repositories/         # DB access only — one per entity
    domain/               # Types, interfaces, Zod schemas
    db.ts                 # Prisma singleton
  components/             # Shared UI
  i18n/                   # next-intl config + en.json
tests/
  unit/
  integration/
  e2e/
prisma/
  schema.prisma
  migrations/
```

---

## Docker

- `docker-compose.yml` — production: `app` (port 3000, LAN-exposed) + `db` (internal only).
- `docker-compose.test.yml` — for E2E test runs against full stack.
- Media volume mounted at `/data/media` inside `app`.
- DB not exposed outside internal network.

---

## UI Constraints

- Dark theme only. Background: `#0A0A0A` / `#111111` / `#1A1A1A`.
- Primary accent: `#E85D26` (orange) — CTAs only.
- Fonts: Manrope (headlines), Inter (body).
- No gradients, no shadows, no decorative elements.
- Cards: `1px solid rgba(255,255,255,0.08)`, `border-radius: 8px`.
- Mobile-first. Key numbers (weight, sets, reps) in large bold type.
