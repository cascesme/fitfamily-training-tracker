# FitFamily Training Tracker — Design Spec

**Date:** 2026-06-08  
**Status:** Approved

---

## 1. Overview

Family fitness tracking app. Runs as a PWA on web browsers and iPhone (installed via Safari). Self-hosted on a NAS via Docker. No authentication, no user roles, no internet exposure.

Two modes:
- **Trainer Mode** — manage exercises, training plans, trainees, view progression
- **Trainee Mode** — run training sessions, track weight/sets/reps, log calories

---

## 2. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x (latest) |
| Language | TypeScript | 5.x (latest) |
| Styling | Tailwind CSS | 4.x (latest) |
| ORM | Prisma | latest |
| Database | PostgreSQL | 17 |
| i18n | next-intl | latest |
| Validation | Zod | latest |
| Unit/Integration tests | Jest + @testcontainers/postgresql | latest |
| E2E tests | Playwright | latest |
| Containerization | Docker + Docker Compose | latest |

All libraries must be pinned to latest compatible versions at project init. No downgrading without justification.

---

## 3. Architecture

### Deployment

Two Docker services:

```
app   → Next.js PWA (port 3000, exposed to LAN)
db    → PostgreSQL 17 (internal network only, not exposed)
```

Media files (videos, photos, PDFs) stored in a named Docker volume mounted into `app` at `/data/media`.

### Project Structure

```
training-assistant/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # Thin API route handlers
│   │   │   ├── exercises/
│   │   │   ├── plans/
│   │   │   ├── trainees/
│   │   │   ├── sessions/
│   │   │   └── media/
│   │   ├── (trainer)/              # Trainer mode route group
│   │   │   ├── trainer/
│   │   │   │   ├── exercises/
│   │   │   │   ├── plans/
│   │   │   │   ├── trainees/
│   │   │   │   └── progress/
│   │   └── (trainee)/              # Trainee mode route group
│   │       ├── trainee/
│   │       │   ├── [traineeId]/
│   │       │   │   ├── session/[planId]/
│   │       │   │   └── exercise/[exerciseId]/
│   ├── lib/
│   │   ├── services/               # Business logic (SOLID, single responsibility)
│   │   │   ├── ExerciseService.ts
│   │   │   ├── ExerciseMediaService.ts
│   │   │   ├── TrainingPlanService.ts
│   │   │   ├── TraineeService.ts
│   │   │   ├── SessionService.ts
│   │   │   └── ProgressionService.ts
│   │   ├── repositories/           # DB access only, one per entity
│   │   │   ├── ExerciseRepository.ts
│   │   │   ├── ExerciseMediaRepository.ts
│   │   │   ├── TrainingPlanRepository.ts
│   │   │   ├── TraineeRepository.ts
│   │   │   ├── SessionRepository.ts
│   │   │   └── SessionLogRepository.ts
│   │   ├── domain/                 # Types, interfaces, Zod schemas
│   │   │   ├── exercise.ts
│   │   │   ├── plan.ts
│   │   │   ├── trainee.ts
│   │   │   └── session.ts
│   │   └── db.ts                   # Prisma client singleton
│   ├── components/                 # Shared UI components
│   └── i18n/
│       ├── en.json                 # English base translations
│       └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/                # Uses @testcontainers/postgresql
│   └── e2e/                        # Playwright
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── manifest.json               # PWA manifest
├── docker-compose.yml
├── docker-compose.test.yml
└── Dockerfile
```

**Rule:** API routes call one service method and return. No business logic in routes. Repositories are the only files that import Prisma. Services never import Prisma directly.

---

## 4. Data Model

### Prisma Schema (entities)

