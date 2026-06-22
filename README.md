# FitFamily Training Tracker

Family fitness tracking PWA, self-hosted on a NAS via Docker. Authentication via Clerk; users are assigned a trainer/trainee role on sign-up.

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
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` |
| `CLERK_WEBHOOK_SECRET` | Svix signing secret for the user webhook | `whsec_...` |
| `TRAINER_EMAILS` | Comma-separated trainer allow-list (seeded as `role=trainer`) | `me@example.com,partner@example.com` |

> All Clerk keys are read at **runtime** — none are baked into the Docker image. The publishable key is passed to `ClerkProvider`/`clerkMiddleware` explicitly (note: no `NEXT_PUBLIC_` prefix), so the published image stays generic and each operator supplies their own keys via `.env`. Changing any key requires only a container restart, not a rebuild.

---

## Clerk Webhook

On `user.created`, Clerk POSTs to `/api/webhooks/clerk`; the handler assigns the user's role and links a trainee record. The request is svix-signature-verified with `CLERK_WEBHOOK_SECRET`.

Clerk pushes from its own servers, so the endpoint must be reachable from the public internet — `localhost` / NAS LAN won't work directly.

**Local development (ngrok tunnel):**

```bash
ngrok http 3000
# → forwards a public URL, e.g. https://rice-underline-mobile.ngrok-free.dev
```

Then in the [Clerk dashboard](https://dashboard.clerk.com) → **Webhooks → Add Endpoint**:

- URL: `https://rice-underline-mobile.ngrok-free.dev/api/webhooks/clerk`
- Subscribe to event: **`user.created`**
- Create, then copy the **Signing Secret** (`whsec_...`) into `CLERK_WEBHOOK_SECRET` in `.env` and restart the app.

Verify with the endpoint's **Send test event** (`user.created`) and watch the app logs. The free ngrok URL changes on each restart — update the Clerk endpoint URL each time.

**Production:** point the endpoint at your NAS public URL (reverse proxy / DDNS), e.g. `https://yourdomain/api/webhooks/clerk`.

---

## Trainer Setup

Roles are driven by the `AllowedUser` table. On `user.created`, the webhook looks up the new user's email:

- **In the allow-list** → role assigned from the matching row (`trainer` rows are seeded from `TRAINER_EMAILS`); a `trainee` row also links the existing trainee record.
- **Not in the allow-list** → the Clerk user is deleted (sign-up rejected).

Set `TRAINER_EMAILS` (comma-separated), then seed the `AllowedUser` rows:

```bash
# In the running container (no package.json in the image, so call the script directly)
docker compose exec app npx tsx prisma/seed.ts

# Or locally against the dev DB
npx prisma db seed
```

The seed is idempotent (`skipDuplicates`) — safe to re-run after adding emails. Trainees are added from within the app by a trainer, not via this list.

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
