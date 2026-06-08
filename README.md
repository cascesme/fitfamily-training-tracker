# FitFamily Training Tracker

Family fitness tracking PWA, self-hosted on a NAS via Docker. No authentication — designed for household use.

Two modes: **Trainer** (manage exercises, plans, trainees) and **Trainee** (run sessions, log sets).

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS 4 |
| Language | TypeScript 5 |
| Database | PostgreSQL 17 + Prisma ORM |
| i18n | next-intl |
| Validation | Zod |
| Tests | Jest + Testcontainers (unit/integration), Playwright (E2E) |
| Hosting | Docker Compose (self-hosted) |

---

## Features

- **Exercises** — create with name, description, tracking type (weight / time / none), and up to 10 media items (video, photo, PDF, YouTube embed)
- **Training Plans** — ordered plan items with biseries support (two exercises per slot)
- **Trainees** — family member profiles, each with full session history
- **Sessions** — trainees run plans set-by-set; each set logged with weight, reps, or duration
- **PWA** — installable, offline-capable via service worker

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for local development)

### Production

```bash
# Clone the repo
git clone <repo-url>
cd training-assistant

# Start the stack (app on :3000, DB internal only)
docker compose up -d

# Run DB migrations
docker compose exec app npx prisma migrate deploy
```

App available at `http://<nas-ip>:3000`.

Media files persisted to the `media_data` Docker volume (mounted at `/data/media` inside the container).

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit DATABASE_URL in .env.local

# Run migrations
npm run prisma:migrate

# Start dev server
npm run dev
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://fitfamily:fitfamily@db:5432/fitfamily` |
| `MEDIA_PATH` | Path for uploaded media files | `/data/media` |
| `NODE_ENV` | `development` or `production` | `production` |

---

## Scripts

```bash
npm run dev               # Start dev server
npm run build             # Production build
npm run start             # Start production server
npm run typecheck         # TypeScript check (no emit)
npm run lint              # ESLint
npm run test:unit         # Unit tests (Jest)
npm run test:integration  # Integration tests (Jest + Testcontainers)
npm run test:e2e          # E2E tests (Playwright)
npm run prisma:migrate    # Run DB migrations
```

---

## Testing

**Unit** — service logic, Zod schemas, business rules. Repositories mocked via interfaces. Run with `npm run test:unit`.

**Integration** — real PostgreSQL container per suite via Testcontainers. Covers full service → repository → DB flows. Run with `npm run test:integration`.

**E2E** — full Docker Compose stack. Covers golden paths and failure paths (blocked deletes, media limits, biseries validation). Run with `npm run test:e2e`.

To run E2E tests against the local stack:

```bash
docker compose -f docker-compose.test.yml up -d
npm run test:e2e
```

---

## Data Model

```
Trainee ──< TrainingSession >── TrainingPlan
                  │                   │
                  │              TrainingPlanItem
                  │                   │
       TrainingSessionLog      TrainingPlanItemExercise
                  │                   │
                  └──── Exercise ──────┘
                              │
                        ExerciseMedia (≤ 10)
```

**Business rules enforced in services:**
- Exercise delete blocked if referenced by any session log
- Trainee delete blocked if referenced by any session
- Media count per exercise ≤ 10
- Biseries slot 2 requires slot 1 to exist

---

## API Docs

Swagger UI available at `/api-docs` when the app is running.

---

## Project Structure

```
src/
  app/
    api/                    # Thin HTTP handlers
    (trainer)/trainer/      # Trainer mode pages
    (trainee)/trainee/      # Trainee mode pages
  lib/
    services/               # Business logic
    repositories/           # DB access only
    domain/                 # Types, interfaces, Zod schemas, constants
    db.ts                   # Prisma singleton
    logger.ts               # Structured JSON logger
  components/               # Shared UI components
  i18n/                     # next-intl config + translations
tests/
  unit/
  integration/
  e2e/
prisma/
  schema.prisma
  migrations/
```

---

## License

See [LICENSE](LICENSE).