```prisma
enum TrackingType {
  WEIGHT
  TIME
  NONE
}

enum MediaType {
  VIDEO
  PHOTO
  PDF
  YOUTUBE
}

model Trainee {
  id         String    @id @default(cuid())
  name       String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  sessions   TrainingSession[]
}

model Exercise {
  id           String        @id @default(cuid())
  name         String
  description  String?
  trackingType TrackingType  @default(WEIGHT)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  media        ExerciseMedia[]
  planItems    TrainingPlanItemExercise[]
  sessionLogs  TrainingSessionLog[]
}

model ExerciseMedia {
  id               String     @id @default(cuid())
  exerciseId       String
  exercise         Exercise   @relation(fields: [exerciseId], references: [id])
  type             MediaType
  filePath         String?    // local uploads (VIDEO, PHOTO, PDF)
  url              String?    // YouTube links
  originalFilename String?
  position         Int        // 1–10, order within exercise
  createdAt        DateTime   @default(now())
  @@unique([exerciseId, position])
}

model TrainingPlan {
  id          String              @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  items       TrainingPlanItem[]
  sessions    TrainingSession[]
}

model TrainingPlanItem {
  id         String                     @id @default(cuid())
  planId     String
  plan       TrainingPlan               @relation(fields: [planId], references: [id])
  position   Int                        // order within plan
  exercises  TrainingPlanItemExercise[]
  @@unique([planId, position])
}

model TrainingPlanItemExercise {
  id         String           @id @default(cuid())
  itemId     String
  item       TrainingPlanItem @relation(fields: [itemId], references: [id])
  exerciseId String
  exercise   Exercise         @relation(fields: [exerciseId], references: [id])
  sets       Int
  reps       Int
  slot       Int              // 1 = single or first of biseries, 2 = second of biseries
  @@unique([itemId, slot])
}

model TrainingSession {
  id             String               @id @default(cuid())
  traineeId      String
  trainee        Trainee              @relation(fields: [traineeId], references: [id])
  planId         String?              // null = single exercise session
  plan           TrainingPlan?        @relation(fields: [planId], references: [id])
  startedAt      DateTime             @default(now())
  finishedAt     DateTime?
  caloriesBurned Int?                 // entered manually from Apple Watch
  logs           TrainingSessionLog[]
}

model TrainingSessionLog {
  id            String          @id @default(cuid())
  sessionId     String
  session       TrainingSession @relation(fields: [sessionId], references: [id])
  exerciseId    String
  exercise      Exercise        @relation(fields: [exerciseId], references: [id])
  planItemId    String?         // null for single exercise sessions
  setNumber     Int
  weightKg      Float?          // for WEIGHT tracking type
  durationSecs  Int?            // for TIME tracking type (future)
  repsDone      Int?
  completedAt   DateTime        @default(now())
}
```

### Business Rules (enforced in services, not DB)

- `Exercise` cannot be deleted if any `TrainingSessionLog` references it
- `Trainee` cannot be deleted if any `TrainingSession` references them
- `ExerciseMedia` count per exercise must remain ≤ 10
- `TrainingPlanItem` with `slot=2` requires `slot=1` to exist (biseries pair)

---

## 5. Mode Switching & Navigation

Mode stored in `localStorage` and React context (`ModeContext`). Default: Trainee Mode.

A persistent "Trainer Mode" toggle in the app header switches modes. No PIN/auth required.

### Trainee Mode Routes

```
/                               → Home: pick who you are (trainee list)
/trainee/[traineeId]            → Trainee dashboard: start training or single exercise
/trainee/[traineeId]/session/[planId]     → Run full training plan
/trainee/[traineeId]/exercise/[id]        → Single exercise session
```

### Trainer Mode Routes

```
/trainer                        → Trainer home (nav to all sections)
/trainer/exercises              → Exercise list (CRUD)
/trainer/exercises/[id]         → Exercise detail + media management
/trainer/plans                  → Training plan list (CRUD)
/trainer/plans/[id]             → Plan builder
/trainer/trainees               → Trainee list (CRUD)
/trainer/progress               → Progression dashboard (low priority v1)
```

---

## 6. Feature Specifications

### 6.1 Trainer Mode — Exercise Management

- Create exercise: name (required), description (optional), tracking type (WEIGHT / TIME / NONE)
- Edit exercise: all fields editable at any time
- Delete exercise: blocked if used in any `TrainingSessionLog`; show message explaining why
- Media per exercise: up to 10 items. Types: VIDEO (upload), PHOTO (upload), PDF (upload), YOUTUBE (URL)
- Media display: photos shown inline, videos playable in-app, YouTube embedded via iframe (requires NAS to have outbound internet access), PDFs downloadable (not previewed inline)
- Media ordering: drag-to-reorder (position field)
- Media delete: always allowed

### 6.2 Trainer Mode — Training Plan Builder

- Create plan: name, description
- Add items to plan in order (position)
- Each item is either:
  - **Single**: one exercise with sets + reps
  - **Biseries**: two exercises sharing one series slot (slot 1 + slot 2), each with sets + reps
- Reorder items via drag
- Delete plan: always allowed (sessions referencing it retain the planId as historical record)
- Edit plan: full edit including reordering and changing exercises

### 6.3 Trainer Mode — Trainee Management

- Create trainee: name only
- Edit trainee: name only
- Delete trainee: blocked if any `TrainingSession` references them

### 6.4 Trainer Mode — Progression Dashboard (low priority)

- Select trainee → see charts:
  - Weight progression per exercise over time (line chart)
  - Session frequency (sessions per week/month)
  - Training periods (calendar heatmap or date range list)
  - Calories per session (if logged)
- Implement after core trainee flows are complete

### 6.5 Trainee Mode — Running a Training Plan

1. Pick name from trainee list
2. Pick a saved training plan
3. For each `TrainingPlanItem` in order:
   - Show exercise name, description, sets, reps
   - Show scrollable horizontal media strip (videos, photos, YouTube thumbnails)
   - Show previous session data for this exercise: last weight × reps (if available)
   - If `trackingType = WEIGHT`: show weight input (kg, numeric stepper) and reps input
   - If `trackingType = TIME`: show duration input (future)
   - If `trackingType = NONE`: no input
   - For biseries: show both exercises stacked, each with their own inputs
   - "Mark Done" button: user inputs weight/reps for current set, taps "Mark Done" → one `TrainingSessionLog` row written → set counter increments. Repeat until all sets complete.
   - After all sets for the current item done → auto-advance to next `TrainingPlanItem`
4. After all items complete → "Finish Training" screen
   - Show summary: exercises done, total sets, weights used
   - Optional: enter calories burned (Apple Watch input, integer)
   - Save session

### 6.6 Trainee Mode — Single Exercise Session

1. Pick name from trainee list
2. Browse exercise list → select one
3. User declares target sets + reps up front
4. Same per-set flow as plan session: enter weight/reps per set → "Mark Done" → next set
5. After all sets done → "Finish" → enter calories (optional) → save session

---

## 7. UI Design

- Style: ultra-minimalist dark theme
- Primary accent: `#E85D26` (orange), used only for primary CTAs
- Backgrounds: `#0A0A0A`, `#111111`, `#1A1A1A`
- Typography: Manrope (headlines), Inter (body)
- Key numbers (weight, sets, reps) rendered in large bold type
- No gradients, no drop shadows, no decorative elements
- Cards: subtle border only (`1px solid rgba(255,255,255,0.08)`)
- Border radius: 8px
- Fully responsive — mobile-first, works on desktop too
- PWA manifest with app icon, `display: standalone`, theme color

---

## 8. i18n

- Library: `next-intl`
- Base locale: `en` (`src/i18n/en.json`)
- All user-facing strings go through translation keys — no hardcoded UI text
- Structure supports adding new locales by adding a new JSON file
- No language switcher in v1 (English only)

---

## 9. Testing Strategy

### Unit Tests (Jest)

- All service methods tested in isolation
- Repositories mocked via interface
- Zod schema validation tested
- Business rule enforcement tested (delete guards, media limit)

### Integration Tests (Jest + Testcontainers)

- Real PostgreSQL container spun up per test suite
- Repository methods tested against real DB
- Prisma migrations run before each suite
- Session tracking flows tested end-to-end through service → repository → DB

### E2E Tests (Playwright)

- Golden paths:
  - Trainer creates exercise with media
  - Trainer creates training plan with biseries
  - Trainee runs a full training plan session
  - Trainee logs a single exercise
  - Trainer views exercise list
- Deletion guard flows (exercise in use, trainee in use)
- Media upload and display
- PWA installability check (manifest + service worker)
- Run against local Docker Compose stack

---

## 10. Docker Setup

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: fitfamily
      POSTGRES_USER: fitfamily
      POSTGRES_PASSWORD: fitfamily
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - internal

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://fitfamily:fitfamily@db:5432/fitfamily
      MEDIA_PATH: /data/media
    volumes:
      - media_data:/data/media
    depends_on:
      - db
    networks:
      - internal

volumes:
  db_data:
  media_data:

networks:
  internal:
```

---

## 11. Future Features (Out of Scope for v1)

- **Apple Watch integration**: auto-track sets/reps via watchOS app
- **Time-based exercise mode (Tabata)**: per-exercise work/rest timer using `durationSecs` field already in schema
- **Language toggle**: add additional locale JSON files to `src/i18n/`

Both future features are scaffolded in the data model (`durationSecs`, `trackingType=TIME`) and i18n setup, requiring no schema migration when implemented.
