# FitFamily Training Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a family fitness tracking PWA with Trainer and Trainee modes, running self-hosted via Docker on PostgreSQL 17.

**Architecture:** Next.js 15 App Router monolith. Thin API routes call one service method each. Services own business logic and depend on repository interfaces injected at construction. Repositories are the only layer that touches Prisma. Domain types, Zod schemas, and constants live in `src/lib/domain/`.

**Tech Stack:** Next.js 15 · TypeScript 5 · Tailwind CSS 4 · Prisma · PostgreSQL 17 · next-intl · Zod · Jest + @testcontainers/postgresql · Playwright · Docker Compose · @ducanh2912/next-pwa · @dnd-kit/core · recharts · pino

---

## File Map

### Infrastructure
- `prisma/schema.prisma` — full Prisma schema (6 models, 2 enums)
- `src/lib/db.ts` — Prisma client singleton (guards against hot-reload leaks in dev)
- `src/lib/logger.ts` — pino JSON logger singleton
- `src/lib/errors.ts` — typed error classes: NotFoundError, DeleteBlockedError, ValidationError, MediaLimitError
- `src/lib/domain/constants.ts` — shared constants (MAX_EXERCISE_MEDIA, etc.)
- `Dockerfile` — multi-stage build: deps → builder → runner
- `docker-compose.yml` — production stack: app + db
- `docker-compose.test.yml` — E2E test stack
- `next.config.ts` — standalone output, next-intl plugin, withPWA wrapper
- `postcss.config.mjs` — @tailwindcss/postcss
- `jest.config.ts` — two projects: unit and integration
- `playwright.config.ts` — E2E against localhost:3000
- `.env.example` — DATABASE_URL, MEDIA_PATH, LOG_LEVEL

### Domain Layer
- `src/lib/domain/exercise.ts` — Exercise types, IExerciseRepository, IExerciseMediaRepository, CreateExerciseSchema, UpdateExerciseSchema, CreateMediaSchema
- `src/lib/domain/plan.ts` — TrainingPlan types, ITrainingPlanRepository, CreatePlanSchema, UpdatePlanSchema, AddPlanItemSchema
- `src/lib/domain/trainee.ts` — Trainee type, ITraineeRepository, CreateTraineeSchema, UpdateTraineeSchema
- `src/lib/domain/session.ts` — TrainingSession, TrainingSessionLog types, ISessionRepository, ISessionLogRepository, StartSessionSchema, LogSetSchema, FinishSessionSchema

### Repositories
- `src/lib/repositories/ExerciseRepository.ts` — Prisma-backed IExerciseRepository implementation
- `src/lib/repositories/ExerciseMediaRepository.ts` — Prisma-backed IExerciseMediaRepository implementation
- `src/lib/repositories/TrainingPlanRepository.ts` — Prisma-backed ITrainingPlanRepository implementation
- `src/lib/repositories/TraineeRepository.ts` — Prisma-backed ITraineeRepository implementation
- `src/lib/repositories/SessionRepository.ts` — Prisma-backed ISessionRepository implementation
- `src/lib/repositories/SessionLogRepository.ts` — Prisma-backed ISessionLogRepository implementation

### Services
- `src/lib/services/ExerciseService.ts` — exercise CRUD with delete guard and logging
- `src/lib/services/ExerciseMediaService.ts` — media add/delete/reorder with ≤10 limit guard
- `src/lib/services/TrainingPlanService.ts` — plan CRUD, item management, biseries slot validation
- `src/lib/services/TraineeService.ts` — trainee CRUD with delete guard
- `src/lib/services/SessionService.ts` — start/log/finish session flows
- `src/lib/services/ProgressionService.ts` — aggregate queries for progression dashboard

### API Routes
- `src/app/api/exercises/route.ts` — GET (list) + POST (create)
- `src/app/api/exercises/[id]/route.ts` — GET, PATCH, DELETE
- `src/app/api/exercises/[id]/media/route.ts` — GET (list) + POST (upload/add)
- `src/app/api/exercises/[id]/media/[mediaId]/route.ts` — DELETE
- `src/app/api/exercises/[id]/media/reorder/route.ts` — POST (reorder positions)
- `src/app/api/plans/route.ts` — GET + POST
- `src/app/api/plans/[id]/route.ts` — GET, PATCH, DELETE
- `src/app/api/plans/[id]/items/route.ts` — POST (add item)
- `src/app/api/plans/[id]/items/[itemId]/route.ts` — DELETE
- `src/app/api/plans/[id]/items/reorder/route.ts` — POST
- `src/app/api/trainees/route.ts` — GET + POST
- `src/app/api/trainees/[id]/route.ts` — GET, PATCH, DELETE
- `src/app/api/sessions/route.ts` — POST (start session)
- `src/app/api/sessions/[id]/route.ts` — GET, PATCH (finish)
- `src/app/api/sessions/[id]/logs/route.ts` — POST (log a set)
- `src/app/api-docs/route.ts` — Swagger UI page
- `src/app/api/swagger/route.ts` — OpenAPI JSON spec endpoint

### Shared UI Components
- `src/components/ModeToggle.tsx` — trainer/trainee mode switcher in header
- `src/components/AppHeader.tsx` — top nav with mode toggle
- `src/components/Card.tsx` — dark-themed card with border
- `src/components/Button.tsx` — primary (orange accent) and secondary variants
- `src/components/Input.tsx` — dark-themed text input
- `src/components/NumericStepper.tsx` — +/- stepper for weight/reps inputs
- `src/components/MediaStrip.tsx` — horizontal scrollable media items strip
- `src/components/MediaItem.tsx` — renders VIDEO, PHOTO, YOUTUBE, or PDF link
- `src/components/EmptyState.tsx` — empty list placeholder
- `src/components/ErrorMessage.tsx` — inline error display
- `src/components/ConfirmDialog.tsx` — delete confirmation modal
- `src/components/DragHandle.tsx` — drag handle icon for sortable lists
- `src/lib/context/ModeContext.tsx` — React context + provider for mode state

### Trainer Pages
- `src/app/(trainer)/trainer/page.tsx` — trainer home with nav cards
- `src/app/(trainer)/trainer/exercises/page.tsx` — exercise list with create + delete
- `src/app/(trainer)/trainer/exercises/[id]/page.tsx` — exercise detail with media management
- `src/app/(trainer)/trainer/plans/page.tsx` — plan list with create + delete
- `src/app/(trainer)/trainer/plans/[id]/page.tsx` — plan builder with drag-reorder
- `src/app/(trainer)/trainer/trainees/page.tsx` — trainee list with create + delete
- `src/app/(trainer)/trainer/progress/page.tsx` — progression dashboard (recharts)

### Trainee Pages
- `src/app/page.tsx` — home: trainee picker list
- `src/app/(trainee)/trainee/[traineeId]/page.tsx` — trainee dashboard: pick plan or single exercise
- `src/app/(trainee)/trainee/[traineeId]/session/[planId]/page.tsx` — full plan session runner
- `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/page.tsx` — single exercise session

### App Shell
- `src/app/layout.tsx` — root layout with fonts, NextIntlClientProvider, ModeProvider
- `src/app/globals.css` — Tailwind v4 theme tokens + base styles
- `public/manifest.json` — PWA manifest
- `public/icons/icon-192.png` — PWA icon (192×192)
- `public/icons/icon-512.png` — PWA icon (512×512)

### i18n
- `src/i18n/request.ts` — next-intl server config
- `src/i18n/en.json` — all English translation keys

### Tests — Unit
- `tests/unit/domain/exercise.test.ts` — CreateExerciseSchema, UpdateExerciseSchema
- `tests/unit/domain/plan.test.ts` — CreatePlanSchema, AddPlanItemSchema
- `tests/unit/domain/trainee.test.ts` — CreateTraineeSchema
- `tests/unit/domain/session.test.ts` — StartSessionSchema, LogSetSchema
- `tests/unit/services/ExerciseService.test.ts` — CRUD + delete guard
- `tests/unit/services/ExerciseMediaService.test.ts` — add/delete + limit guard
- `tests/unit/services/TrainingPlanService.test.ts` — CRUD + biseries slot rule
- `tests/unit/services/TraineeService.test.ts` — CRUD + delete guard
- `tests/unit/services/SessionService.test.ts` — start/log/finish flows

### Tests — Integration
- `tests/integration/helpers/db.ts` — testcontainer setup/teardown helper
- `tests/integration/repositories/ExerciseRepository.test.ts` — full CRUD against real DB
- `tests/integration/repositories/ExerciseMediaRepository.test.ts` — media CRUD + reorder
- `tests/integration/repositories/TrainingPlanRepository.test.ts` — plan + items + biseries
- `tests/integration/repositories/TraineeRepository.test.ts` — trainee CRUD + hasSessions
- `tests/integration/repositories/SessionRepository.test.ts` — session lifecycle
- `tests/integration/services/ExerciseService.test.ts` — service → repo → DB flows

### Tests — E2E
- `tests/e2e/trainer-exercise.spec.ts` — create/edit/delete exercise + media upload
- `tests/e2e/trainer-plan.spec.ts` — create plan + add biseries items
- `tests/e2e/trainer-trainee.spec.ts` — create/delete trainee
- `tests/e2e/trainee-session.spec.ts` — run full plan + finish with calories
- `tests/e2e/trainee-single.spec.ts` — single exercise session
- `tests/e2e/delete-guards.spec.ts` — blocked delete flows with error messages
- `tests/e2e/pwa.spec.ts` — manifest + service worker installability

---

## Phase 1 — Foundation (Tasks 1–7)

### Task 1: Project scaffold + all dependencies

**Files:**
- Create: `/home/ccastro/Projects/training-assistant` (scaffold in place)

- [ ] **Step 1: Run create-next-app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install prisma @prisma/client next-intl zod pino @ducanh2912/next-pwa @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities recharts next-swagger-doc swagger-ui-react
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D jest @types/jest ts-jest jest-environment-node @testcontainers/postgresql testcontainers @playwright/test @tailwindcss/postcss @types/swagger-ui-react
```

- [ ] **Step 4: Set package.json scripts**

Edit `package.json` so the `scripts` section reads:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test:unit": "jest --selectProjects unit",
    "test:integration": "jest --selectProjects integration",
    "test:e2e": "playwright test",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

- [ ] **Step 5: Run to verify**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: scaffold Next.js 15 project with all dependencies"
```

---

### Task 2: Tailwind v4 + design tokens

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `postcss.config.mjs`

- [ ] **Step 1: Write globals.css**

```css
@import "tailwindcss";

@theme {
  --color-bg-base: #0A0A0A;
  --color-bg-surface: #111111;
  --color-bg-elevated: #1A1A1A;
  --color-accent: #E85D26;
  --color-border: rgba(255,255,255,0.08);
  --color-text-primary: #FFFFFF;
  --color-text-secondary: rgba(255,255,255,0.6);
  --font-display: 'Manrope', sans-serif;
  --font-body: 'Inter', sans-serif;
  --radius-card: 8px;
}

* { box-sizing: border-box; }
body { background: var(--color-bg-base); color: var(--color-text-primary); font-family: var(--font-body); }
```

- [ ] **Step 2: Write postcss.config.mjs**

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

- [ ] **Step 3: Write src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'FitFamily',
  description: 'Family fitness tracking',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Run to verify**

```bash
npm run dev
```

Expected: app loads at http://localhost:3000 with dark background (#0A0A0A).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx postcss.config.mjs
git commit -m "feat: add Tailwind v4 design tokens and dark theme"
```

---

### Task 3: Prisma schema + migration + db.ts

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  id        String           @id @default(cuid())
  name      String
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  sessions  TrainingSession[]
}

model Exercise {
  id           String                     @id @default(cuid())
  name         String
  description  String?
  trackingType TrackingType               @default(WEIGHT)
  createdAt    DateTime                   @default(now())
  updatedAt    DateTime                   @updatedAt
  media        ExerciseMedia[]
  planItems    TrainingPlanItemExercise[]
  sessionLogs  TrainingSessionLog[]
}

model ExerciseMedia {
  id               String    @id @default(cuid())
  exerciseId       String
  exercise         Exercise  @relation(fields: [exerciseId], references: [id])
  type             MediaType
  filePath         String?
  url              String?
  originalFilename String?
  position         Int
  createdAt        DateTime  @default(now())

  @@unique([exerciseId, position])
}

model TrainingPlan {
  id          String             @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  items       TrainingPlanItem[]
  sessions    TrainingSession[]
}

model TrainingPlanItem {
  id        String                     @id @default(cuid())
  planId    String
  plan      TrainingPlan               @relation(fields: [planId], references: [id])
  position  Int
  exercises TrainingPlanItemExercise[]

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
  slot       Int

  @@unique([itemId, slot])
}

model TrainingSession {
  id             String               @id @default(cuid())
  traineeId      String
  trainee        Trainee              @relation(fields: [traineeId], references: [id])
  planId         String?
  plan           TrainingPlan?        @relation(fields: [planId], references: [id])
  startedAt      DateTime             @default(now())
  finishedAt     DateTime?
  caloriesBurned Int?
  logs           TrainingSessionLog[]
}

model TrainingSessionLog {
  id           String          @id @default(cuid())
  sessionId    String
  session      TrainingSession @relation(fields: [sessionId], references: [id])
  exerciseId   String
  exercise     Exercise        @relation(fields: [exerciseId], references: [id])
  planItemId   String?
  setNumber    Int
  weightKg     Float?
  durationSecs Int?
  repsDone     Int?
  completedAt  DateTime        @default(now())
}
```

- [ ] **Step 2: Write src/lib/db.ts**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Run initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration file created under `prisma/migrations/` and applied to the local dev DB.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/db.ts
git commit -m "feat: add Prisma schema (6 models, 2 enums) and db singleton"
```

---

### Task 4: Docker setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `docker-compose.test.yml`
- Modify: `next.config.ts`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
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

- [ ] **Step 3: Write docker-compose.test.yml**

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: fitfamily_test
      POSTGRES_USER: fitfamily
      POSTGRES_PASSWORD: fitfamily
    ports:
      - "5433:5432"
    networks:
      - test

  app:
    build: .
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://fitfamily:fitfamily@db:5432/fitfamily_test
      MEDIA_PATH: /data/media
      NODE_ENV: test
    volumes:
      - media_test:/data/media
    depends_on:
      - db
    networks:
      - test

volumes:
  media_test:

networks:
  test:
```

- [ ] **Step 4: Add standalone output to next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 5: Run to verify**

```bash
docker compose build
```

Expected: build completes with no errors for all stages.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml docker-compose.test.yml next.config.ts
git commit -m "feat: add multi-stage Dockerfile and Docker Compose setup"
```

---

### Task 5: PWA manifest + next-pwa

**Files:**
- Create: `public/manifest.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Write public/manifest.json**

```json
{
  "name": "FitFamily",
  "short_name": "FitFamily",
  "description": "Family fitness tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#E85D26",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Update next.config.ts with withPWA**

```ts
import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
```

- [ ] **Step 3: Run to verify**

```bash
npm run build
```

Expected: build completes; `public/sw.js` and `public/workbox-*.js` generated.

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json next.config.ts
git commit -m "feat: add PWA manifest and next-pwa service worker"
```

---

### Task 6: next-intl setup

**Files:**
- Create: `src/i18n/request.ts`
- Create: `src/i18n/en.json`
- Modify: `next.config.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write src/i18n/request.ts**

```ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => ({
  locale: 'en',
  messages: (await import('./en.json')).default
}))
```

- [ ] **Step 2: Write src/i18n/en.json**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "loading": "Loading...",
    "error": "Something went wrong",
    "confirm": "Confirm",
    "add": "Add",
    "create": "Create",
    "update": "Update",
    "close": "Close",
    "yes": "Yes",
    "no": "No",
    "optional": "Optional",
    "required": "Required"
  },
  "mode": {
    "trainer": "Trainer Mode",
    "trainee": "Trainee Mode",
    "switchToTrainer": "Switch to Trainer",
    "switchToTrainee": "Switch to Trainee"
  },
  "nav": {
    "exercises": "Exercises",
    "plans": "Training Plans",
    "trainees": "Trainees",
    "progress": "Progress",
    "home": "Home"
  },
  "exercise": {
    "title": "Exercises",
    "createTitle": "New Exercise",
    "editTitle": "Edit Exercise",
    "name": "Exercise Name",
    "namePlaceholder": "e.g. Squat",
    "description": "Description",
    "descriptionPlaceholder": "Optional notes about this exercise",
    "trackingType": "Tracking Type",
    "trackingType_WEIGHT": "Weight",
    "trackingType_TIME": "Time",
    "trackingType_NONE": "None",
    "createButton": "Create Exercise",
    "editButton": "Save Changes",
    "deleteButton": "Delete Exercise",
    "deleteConfirm": "Are you sure you want to delete this exercise?",
    "deleteBlocked": "Cannot delete: this exercise has been used in training sessions.",
    "empty": "No exercises yet. Create your first one.",
    "mediaTitle": "Media",
    "mediaEmpty": "No media added yet.",
    "mediaAdd": "Add Media",
    "mediaDelete": "Remove",
    "mediaLimitReached": "Maximum of 10 media items reached.",
    "mediaType_VIDEO": "Video",
    "mediaType_PHOTO": "Photo",
    "mediaType_PDF": "PDF",
    "mediaType_YOUTUBE": "YouTube",
    "mediaUrlPlaceholder": "https://youtube.com/watch?v=...",
    "mediaFilePlaceholder": "Upload file"
  },
  "plan": {
    "title": "Training Plans",
    "createTitle": "New Plan",
    "editTitle": "Edit Plan",
    "name": "Plan Name",
    "namePlaceholder": "e.g. Full Body Strength",
    "description": "Description",
    "descriptionPlaceholder": "Optional plan notes",
    "createButton": "Create Plan",
    "editButton": "Save Changes",
    "deleteButton": "Delete Plan",
    "deleteConfirm": "Are you sure you want to delete this plan?",
    "empty": "No plans yet. Create your first one.",
    "itemsTitle": "Exercises",
    "addItem": "Add Exercise",
    "addBiseries": "Add Biseries",
    "itemSingle": "Single",
    "itemBiseries": "Biseries",
    "sets": "Sets",
    "reps": "Reps",
    "slot1": "Exercise A",
    "slot2": "Exercise B",
    "biseriesMissingSlot1": "Biseries requires a slot 1 exercise."
  },
  "trainee": {
    "title": "Trainees",
    "createTitle": "New Trainee",
    "editTitle": "Edit Trainee",
    "name": "Name",
    "namePlaceholder": "e.g. Alex",
    "createButton": "Add Trainee",
    "editButton": "Save",
    "deleteButton": "Delete Trainee",
    "deleteConfirm": "Are you sure you want to delete this trainee?",
    "deleteBlocked": "Cannot delete: this trainee has training sessions on record.",
    "empty": "No trainees yet. Add the first one.",
    "pickTitle": "Who's training today?",
    "pickEmpty": "No trainees found. Ask the trainer to add you."
  },
  "session": {
    "startPlan": "Start Training",
    "startSingle": "Single Exercise",
    "pickPlan": "Choose a Plan",
    "pickExercise": "Choose an Exercise",
    "currentSet": "Set {current} of {total}",
    "weightLabel": "Weight (kg)",
    "weightPlaceholder": "0.0",
    "repsLabel": "Reps",
    "repsPlaceholder": "0",
    "markDone": "Mark Done",
    "nextExercise": "Next Exercise",
    "finishTitle": "Session Complete!",
    "finishSummary": "Great work! Here's what you did:",
    "caloriesLabel": "Calories Burned (optional)",
    "caloriesPlaceholder": "From Apple Watch",
    "saveSession": "Save Session",
    "lastSession": "Last time: {weight}kg × {reps}",
    "noHistory": "No previous data",
    "setsTarget": "Target: {sets} sets × {reps} reps",
    "totalSets": "Total sets: {count}",
    "duration": "Duration: {minutes} min"
  },
  "media": {
    "playVideo": "Play video",
    "viewPhoto": "View photo",
    "downloadPdf": "Download PDF",
    "watchYoutube": "Watch on YouTube",
    "dragToReorder": "Drag to reorder"
  },
  "progress": {
    "title": "Progress",
    "selectTrainee": "Select a trainee",
    "weightChart": "Weight Progression",
    "frequencyChart": "Training Frequency",
    "caloriesChart": "Calories per Session",
    "noData": "No training data yet for this trainee."
  },
  "errors": {
    "notFound": "Not found.",
    "serverError": "Server error. Please try again.",
    "validationError": "Invalid input. Please check your entries.",
    "deleteBlocked": "This item cannot be deleted because it is referenced by existing data.",
    "mediaLimit": "Maximum media limit (10) reached for this exercise."
  }
}
```

- [ ] **Step 3: Update next.config.ts with next-intl plugin**

```ts
import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default withNextIntl(
  withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  })(nextConfig)
)
```

- [ ] **Step 4: Update src/app/layout.tsx with NextIntlClientProvider**

```tsx
import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'FitFamily',
  description: 'Family fitness tracking',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Run to verify**

```bash
npm run build
```

Expected: build completes with no errors; next-intl plugin applied.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/request.ts src/i18n/en.json next.config.ts src/app/layout.tsx
git commit -m "feat: add next-intl with full en.json translation keys"
```

---

### Task 7: ModeContext + logger + errors + constants

**Files:**
- Create: `src/lib/context/ModeContext.tsx`
- Create: `src/lib/logger.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/domain/constants.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write src/lib/context/ModeContext.tsx**

```tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Mode = 'trainer' | 'trainee'

interface ModeContextValue {
  mode: Mode
  setMode: (mode: Mode) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('trainee')

  useEffect(() => {
    const stored = localStorage.getItem('fitfamily-mode') as Mode | null
    if (stored === 'trainer' || stored === 'trainee') setModeState(stored)
  }, [])

  const setMode = (m: Mode) => {
    localStorage.setItem('fitfamily-mode', m)
    setModeState(m)
  }

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
```

- [ ] **Step 2: Write src/lib/logger.ts**

```ts
import pino from 'pino'
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
```

- [ ] **Step 3: Write src/lib/errors.ts**

```ts
export class NotFoundError extends Error {
  constructor(readonly entityId: string) {
    super(`Entity ${entityId} not found`)
    this.name = 'NotFoundError'
  }
}

export class DeleteBlockedError extends Error {
  constructor(readonly entityId: string, readonly reason: string) {
    super(`Cannot delete ${entityId}: ${reason}`)
    this.name = 'DeleteBlockedError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class MediaLimitError extends Error {
  constructor(readonly exerciseId: string) {
    super(`Exercise ${exerciseId} already has maximum media items`)
    this.name = 'MediaLimitError'
  }
}
```

- [ ] **Step 4: Write src/lib/domain/constants.ts**

```ts
export const MAX_EXERCISE_MEDIA = 10
```

- [ ] **Step 5: Add ModeProvider to src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ModeProvider } from '@/lib/context/ModeContext'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'FitFamily',
  description: 'Family fitness tracking',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ModeProvider>
            {children}
          </ModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Run to verify**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/context/ModeContext.tsx src/lib/logger.ts src/lib/errors.ts src/lib/domain/constants.ts src/app/layout.tsx
git commit -m "feat: add ModeContext, pino logger, typed errors, and domain constants"
```

---

## Phase 2 — Domain Layer (Tasks 8–10)

### Task 8: Domain types, interfaces, and Zod schemas

**Files:**
- Create: `src/lib/domain/exercise.ts`
- Create: `src/lib/domain/plan.ts`
- Create: `src/lib/domain/trainee.ts`
- Create: `src/lib/domain/session.ts`

- [ ] **Step 1: Write src/lib/domain/exercise.ts**

```ts
import { z } from 'zod'
import type { Exercise as PrismaExercise, ExerciseMedia, TrackingType, MediaType } from '@prisma/client'

export type { TrackingType, MediaType }

export type Exercise = PrismaExercise & { media?: ExerciseMedia[] }

export const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trackingType: z.enum(['WEIGHT', 'TIME', 'NONE']).default('WEIGHT'),
})
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>

export const UpdateExerciseSchema = CreateExerciseSchema.partial()
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseSchema>

export interface IExerciseRepository {
  findAll(): Promise<Exercise[]>
  findById(id: string): Promise<Exercise | null>
  findWithMedia(id: string): Promise<Exercise | null>
  create(data: CreateExerciseInput): Promise<Exercise>
  update(id: string, data: UpdateExerciseInput): Promise<Exercise>
  delete(id: string): Promise<void>
  hasSessionLogs(id: string): Promise<boolean>
}

export const CreateMediaSchema = z.object({
  type: z.enum(['VIDEO', 'PHOTO', 'PDF', 'YOUTUBE']),
  url: z.string().url().optional(),
  originalFilename: z.string().optional(),
})
export type CreateMediaInput = z.infer<typeof CreateMediaSchema> & {
  exerciseId: string
  filePath?: string
  position: number
}

export interface IExerciseMediaRepository {
  create(data: CreateMediaInput): Promise<ExerciseMedia>
  delete(id: string): Promise<void>
  countByExercise(exerciseId: string): Promise<number>
  reorder(exerciseId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findByExercise(exerciseId: string): Promise<ExerciseMedia[]>
}
```

- [ ] **Step 2: Write src/lib/domain/plan.ts**

```ts
import { z } from 'zod'
import type {
  TrainingPlan as PrismaTrainingPlan,
  TrainingPlanItem as PrismaTrainingPlanItem,
  TrainingPlanItemExercise,
} from '@prisma/client'

export type TrainingPlanItemExercise = TrainingPlanItemExercise

export type TrainingPlanItem = PrismaTrainingPlanItem & {
  exercises?: TrainingPlanItemExercise[]
}

export type TrainingPlan = PrismaTrainingPlan & {
  items?: TrainingPlanItem[]
}

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>

export const UpdatePlanSchema = CreatePlanSchema.partial()
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>

export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      sets: z.number().int().positive(),
      reps: z.number().int().positive(),
      slot: z.number().int().min(1).max(2),
    })
  ).min(1).max(2),
})
export type AddPlanItemInput = z.infer<typeof AddPlanItemSchema>

export const ReorderItemsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().positive(),
    })
  ),
})
export type ReorderItemsInput = z.infer<typeof ReorderItemsSchema>

export interface ITrainingPlanRepository {
  findAll(): Promise<TrainingPlan[]>
  findById(id: string): Promise<TrainingPlan | null>
  findWithItems(id: string): Promise<TrainingPlan | null>
  create(data: CreatePlanInput): Promise<TrainingPlan>
  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan>
  delete(id: string): Promise<void>
  addItem(planId: string, data: AddPlanItemInput): Promise<TrainingPlanItem>
  removeItem(itemId: string): Promise<void>
  reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findItemSlot(itemId: string, slot: number): Promise<TrainingPlanItemExercise | null>
}
```

- [ ] **Step 3: Write src/lib/domain/trainee.ts**

```ts
import { z } from 'zod'
import type { Trainee as PrismaTrainee } from '@prisma/client'

export type Trainee = PrismaTrainee

export const CreateTraineeSchema = z.object({
  name: z.string().min(1).max(100),
})
export type CreateTraineeInput = z.infer<typeof CreateTraineeSchema>

export const UpdateTraineeSchema = CreateTraineeSchema.partial()
export type UpdateTraineeInput = z.infer<typeof UpdateTraineeSchema>

export interface ITraineeRepository {
  findAll(): Promise<Trainee[]>
  findById(id: string): Promise<Trainee | null>
  create(data: CreateTraineeInput): Promise<Trainee>
  update(id: string, data: UpdateTraineeInput): Promise<Trainee>
  delete(id: string): Promise<void>
  hasSessions(id: string): Promise<boolean>
}
```

- [ ] **Step 4: Write src/lib/domain/session.ts**

```ts
import { z } from 'zod'
import type {
  TrainingSession as PrismaTrainingSession,
  TrainingSessionLog as PrismaTrainingSessionLog,
} from '@prisma/client'

export type TrainingSession = PrismaTrainingSession & {
  logs?: TrainingSessionLog[]
}

export type TrainingSessionLog = PrismaTrainingSessionLog

export const StartSessionSchema = z.object({
  traineeId: z.string().min(1),
  planId: z.string().min(1).optional(),
})
export type StartSessionInput = z.infer<typeof StartSessionSchema>

export const LogSetSchema = z.object({
  exerciseId: z.string().min(1),
  planItemId: z.string().min(1).optional(),
  setNumber: z.number().int().positive(),
  weightKg: z.number().positive().optional(),
  durationSecs: z.number().int().positive().optional(),
  repsDone: z.number().int().positive().optional(),
})
export type LogSetInput = z.infer<typeof LogSetSchema>

export const FinishSessionSchema = z.object({
  caloriesBurned: z.number().int().positive().optional(),
})
export type FinishSessionInput = z.infer<typeof FinishSessionSchema>

export interface ISessionRepository {
  create(data: StartSessionInput): Promise<TrainingSession>
  findById(id: string): Promise<TrainingSession | null>
  findWithLogs(id: string): Promise<TrainingSession | null>
  finish(id: string, data: FinishSessionInput): Promise<TrainingSession>
}

export interface ISessionLogRepository {
  create(sessionId: string, data: LogSetInput): Promise<TrainingSessionLog>
  findBySession(sessionId: string): Promise<TrainingSessionLog[]>
  findLastForExercise(traineeId: string, exerciseId: string): Promise<TrainingSessionLog | null>
}
```

- [ ] **Step 5: Run to verify**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/
git commit -m "feat: add domain types, repository interfaces, and Zod schemas"
```

---

### Task 9: Jest + testcontainers config

**Files:**
- Create: `jest.config.ts`
- Create: `tests/integration/helpers/db.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Write jest.config.ts**

```ts
import type { Config } from 'jest'

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'node',
      testTimeout: 60000,
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
}

export default config
```

- [ ] **Step 2: Write tests/integration/helpers/db.ts**

```ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

export interface TestDb {
  prisma: PrismaClient
  container: StartedPostgreSqlContainer
}

export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start()
  const url = container.getConnectionUri()
  process.env.DATABASE_URL = url
  execSync(`DATABASE_URL="${url}" npx prisma migrate deploy`, { stdio: 'inherit' })
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  return { prisma, container }
}

export async function teardownTestDb({ prisma, container }: TestDb) {
  await prisma.$disconnect()
  await container.stop()
}
```

- [ ] **Step 3: Write playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
})
```

- [ ] **Step 4: Run to verify**

```bash
npm run test:unit -- --passWithNoTests
```

Expected: test run completes with 0 tests (no tests written yet), exit code 0.

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts playwright.config.ts tests/integration/helpers/db.ts
git commit -m "feat: add Jest multi-project config and testcontainers helper"
```

---

### Task 10: Zod schema unit tests

**Files:**
- Create: `tests/unit/domain/exercise.test.ts`
- Create: `tests/unit/domain/plan.test.ts`
- Create: `tests/unit/domain/trainee.test.ts`
- Create: `tests/unit/domain/session.test.ts`

- [ ] **Step 1: Write tests/unit/domain/exercise.test.ts**

```ts
import { CreateExerciseSchema, UpdateExerciseSchema, CreateMediaSchema } from '@/lib/domain/exercise'

describe('CreateExerciseSchema', () => {
  it('accepts valid input', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'Squat', trackingType: 'WEIGHT' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreateExerciseSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('defaults trackingType to WEIGHT', () => {
    const result = CreateExerciseSchema.parse({ name: 'Push-up' })
    expect(result.trackingType).toBe('WEIGHT')
  })

  it('rejects invalid trackingType', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'X', trackingType: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts TIME trackingType', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'Plank', trackingType: 'TIME' })
    expect(result.success).toBe(true)
  })

  it('rejects name longer than 100 chars', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects description longer than 500 chars', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'Squat', description: 'x'.repeat(501) })
    expect(result.success).toBe(false)
  })
})

describe('UpdateExerciseSchema', () => {
  it('accepts partial input', () => {
    const result = UpdateExerciseSchema.safeParse({ description: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdateExerciseSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid trackingType in partial update', () => {
    const result = UpdateExerciseSchema.safeParse({ trackingType: 'BAD' })
    expect(result.success).toBe(false)
  })
})

describe('CreateMediaSchema', () => {
  it('accepts YOUTUBE type with url', () => {
    const result = CreateMediaSchema.safeParse({ type: 'YOUTUBE', url: 'https://youtube.com/watch?v=abc' })
    expect(result.success).toBe(true)
  })

  it('accepts VIDEO type without url', () => {
    const result = CreateMediaSchema.safeParse({ type: 'VIDEO' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid media type', () => {
    const result = CreateMediaSchema.safeParse({ type: 'GIF' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid url format', () => {
    const result = CreateMediaSchema.safeParse({ type: 'YOUTUBE', url: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Write tests/unit/domain/plan.test.ts**

```ts
import { CreatePlanSchema, UpdatePlanSchema, AddPlanItemSchema } from '@/lib/domain/plan'

describe('CreatePlanSchema', () => {
  it('accepts valid input', () => {
    const result = CreatePlanSchema.safeParse({ name: 'Full Body' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreatePlanSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts name with optional description', () => {
    const result = CreatePlanSchema.safeParse({ name: 'Push Day', description: 'Upper body focus' })
    expect(result.success).toBe(true)
  })

  it('rejects name longer than 100 chars', () => {
    const result = CreatePlanSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('UpdatePlanSchema', () => {
  it('accepts partial input', () => {
    const result = UpdatePlanSchema.safeParse({ description: 'Updated description' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdatePlanSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('AddPlanItemSchema', () => {
  it('accepts single exercise item', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, slot: 1 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts biseries item with two exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 2,
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: 10, slot: 1 },
        { exerciseId: 'ex2', sets: 3, reps: 10, slot: 2 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty exercises array', () => {
    const result = AddPlanItemSchema.safeParse({ position: 1, exercises: [] })
    expect(result.success).toBe(false)
  })

  it('rejects slot value above 2', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, slot: 3 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative position', () => {
    const result = AddPlanItemSchema.safeParse({
      position: -1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, slot: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero sets', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 0, reps: 10, slot: 1 }],
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 3: Write tests/unit/domain/trainee.test.ts**

```ts
import { CreateTraineeSchema, UpdateTraineeSchema } from '@/lib/domain/trainee'

describe('CreateTraineeSchema', () => {
  it('accepts valid name', () => {
    const result = CreateTraineeSchema.safeParse({ name: 'Alex' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreateTraineeSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = CreateTraineeSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects missing name field', () => {
    const result = CreateTraineeSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('UpdateTraineeSchema', () => {
  it('accepts partial input', () => {
    const result = UpdateTraineeSchema.safeParse({ name: 'Alex Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdateTraineeSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects empty string name in update', () => {
    const result = UpdateTraineeSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 4: Write tests/unit/domain/session.test.ts**

```ts
import { StartSessionSchema, LogSetSchema, FinishSessionSchema } from '@/lib/domain/session'

describe('StartSessionSchema', () => {
  it('accepts traineeId with planId', () => {
    const result = StartSessionSchema.safeParse({ traineeId: 'tr1', planId: 'pl1' })
    expect(result.success).toBe(true)
  })

  it('accepts traineeId without planId (single exercise session)', () => {
    const result = StartSessionSchema.safeParse({ traineeId: 'tr1' })
    expect(result.success).toBe(true)
  })

  it('rejects empty traineeId', () => {
    const result = StartSessionSchema.safeParse({ traineeId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing traineeId', () => {
    const result = StartSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('LogSetSchema', () => {
  it('accepts full set log with weight and reps', () => {
    const result = LogSetSchema.safeParse({
      exerciseId: 'ex1',
      setNumber: 1,
      weightKg: 80.5,
      repsDone: 10,
    })
    expect(result.success).toBe(true)
  })

  it('accepts set log without weight (NONE tracking type)', () => {
    const result = LogSetSchema.safeParse({ exerciseId: 'ex1', setNumber: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects zero setNumber', () => {
    const result = LogSetSchema.safeParse({ exerciseId: 'ex1', setNumber: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative weightKg', () => {
    const result = LogSetSchema.safeParse({ exerciseId: 'ex1', setNumber: 1, weightKg: -5 })
    expect(result.success).toBe(false)
  })

  it('rejects missing exerciseId', () => {
    const result = LogSetSchema.safeParse({ setNumber: 1 })
    expect(result.success).toBe(false)
  })
})

describe('FinishSessionSchema', () => {
  it('accepts optional caloriesBurned', () => {
    const result = FinishSessionSchema.safeParse({ caloriesBurned: 350 })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (no calories)', () => {
    const result = FinishSessionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects negative calories', () => {
    const result = FinishSessionSchema.safeParse({ caloriesBurned: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer calories', () => {
    const result = FinishSessionSchema.safeParse({ caloriesBurned: 350.5 })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 5: Run to verify**

```bash
npm run test:unit -- --testPathPattern=domain
```

Expected: all schema tests pass (28+ tests, 0 failures).

- [ ] **Step 6: Commit**

```bash
git add tests/unit/domain/
git commit -m "test: add Zod schema unit tests for all domain modules"
```
## Phase 3: Repositories (Tasks 11–16)

Each task follows the same TDD rhythm: write the failing integration test, implement the repository to make it pass, run the test suite, commit.

All integration tests share the testcontainers helper from Task 9. Import pattern is consistent across every suite:

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
```

The `TestDb` object carries a `prisma: PrismaClient` property. Every suite runs `beforeAll` with a 60-second timeout to allow container startup, tears down in `afterAll`, and wipes relevant tables in `afterEach` so tests are fully isolated.

---

### Task 11: ExerciseRepository

**Test file:** `tests/integration/repositories/ExerciseRepository.test.ts`

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { PrismaClient } from '@prisma/client'
import { ExerciseRepository } from '@/lib/repositories/ExerciseRepository'

let db: TestDb
let repo: ExerciseRepository

beforeAll(async () => {
  db = await setupTestDb()
  repo = new ExerciseRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

afterEach(async () => { await db.prisma.exercise.deleteMany() })

describe('ExerciseRepository', () => {
  it('creates an exercise', async () => {
    const ex = await repo.create({ name: 'Squat', trackingType: 'WEIGHT' })
    expect(ex.id).toBeDefined()
    expect(ex.name).toBe('Squat')
  })

  it('findAll returns all exercises', async () => {
    await repo.create({ name: 'A', trackingType: 'WEIGHT' })
    await repo.create({ name: 'B', trackingType: 'NONE' })
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('nonexistent')
    expect(result).toBeNull()
  })

  it('update modifies fields', async () => {
    const ex = await repo.create({ name: 'Old', trackingType: 'WEIGHT' })
    const updated = await repo.update(ex.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('delete removes exercise', async () => {
    const ex = await repo.create({ name: 'ToDelete', trackingType: 'WEIGHT' })
    await repo.delete(ex.id)
    const found = await repo.findById(ex.id)
    expect(found).toBeNull()
  })

  it('hasSessionLogs returns false when no logs', async () => {
    const ex = await repo.create({ name: 'Clean', trackingType: 'WEIGHT' })
    const has = await repo.hasSessionLogs(ex.id)
    expect(has).toBe(false)
  })

  it('findWithMedia returns exercise with ordered media', async () => {
    const ex = await repo.create({ name: 'WithMedia', trackingType: 'WEIGHT' })
    await db.prisma.exerciseMedia.createMany({
      data: [
        { exerciseId: ex.id, type: 'PHOTO', position: 2, filePath: '/p2' },
        { exerciseId: ex.id, type: 'PHOTO', position: 1, filePath: '/p1' },
      ],
    })
    const result = await repo.findWithMedia(ex.id)
    expect(result?.media).toHaveLength(2)
    expect(result?.media[0].position).toBe(1)
  })
})
```

**Implementation:** `src/lib/repositories/ExerciseRepository.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import type { CreateExerciseInput, UpdateExerciseInput, Exercise } from '@/lib/domain/exercise'

export class ExerciseRepository implements IExerciseRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(): Promise<Exercise[]> {
    return this.prisma.exercise.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({ where: { id } })
  }

  findWithMedia(id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({
      where: { id },
      include: { media: { orderBy: { position: 'asc' } } },
    })
  }

  create(data: CreateExerciseInput): Promise<Exercise> {
    return this.prisma.exercise.create({ data })
  }

  update(id: string, data: UpdateExerciseInput): Promise<Exercise> {
    return this.prisma.exercise.update({ where: { id }, data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.exercise.delete({ where: { id } }).then(() => undefined)
  }

  async hasSessionLogs(id: string): Promise<boolean> {
    const count = await this.prisma.trainingSessionLog.count({ where: { exerciseId: id } })
    return count > 0
  }
}
```

Run: `npm run test:integration -- --testPathPattern=ExerciseRepository`

Commit: `feat: add ExerciseRepository with integration tests`

---

### Task 12: ExerciseMediaRepository

**Test file:** `tests/integration/repositories/ExerciseMediaRepository.test.ts`

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { ExerciseMediaRepository } from '@/lib/repositories/ExerciseMediaRepository'

let db: TestDb
let repo: ExerciseMediaRepository
let exerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new ExerciseMediaRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const ex = await db.prisma.exercise.create({
    data: { name: 'TestEx', trackingType: 'WEIGHT' },
  })
  exerciseId = ex.id
})

afterEach(async () => {
  await db.prisma.exerciseMedia.deleteMany()
  await db.prisma.exercise.deleteMany()
})

describe('ExerciseMediaRepository', () => {
  it('creates media for an exercise', async () => {
    const media = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/img.jpg', position: 1 })
    expect(media.id).toBeDefined()
    expect(media.exerciseId).toBe(exerciseId)
  })

  it('countByExercise returns correct count', async () => {
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/a', position: 1 })
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/b', position: 2 })
    const count = await repo.countByExercise(exerciseId)
    expect(count).toBe(2)
  })

  it('countByExercise returns 0 when no media', async () => {
    const count = await repo.countByExercise(exerciseId)
    expect(count).toBe(0)
  })

  it('findByExercise returns media ordered by position', async () => {
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/b', position: 2 })
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/a', position: 1 })
    const items = await repo.findByExercise(exerciseId)
    expect(items[0].position).toBe(1)
    expect(items[1].position).toBe(2)
  })

  it('delete removes media', async () => {
    const media = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/img', position: 1 })
    await repo.delete(media.id)
    const remaining = await repo.findByExercise(exerciseId)
    expect(remaining).toHaveLength(0)
  })

  it('reorder swaps positions correctly', async () => {
    const m1 = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/a', position: 1 })
    const m2 = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/b', position: 2 })
    await repo.reorder(exerciseId, [
      { id: m1.id, position: 2 },
      { id: m2.id, position: 1 },
    ])
    const items = await repo.findByExercise(exerciseId)
    expect(items[0].id).toBe(m2.id)
    expect(items[1].id).toBe(m1.id)
  })
})
```

**Implementation:** `src/lib/repositories/ExerciseMediaRepository.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { IExerciseMediaRepository } from '@/lib/domain/exercise'
import type { CreateMediaInput } from '@/lib/domain/exercise'
import type { ExerciseMedia } from '@prisma/client'

export class ExerciseMediaRepository implements IExerciseMediaRepository {
  constructor(private prisma: PrismaClient) {}

  create(data: CreateMediaInput): Promise<ExerciseMedia> {
    return this.prisma.exerciseMedia.create({ data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.exerciseMedia.delete({ where: { id } }).then(() => undefined)
  }

  async countByExercise(exerciseId: string): Promise<number> {
    return this.prisma.exerciseMedia.count({ where: { exerciseId } })
  }

  findByExercise(exerciseId: string): Promise<ExerciseMedia[]> {
    return this.prisma.exerciseMedia.findMany({
      where: { exerciseId },
      orderBy: { position: 'asc' },
    })
  }

  async reorder(exerciseId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    await this.prisma.$transaction(
      positions.map(({ id, position }) =>
        this.prisma.exerciseMedia.update({ where: { id }, data: { position } })
      )
    )
  }
}
```

Run: `npm run test:integration -- --testPathPattern=ExerciseMediaRepository`

Commit: `feat: add ExerciseMediaRepository with integration tests`

---

### Task 13: TrainingPlanRepository

**Test file:** `tests/integration/repositories/TrainingPlanRepository.test.ts`

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { TrainingPlanRepository } from '@/lib/repositories/TrainingPlanRepository'

let db: TestDb
let repo: TrainingPlanRepository
let exerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new TrainingPlanRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const ex = await db.prisma.exercise.create({ data: { name: 'Squat', trackingType: 'WEIGHT' } })
  exerciseId = ex.id
})

afterEach(async () => {
  await db.prisma.trainingPlanItemExercise.deleteMany()
  await db.prisma.trainingPlanItem.deleteMany()
  await db.prisma.trainingPlan.deleteMany()
  await db.prisma.exercise.deleteMany()
})

describe('TrainingPlanRepository', () => {
  it('creates a plan', async () => {
    const plan = await repo.create({ name: 'Plan A' })
    expect(plan.id).toBeDefined()
    expect(plan.name).toBe('Plan A')
  })

  it('findAll returns all plans', async () => {
    await repo.create({ name: 'P1' })
    await repo.create({ name: 'P2' })
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('nope')
    expect(result).toBeNull()
  })

  it('update modifies plan name', async () => {
    const plan = await repo.create({ name: 'Old' })
    const updated = await repo.update(plan.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('delete removes plan', async () => {
    const plan = await repo.create({ name: 'Gone' })
    await repo.delete(plan.id)
    expect(await repo.findById(plan.id)).toBeNull()
  })

  it('addItem creates item with single exercise', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items).toHaveLength(1)
    expect(full?.items[0].exercises).toHaveLength(1)
    expect(full?.items[0].exercises[0].slot).toBe(1)
  })

  it('addItem creates biseries item with two exercises', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Lunge', trackingType: 'WEIGHT' } })
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [
      { exerciseId, sets: 3, reps: 10, slot: 1 },
      { exerciseId: ex2.id, sets: 3, reps: 12, slot: 2 },
    ])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items[0].exercises).toHaveLength(2)
  })

  it('findWithItems returns nested structure ordered by position', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 2, [{ exerciseId, sets: 2, reps: 8, slot: 1 }])
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items[0].position).toBe(1)
    expect(full?.items[1].position).toBe(2)
  })

  it('removeItem deletes item and its exercises', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items[0].id
    await repo.removeItem(itemId)
    const updated = await repo.findWithItems(plan.id)
    expect(updated?.items).toHaveLength(0)
  })

  it('reorderItems updates positions', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 2, reps: 5, slot: 1 }])
    await repo.addItem(plan.id, 2, [{ exerciseId, sets: 2, reps: 5, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const [item1, item2] = full!.items
    await repo.reorderItems(plan.id, [
      { id: item1.id, position: 2 },
      { id: item2.id, position: 1 },
    ])
    const reordered = await repo.findWithItems(plan.id)
    expect(reordered!.items[0].id).toBe(item2.id)
  })

  it('findItemSlot returns exercise for matching slot', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items[0].id
    const result = await repo.findItemSlot(itemId, 1)
    expect(result).not.toBeNull()
    expect(result?.slot).toBe(1)
  })

  it('findItemSlot returns null for missing slot', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items[0].id
    const result = await repo.findItemSlot(itemId, 2)
    expect(result).toBeNull()
  })
})
```

**Implementation:** `src/lib/repositories/TrainingPlanRepository.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { ITrainingPlanRepository } from '@/lib/domain/plan'
import type { CreatePlanInput, UpdatePlanInput, TrainingPlan, TrainingPlanWithItems } from '@/lib/domain/plan'
import type { TrainingPlanItemExercise } from '@prisma/client'

export class TrainingPlanRepository implements ITrainingPlanRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(): Promise<TrainingPlan[]> {
    return this.prisma.trainingPlan.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<TrainingPlan | null> {
    return this.prisma.trainingPlan.findUnique({ where: { id } })
  }

  findWithItems(id: string): Promise<TrainingPlanWithItems | null> {
    return this.prisma.trainingPlan.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            exercises: {
              orderBy: { slot: 'asc' },
              include: { exercise: true },
            },
          },
        },
      },
    })
  }

  create(data: CreatePlanInput): Promise<TrainingPlan> {
    return this.prisma.trainingPlan.create({ data })
  }

  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan> {
    return this.prisma.trainingPlan.update({ where: { id }, data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.trainingPlan.delete({ where: { id } }).then(() => undefined)
  }

  async addItem(
    planId: string,
    position: number,
    exercises: Array<{ exerciseId: string; sets: number; reps: number; slot: number }>,
  ): Promise<void> {
    await this.prisma.trainingPlanItem.create({
      data: {
        planId,
        position,
        exercises: {
          create: exercises,
        },
      },
    })
  }

  async removeItem(itemId: string): Promise<void> {
    await this.prisma.trainingPlanItemExercise.deleteMany({ where: { itemId } })
    await this.prisma.trainingPlanItem.delete({ where: { id: itemId } })
  }

  async reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    await this.prisma.$transaction(
      positions.map(({ id, position }) =>
        this.prisma.trainingPlanItem.update({ where: { id }, data: { position } })
      )
    )
  }

  findItemSlot(itemId: string, slot: number): Promise<TrainingPlanItemExercise | null> {
    return this.prisma.trainingPlanItemExercise.findUnique({
      where: { itemId_slot: { itemId, slot } },
    })
  }
}
```

Run: `npm run test:integration -- --testPathPattern=TrainingPlanRepository`

Commit: `feat: add TrainingPlanRepository with integration tests`

---

### Task 14: TraineeRepository

**Test file:** `tests/integration/repositories/TraineeRepository.test.ts`

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { TraineeRepository } from '@/lib/repositories/TraineeRepository'

let db: TestDb
let repo: TraineeRepository

beforeAll(async () => {
  db = await setupTestDb()
  repo = new TraineeRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

afterEach(async () => {
  await db.prisma.trainingSession.deleteMany()
  await db.prisma.trainee.deleteMany()
})

describe('TraineeRepository', () => {
  it('creates a trainee', async () => {
    const t = await repo.create({ name: 'Alice' })
    expect(t.id).toBeDefined()
    expect(t.name).toBe('Alice')
  })

  it('findAll returns all trainees', async () => {
    await repo.create({ name: 'Alice' })
    await repo.create({ name: 'Bob' })
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('findById returns null for unknown id', async () => {
    expect(await repo.findById('nope')).toBeNull()
  })

  it('update modifies name', async () => {
    const t = await repo.create({ name: 'Old' })
    const updated = await repo.update(t.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('delete removes trainee', async () => {
    const t = await repo.create({ name: 'Gone' })
    await repo.delete(t.id)
    expect(await repo.findById(t.id)).toBeNull()
  })

  it('hasSessions returns false when no sessions exist', async () => {
    const t = await repo.create({ name: 'Fresh' })
    expect(await repo.hasSessions(t.id)).toBe(false)
  })

  it('hasSessions returns true when sessions exist', async () => {
    const t = await repo.create({ name: 'Active' })
    await db.prisma.trainingSession.create({ data: { traineeId: t.id } })
    expect(await repo.hasSessions(t.id)).toBe(true)
  })
})
```

**Implementation:** `src/lib/repositories/TraineeRepository.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { ITraineeRepository } from '@/lib/domain/trainee'
import type { CreateTraineeInput, UpdateTraineeInput, Trainee } from '@/lib/domain/trainee'

export class TraineeRepository implements ITraineeRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(): Promise<Trainee[]> {
    return this.prisma.trainee.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<Trainee | null> {
    return this.prisma.trainee.findUnique({ where: { id } })
  }

  create(data: CreateTraineeInput): Promise<Trainee> {
    return this.prisma.trainee.create({ data })
  }

  update(id: string, data: UpdateTraineeInput): Promise<Trainee> {
    return this.prisma.trainee.update({ where: { id }, data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.trainee.delete({ where: { id } }).then(() => undefined)
  }

  async hasSessions(id: string): Promise<boolean> {
    const count = await this.prisma.trainingSession.count({ where: { traineeId: id } })
    return count > 0
  }
}
```

Run: `npm run test:integration -- --testPathPattern=TraineeRepository`

Commit: `feat: add TraineeRepository with integration tests`

---

### Task 15: SessionRepository

**Test file:** `tests/integration/repositories/SessionRepository.test.ts`

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { SessionRepository } from '@/lib/repositories/SessionRepository'

let db: TestDb
let repo: SessionRepository
let traineeId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new SessionRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const t = await db.prisma.trainee.create({ data: { name: 'Tester' } })
  traineeId = t.id
})

afterEach(async () => {
  await db.prisma.trainingSession.deleteMany()
  await db.prisma.trainee.deleteMany()
})

describe('SessionRepository', () => {
  it('creates a session for a trainee', async () => {
    const session = await repo.create({ traineeId })
    expect(session.id).toBeDefined()
    expect(session.traineeId).toBe(traineeId)
    expect(session.finishedAt).toBeNull()
  })

  it('creates a session with a planId', async () => {
    const plan = await db.prisma.trainingPlan.create({ data: { name: 'Plan' } })
    const session = await repo.create({ traineeId, planId: plan.id })
    expect(session.planId).toBe(plan.id)
  })

  it('finish updates finishedAt and caloriesBurned', async () => {
    const session = await repo.create({ traineeId })
    const finishedAt = new Date()
    const finished = await repo.finish(session.id, { finishedAt, caloriesBurned: 350 })
    expect(finished.finishedAt).toEqual(finishedAt)
    expect(finished.caloriesBurned).toBe(350)
  })

  it('findByTrainee returns only sessions for the specified trainee', async () => {
    const other = await db.prisma.trainee.create({ data: { name: 'Other' } })
    await repo.create({ traineeId })
    await repo.create({ traineeId })
    await repo.create({ traineeId: other.id })
    const sessions = await repo.findByTrainee(traineeId)
    expect(sessions).toHaveLength(2)
    sessions.forEach(s => expect(s.traineeId).toBe(traineeId))
  })

  it('findById returns null for unknown id', async () => {
    expect(await repo.findById('nope')).toBeNull()
  })

  it('findById returns the session', async () => {
    const session = await repo.create({ traineeId })
    const found = await repo.findById(session.id)
    expect(found?.id).toBe(session.id)
  })
})
```

**Implementation:** `src/lib/repositories/SessionRepository.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { ISessionRepository } from '@/lib/domain/session'
import type { TrainingSession } from '@prisma/client'

export class SessionRepository implements ISessionRepository {
  constructor(private prisma: PrismaClient) {}

  create(data: { traineeId: string; planId?: string }): Promise<TrainingSession> {
    return this.prisma.trainingSession.create({ data })
  }

  finish(
    id: string,
    data: { finishedAt: Date; caloriesBurned?: number },
  ): Promise<TrainingSession> {
    return this.prisma.trainingSession.update({ where: { id }, data })
  }

  findByTrainee(traineeId: string): Promise<TrainingSession[]> {
    return this.prisma.trainingSession.findMany({
      where: { traineeId },
      orderBy: { startedAt: 'desc' },
    })
  }

  findById(id: string): Promise<TrainingSession | null> {
    return this.prisma.trainingSession.findUnique({ where: { id } })
  }
}
```

Run: `npm run test:integration -- --testPathPattern=SessionRepository`

Commit: `feat: add SessionRepository with integration tests`

---

### Task 16: SessionLogRepository

**Test file:** `tests/integration/repositories/SessionLogRepository.test.ts`

```ts
import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { SessionLogRepository } from '@/lib/repositories/SessionLogRepository'

let db: TestDb
let repo: SessionLogRepository
let sessionId: string
let exerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new SessionLogRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const trainee = await db.prisma.trainee.create({ data: { name: 'T' } })
  const session = await db.prisma.trainingSession.create({ data: { traineeId: trainee.id } })
  const exercise = await db.prisma.exercise.create({ data: { name: 'Bench', trackingType: 'WEIGHT' } })
  sessionId = session.id
  exerciseId = exercise.id
})

afterEach(async () => {
  await db.prisma.trainingSessionLog.deleteMany()
  await db.prisma.trainingSession.deleteMany()
  await db.prisma.exercise.deleteMany()
  await db.prisma.trainee.deleteMany()
})

describe('SessionLogRepository', () => {
  it('creates a log entry', async () => {
    const log = await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    expect(log.id).toBeDefined()
    expect(log.sessionId).toBe(sessionId)
    expect(log.exerciseId).toBe(exerciseId)
  })

  it('logs multiple sets for the same exercise', async () => {
    await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    await repo.create({ sessionId, exerciseId, setNumber: 2, weightKg: 82.5, repsDone: 8 })
    const logs = await repo.findBySession(sessionId)
    expect(logs).toHaveLength(2)
  })

  it('findBySessionAndExercise filters correctly', async () => {
    const other = await db.prisma.exercise.create({ data: { name: 'Row', trackingType: 'WEIGHT' } })
    await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    await repo.create({ sessionId, exerciseId: other.id, setNumber: 1, weightKg: 60, repsDone: 12 })
    const logs = await repo.findBySessionAndExercise(sessionId, exerciseId)
    expect(logs).toHaveLength(1)
    expect(logs[0].exerciseId).toBe(exerciseId)
  })

  it('findBySession returns all logs for the session', async () => {
    const other = await db.prisma.exercise.create({ data: { name: 'Curl', trackingType: 'WEIGHT' } })
    await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    await repo.create({ sessionId, exerciseId: other.id, setNumber: 1, weightKg: 20, repsDone: 15 })
    const logs = await repo.findBySession(sessionId)
    expect(logs).toHaveLength(2)
  })

  it('findBySessionAndExercise returns empty array when no matching logs', async () => {
    const logs = await repo.findBySessionAndExercise(sessionId, exerciseId)
    expect(logs).toHaveLength(0)
  })
})
```

**Implementation:** `src/lib/repositories/SessionLogRepository.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { ISessionLogRepository } from '@/lib/domain/session'
import type { TrainingSessionLog } from '@prisma/client'

export class SessionLogRepository implements ISessionLogRepository {
  constructor(private prisma: PrismaClient) {}

  create(data: {
    sessionId: string
    exerciseId: string
    setNumber: number
    weightKg?: number
    durationSecs?: number
    repsDone?: number
    planItemId?: string
  }): Promise<TrainingSessionLog> {
    return this.prisma.trainingSessionLog.create({ data })
  }

  findBySessionAndExercise(sessionId: string, exerciseId: string): Promise<TrainingSessionLog[]> {
    return this.prisma.trainingSessionLog.findMany({
      where: { sessionId, exerciseId },
      orderBy: { setNumber: 'asc' },
    })
  }

  findBySession(sessionId: string): Promise<TrainingSessionLog[]> {
    return this.prisma.trainingSessionLog.findMany({
      where: { sessionId },
      orderBy: { completedAt: 'asc' },
    })
  }
}
```

Run: `npm run test:integration -- --testPathPattern=SessionLogRepository`

Commit: `feat: add SessionLogRepository with integration tests`

---

## Phase 4: Services (Tasks 17–22)

Each task follows TDD with mocked repositories: write failing unit test, implement service, run tests, commit. No Prisma imports anywhere in this phase — services depend only on repository interfaces.

---

### Task 17: ExerciseService

**Test file:** `tests/unit/services/ExerciseService.test.ts`

```ts
import { ExerciseService } from '@/lib/services/ExerciseService'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import { DeleteBlockedError, NotFoundError } from '@/lib/errors'

const mockRepo: jest.Mocked<IExerciseRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findWithMedia: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  hasSessionLogs: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new ExerciseService(mockRepo)

const baseExercise = {
  id: '1',
  name: 'Squat',
  trackingType: 'WEIGHT' as const,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ExerciseService', () => {
  describe('create', () => {
    it('creates exercise via repo', async () => {
      const input = { name: 'Squat', trackingType: 'WEIGHT' as const }
      mockRepo.create.mockResolvedValue(baseExercise)
      const result = await service.create(input)
      expect(mockRepo.create).toHaveBeenCalledWith(input)
      expect(result).toEqual(baseExercise)
    })
  })

  describe('list', () => {
    it('returns all exercises from repo', async () => {
      mockRepo.findAll.mockResolvedValue([baseExercise])
      const result = await service.list()
      expect(result).toHaveLength(1)
    })
  })

  describe('update', () => {
    it('updates exercise when found', async () => {
      const updated = { ...baseExercise, name: 'New' }
      mockRepo.findById.mockResolvedValue(baseExercise)
      mockRepo.update.mockResolvedValue(updated)
      const result = await service.update('1', { name: 'New' })
      expect(result.name).toBe('New')
    })

    it('throws NotFoundError when exercise does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.update('999', { name: 'New' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes exercise when no session logs', async () => {
      mockRepo.findById.mockResolvedValue(baseExercise)
      mockRepo.hasSessionLogs.mockResolvedValue(false)
      await service.delete('1')
      expect(mockRepo.delete).toHaveBeenCalledWith('1')
    })

    it('throws DeleteBlockedError when exercise has session logs', async () => {
      mockRepo.findById.mockResolvedValue(baseExercise)
      mockRepo.hasSessionLogs.mockResolvedValue(true)
      await expect(service.delete('1')).rejects.toThrow(DeleteBlockedError)
      expect(mockRepo.delete).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when exercise does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.delete('999')).rejects.toThrow(NotFoundError)
    })
  })
})
```

**Implementation:** `src/lib/services/ExerciseService.ts`

```ts
import type { IExerciseRepository, CreateExerciseInput, UpdateExerciseInput, Exercise } from '@/lib/domain/exercise'
import { NotFoundError, DeleteBlockedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export class ExerciseService {
  constructor(private repo: IExerciseRepository) {}

  list(): Promise<Exercise[]> {
    return this.repo.findAll()
  }

  findById(id: string): Promise<Exercise | null> {
    return this.repo.findById(id)
  }

  findWithMedia(id: string): Promise<Exercise | null> {
    return this.repo.findWithMedia(id)
  }

  async create(data: CreateExerciseInput): Promise<Exercise> {
    logger.info({ service: 'ExerciseService', operation: 'create' }, 'Creating exercise')
    const exercise = await this.repo.create(data)
    logger.info({ service: 'ExerciseService', operation: 'create', entityId: exercise.id, outcome: 'created' }, 'Exercise created')
    return exercise
  }

  async update(id: string, data: UpdateExerciseInput): Promise<Exercise> {
    logger.info({ service: 'ExerciseService', operation: 'update', entityId: id }, 'Updating exercise')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const updated = await this.repo.update(id, data)
    logger.info({ service: 'ExerciseService', operation: 'update', entityId: id, outcome: 'updated' }, 'Exercise updated')
    return updated
  }

  async delete(id: string): Promise<void> {
    logger.info({ service: 'ExerciseService', operation: 'delete', entityId: id }, 'Deleting exercise')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const hasLogs = await this.repo.hasSessionLogs(id)
    if (hasLogs) {
      logger.info({ service: 'ExerciseService', operation: 'delete', entityId: id, outcome: 'blocked' }, 'Delete blocked — exercise has session logs')
      throw new DeleteBlockedError(id, 'exercise has session logs')
    }
    await this.repo.delete(id)
    logger.info({ service: 'ExerciseService', operation: 'delete', entityId: id, outcome: 'deleted' }, 'Exercise deleted')
  }
}
```

Run: `npm run test:unit -- --testPathPattern=ExerciseService`

Commit: `feat: add ExerciseService with unit tests`

---

### Task 18: ExerciseMediaService

**Test file:** `tests/unit/services/ExerciseMediaService.test.ts`

```ts
import { ExerciseMediaService } from '@/lib/services/ExerciseMediaService'
import type { IExerciseMediaRepository } from '@/lib/domain/exercise'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import { MediaLimitError, NotFoundError } from '@/lib/errors'
import { MAX_EXERCISE_MEDIA } from '@/lib/domain/constants'

const mockMediaRepo: jest.Mocked<IExerciseMediaRepository> = {
  create: jest.fn(),
  delete: jest.fn(),
  countByExercise: jest.fn(),
  reorder: jest.fn(),
  findByExercise: jest.fn(),
}

const mockExerciseRepo: jest.Mocked<IExerciseRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findWithMedia: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  hasSessionLogs: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new ExerciseMediaService(mockMediaRepo, mockExerciseRepo)

const baseExercise = {
  id: 'ex1',
  name: 'Squat',
  trackingType: 'WEIGHT' as const,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseMedia = {
  id: 'm1',
  exerciseId: 'ex1',
  type: 'PHOTO' as const,
  filePath: '/img.jpg',
  url: null,
  originalFilename: null,
  position: 1,
  createdAt: new Date(),
}

describe('ExerciseMediaService', () => {
  describe('addMedia', () => {
    it('adds media when count is below limit', async () => {
      mockExerciseRepo.findById.mockResolvedValue(baseExercise)
      mockMediaRepo.countByExercise.mockResolvedValue(3)
      mockMediaRepo.findByExercise.mockResolvedValue([])
      mockMediaRepo.create.mockResolvedValue(baseMedia)
      const result = await service.addMedia({ exerciseId: 'ex1', type: 'PHOTO', filePath: '/img.jpg' })
      expect(mockMediaRepo.create).toHaveBeenCalled()
      expect(result).toEqual(baseMedia)
    })

    it('throws MediaLimitError when count is at limit', async () => {
      mockExerciseRepo.findById.mockResolvedValue(baseExercise)
      mockMediaRepo.countByExercise.mockResolvedValue(MAX_EXERCISE_MEDIA)
      await expect(
        service.addMedia({ exerciseId: 'ex1', type: 'PHOTO', filePath: '/img.jpg' })
      ).rejects.toThrow(MediaLimitError)
      expect(mockMediaRepo.create).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when exercise does not exist', async () => {
      mockExerciseRepo.findById.mockResolvedValue(null)
      await expect(
        service.addMedia({ exerciseId: 'nope', type: 'PHOTO', filePath: '/img.jpg' })
      ).rejects.toThrow(NotFoundError)
    })

    it('computes next position as max existing position + 1', async () => {
      mockExerciseRepo.findById.mockResolvedValue(baseExercise)
      mockMediaRepo.countByExercise.mockResolvedValue(2)
      mockMediaRepo.findByExercise.mockResolvedValue([
        { ...baseMedia, position: 1 },
        { ...baseMedia, id: 'm2', position: 2 },
      ])
      mockMediaRepo.create.mockResolvedValue({ ...baseMedia, position: 3 })
      await service.addMedia({ exerciseId: 'ex1', type: 'PHOTO', filePath: '/img.jpg' })
      expect(mockMediaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 })
      )
    })
  })

  describe('deleteMedia', () => {
    it('calls repo.delete with the media id', async () => {
      mockMediaRepo.delete.mockResolvedValue(undefined)
      await service.deleteMedia('m1')
      expect(mockMediaRepo.delete).toHaveBeenCalledWith('m1')
    })
  })

  describe('reorder', () => {
    it('delegates to repo.reorder', async () => {
      mockMediaRepo.reorder.mockResolvedValue(undefined)
      const positions = [{ id: 'm1', position: 2 }, { id: 'm2', position: 1 }]
      await service.reorder('ex1', positions)
      expect(mockMediaRepo.reorder).toHaveBeenCalledWith('ex1', positions)
    })
  })
})
```

**Implementation:** `src/lib/services/ExerciseMediaService.ts`

```ts
import type { IExerciseMediaRepository, IExerciseRepository } from '@/lib/domain/exercise'
import type { ExerciseMedia } from '@prisma/client'
import { NotFoundError, MediaLimitError } from '@/lib/errors'
import { MAX_EXERCISE_MEDIA } from '@/lib/domain/constants'
import { logger } from '@/lib/logger'

interface AddMediaInput {
  exerciseId: string
  type: 'VIDEO' | 'PHOTO' | 'PDF' | 'YOUTUBE'
  filePath?: string
  url?: string
  originalFilename?: string
}

export class ExerciseMediaService {
  constructor(
    private mediaRepo: IExerciseMediaRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async addMedia(input: AddMediaInput): Promise<ExerciseMedia> {
    logger.info({ service: 'ExerciseMediaService', operation: 'addMedia', entityId: input.exerciseId }, 'Adding media to exercise')
    const exercise = await this.exerciseRepo.findById(input.exerciseId)
    if (!exercise) throw new NotFoundError(input.exerciseId)

    const count = await this.mediaRepo.countByExercise(input.exerciseId)
    if (count >= MAX_EXERCISE_MEDIA) {
      logger.info({ service: 'ExerciseMediaService', operation: 'addMedia', entityId: input.exerciseId, outcome: 'blocked' }, 'Media limit reached')
      throw new MediaLimitError(input.exerciseId)
    }

    const existing = await this.mediaRepo.findByExercise(input.exerciseId)
    const nextPosition = existing.length > 0
      ? Math.max(...existing.map(m => m.position)) + 1
      : 1

    const media = await this.mediaRepo.create({ ...input, position: nextPosition })
    logger.info({ service: 'ExerciseMediaService', operation: 'addMedia', entityId: media.id, outcome: 'created' }, 'Media added')
    return media
  }

  async deleteMedia(id: string): Promise<void> {
    logger.info({ service: 'ExerciseMediaService', operation: 'deleteMedia', entityId: id }, 'Deleting media')
    await this.mediaRepo.delete(id)
    logger.info({ service: 'ExerciseMediaService', operation: 'deleteMedia', entityId: id, outcome: 'deleted' }, 'Media deleted')
  }

  async reorder(exerciseId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    logger.info({ service: 'ExerciseMediaService', operation: 'reorder', entityId: exerciseId }, 'Reordering media')
    await this.mediaRepo.reorder(exerciseId, positions)
  }
}
```

Run: `npm run test:unit -- --testPathPattern=ExerciseMediaService`

Commit: `feat: add ExerciseMediaService with unit tests`

---

### Task 19: TrainingPlanService

**Test file:** `tests/unit/services/TrainingPlanService.test.ts`

```ts
import { TrainingPlanService } from '@/lib/services/TrainingPlanService'
import type { ITrainingPlanRepository } from '@/lib/domain/plan'
import { NotFoundError, ValidationError } from '@/lib/errors'

const mockRepo: jest.Mocked<ITrainingPlanRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findWithItems: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
  reorderItems: jest.fn(),
  findItemSlot: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new TrainingPlanService(mockRepo)

const basePlan = {
  id: 'p1',
  name: 'Push Day',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('TrainingPlanService', () => {
  describe('create', () => {
    it('creates plan via repo', async () => {
      mockRepo.create.mockResolvedValue(basePlan)
      const result = await service.create({ name: 'Push Day' })
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Push Day' })
      expect(result).toEqual(basePlan)
    })
  })

  describe('update', () => {
    it('throws NotFoundError when plan does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.update('nope', { name: 'X' })).rejects.toThrow(NotFoundError)
    })

    it('updates plan when found', async () => {
      const updated = { ...basePlan, name: 'Pull Day' }
      mockRepo.findById.mockResolvedValue(basePlan)
      mockRepo.update.mockResolvedValue(updated)
      const result = await service.update('p1', { name: 'Pull Day' })
      expect(result.name).toBe('Pull Day')
    })
  })

  describe('delete', () => {
    it('deletes plan via repo', async () => {
      mockRepo.findById.mockResolvedValue(basePlan)
      mockRepo.delete.mockResolvedValue(undefined)
      await service.delete('p1')
      expect(mockRepo.delete).toHaveBeenCalledWith('p1')
    })

    it('throws NotFoundError when plan does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.delete('nope')).rejects.toThrow(NotFoundError)
    })
  })

  describe('addItem', () => {
    it('adds single exercise item without slot validation', async () => {
      mockRepo.addItem.mockResolvedValue(undefined)
      await service.addItem('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, slot: 1 }])
      expect(mockRepo.addItem).toHaveBeenCalledWith('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, slot: 1 }])
    })

    it('allows biseries when slot 1 exists', async () => {
      mockRepo.findItemSlot.mockResolvedValue({ id: 'ie1', itemId: 'item1', exerciseId: 'e1', sets: 3, reps: 10, slot: 1 })
      mockRepo.addItem.mockResolvedValue(undefined)
      await service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 3, reps: 10, slot: 1 },
        { exerciseId: 'e2', sets: 3, reps: 10, slot: 2 },
      ])
      expect(mockRepo.addItem).toHaveBeenCalled()
    })

    it('throws ValidationError when slot 2 provided without slot 1 in item', async () => {
      await expect(
        service.addItem('p1', 1, [{ exerciseId: 'e2', sets: 3, reps: 10, slot: 2 }])
      ).rejects.toThrow(ValidationError)
      expect(mockRepo.addItem).not.toHaveBeenCalled()
    })
  })

  describe('removeItem', () => {
    it('delegates to repo.removeItem', async () => {
      mockRepo.removeItem.mockResolvedValue(undefined)
      await service.removeItem('item1')
      expect(mockRepo.removeItem).toHaveBeenCalledWith('item1')
    })
  })

  describe('reorderItems', () => {
    it('delegates to repo.reorderItems', async () => {
      mockRepo.reorderItems.mockResolvedValue(undefined)
      const positions = [{ id: 'i1', position: 2 }, { id: 'i2', position: 1 }]
      await service.reorderItems('p1', positions)
      expect(mockRepo.reorderItems).toHaveBeenCalledWith('p1', positions)
    })
  })
})
```

**Implementation:** `src/lib/services/TrainingPlanService.ts`

```ts
import type { ITrainingPlanRepository, CreatePlanInput, UpdatePlanInput, TrainingPlan, TrainingPlanWithItems } from '@/lib/domain/plan'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface PlanItemExerciseInput {
  exerciseId: string
  sets: number
  reps: number
  slot: number
}

export class TrainingPlanService {
  constructor(private repo: ITrainingPlanRepository) {}

  list(): Promise<TrainingPlan[]> {
    return this.repo.findAll()
  }

  findById(id: string): Promise<TrainingPlan | null> {
    return this.repo.findById(id)
  }

  findWithItems(id: string): Promise<TrainingPlanWithItems | null> {
    return this.repo.findWithItems(id)
  }

  async create(data: CreatePlanInput): Promise<TrainingPlan> {
    logger.info({ service: 'TrainingPlanService', operation: 'create' }, 'Creating plan')
    const plan = await this.repo.create(data)
    logger.info({ service: 'TrainingPlanService', operation: 'create', entityId: plan.id, outcome: 'created' }, 'Plan created')
    return plan
  }

  async update(id: string, data: UpdatePlanInput): Promise<TrainingPlan> {
    logger.info({ service: 'TrainingPlanService', operation: 'update', entityId: id }, 'Updating plan')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const updated = await this.repo.update(id, data)
    logger.info({ service: 'TrainingPlanService', operation: 'update', entityId: id, outcome: 'updated' }, 'Plan updated')
    return updated
  }

  async delete(id: string): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'delete', entityId: id }, 'Deleting plan')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    await this.repo.delete(id)
    logger.info({ service: 'TrainingPlanService', operation: 'delete', entityId: id, outcome: 'deleted' }, 'Plan deleted')
  }

  async addItem(
    planId: string,
    position: number,
    exercises: PlanItemExerciseInput[],
  ): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId }, 'Adding item to plan')
    const hasSlot2 = exercises.some(e => e.slot === 2)
    const hasSlot1 = exercises.some(e => e.slot === 1)
    if (hasSlot2 && !hasSlot1) {
      logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked' }, 'Biseries slot 2 requires slot 1')
      throw new ValidationError('biseries slot 2 requires slot 1 to exist in the same item')
    }
    await this.repo.addItem(planId, position, exercises)
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'created' }, 'Plan item added')
  }

  async removeItem(itemId: string): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'removeItem', entityId: itemId }, 'Removing plan item')
    await this.repo.removeItem(itemId)
  }

  async reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'reorderItems', entityId: planId }, 'Reordering plan items')
    await this.repo.reorderItems(planId, positions)
  }
}
```

Run: `npm run test:unit -- --testPathPattern=TrainingPlanService`

Commit: `feat: add TrainingPlanService with unit tests`

---

### Task 20: TraineeService

**Test file:** `tests/unit/services/TraineeService.test.ts`

```ts
import { TraineeService } from '@/lib/services/TraineeService'
import type { ITraineeRepository } from '@/lib/domain/trainee'
import { DeleteBlockedError, NotFoundError } from '@/lib/errors'

const mockRepo: jest.Mocked<ITraineeRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  hasSessions: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new TraineeService(mockRepo)

const baseTrainee = {
  id: 't1',
  name: 'Alice',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('TraineeService', () => {
  describe('create', () => {
    it('creates trainee via repo', async () => {
      mockRepo.create.mockResolvedValue(baseTrainee)
      const result = await service.create({ name: 'Alice' })
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Alice' })
      expect(result).toEqual(baseTrainee)
    })
  })

  describe('update', () => {
    it('updates trainee when found', async () => {
      const updated = { ...baseTrainee, name: 'Bob' }
      mockRepo.findById.mockResolvedValue(baseTrainee)
      mockRepo.update.mockResolvedValue(updated)
      const result = await service.update('t1', { name: 'Bob' })
      expect(result.name).toBe('Bob')
    })

    it('throws NotFoundError when trainee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.update('nope', { name: 'X' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes trainee when no sessions exist', async () => {
      mockRepo.findById.mockResolvedValue(baseTrainee)
      mockRepo.hasSessions.mockResolvedValue(false)
      await service.delete('t1')
      expect(mockRepo.delete).toHaveBeenCalledWith('t1')
    })

    it('throws DeleteBlockedError when trainee has sessions', async () => {
      mockRepo.findById.mockResolvedValue(baseTrainee)
      mockRepo.hasSessions.mockResolvedValue(true)
      await expect(service.delete('t1')).rejects.toThrow(DeleteBlockedError)
      expect(mockRepo.delete).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when trainee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.delete('nope')).rejects.toThrow(NotFoundError)
    })
  })

  describe('findById', () => {
    it('throws NotFoundError when trainee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.findById('nope')).rejects.toThrow(NotFoundError)
    })

    it('returns trainee when found', async () => {
      mockRepo.findById.mockResolvedValue(baseTrainee)
      const result = await service.findById('t1')
      expect(result).toEqual(baseTrainee)
    })
  })
})
```

**Implementation:** `src/lib/services/TraineeService.ts`

```ts
import type { ITraineeRepository, CreateTraineeInput, UpdateTraineeInput, Trainee } from '@/lib/domain/trainee'
import { NotFoundError, DeleteBlockedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export class TraineeService {
  constructor(private repo: ITraineeRepository) {}

  list(): Promise<Trainee[]> {
    return this.repo.findAll()
  }

  async findById(id: string): Promise<Trainee> {
    const trainee = await this.repo.findById(id)
    if (!trainee) throw new NotFoundError(id)
    return trainee
  }

  async create(data: CreateTraineeInput): Promise<Trainee> {
    logger.info({ service: 'TraineeService', operation: 'create' }, 'Creating trainee')
    const trainee = await this.repo.create(data)
    logger.info({ service: 'TraineeService', operation: 'create', entityId: trainee.id, outcome: 'created' }, 'Trainee created')
    return trainee
  }

  async update(id: string, data: UpdateTraineeInput): Promise<Trainee> {
    logger.info({ service: 'TraineeService', operation: 'update', entityId: id }, 'Updating trainee')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const updated = await this.repo.update(id, data)
    logger.info({ service: 'TraineeService', operation: 'update', entityId: id, outcome: 'updated' }, 'Trainee updated')
    return updated
  }

  async delete(id: string): Promise<void> {
    logger.info({ service: 'TraineeService', operation: 'delete', entityId: id }, 'Deleting trainee')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const hasSessions = await this.repo.hasSessions(id)
    if (hasSessions) {
      logger.info({ service: 'TraineeService', operation: 'delete', entityId: id, outcome: 'blocked' }, 'Delete blocked — trainee has sessions')
      throw new DeleteBlockedError(id, 'trainee has training sessions')
    }
    await this.repo.delete(id)
    logger.info({ service: 'TraineeService', operation: 'delete', entityId: id, outcome: 'deleted' }, 'Trainee deleted')
  }
}
```

Run: `npm run test:unit -- --testPathPattern=TraineeService`

Commit: `feat: add TraineeService with unit tests`

---

### Task 21: SessionService

**Test file:** `tests/unit/services/SessionService.test.ts`

```ts
import { SessionService } from '@/lib/services/SessionService'
import type { ISessionRepository } from '@/lib/domain/session'
import type { ISessionLogRepository } from '@/lib/domain/session'

const mockSessionRepo: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  finish: jest.fn(),
  findByTrainee: jest.fn(),
  findById: jest.fn(),
}

const mockSessionLogRepo: jest.Mocked<ISessionLogRepository> = {
  create: jest.fn(),
  findBySessionAndExercise: jest.fn(),
  findBySession: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new SessionService(mockSessionRepo, mockSessionLogRepo)

const baseSession = {
  id: 's1',
  traineeId: 'tr1',
  planId: null,
  startedAt: new Date(),
  finishedAt: null,
  caloriesBurned: null,
}

const baseLog = {
  id: 'log1',
  sessionId: 's1',
  exerciseId: 'e1',
  planItemId: null,
  setNumber: 1,
  weightKg: 80,
  durationSecs: null,
  repsDone: 10,
  completedAt: new Date(),
}

describe('SessionService', () => {
  describe('startPlanSession', () => {
    it('creates session with planId', async () => {
      const withPlan = { ...baseSession, planId: 'p1' }
      mockSessionRepo.create.mockResolvedValue(withPlan)
      const result = await service.startPlanSession('tr1', 'p1')
      expect(mockSessionRepo.create).toHaveBeenCalledWith({ traineeId: 'tr1', planId: 'p1' })
      expect(result.planId).toBe('p1')
    })
  })

  describe('startExerciseSession', () => {
    it('creates session without planId', async () => {
      mockSessionRepo.create.mockResolvedValue(baseSession)
      const result = await service.startExerciseSession('tr1')
      expect(mockSessionRepo.create).toHaveBeenCalledWith({ traineeId: 'tr1' })
      expect(result.planId).toBeNull()
    })
  })

  describe('logSet', () => {
    it('calls sessionLogRepo.create with correct data', async () => {
      mockSessionLogRepo.create.mockResolvedValue(baseLog)
      const input = { exerciseId: 'e1', setNumber: 1, weightKg: 80, repsDone: 10 }
      const result = await service.logSet('s1', input)
      expect(mockSessionLogRepo.create).toHaveBeenCalledWith({ sessionId: 's1', ...input })
      expect(result).toEqual(baseLog)
    })
  })

  describe('finishSession', () => {
    it('calls sessionRepo.finish with finishedAt', async () => {
      const finishedAt = new Date()
      const finished = { ...baseSession, finishedAt, caloriesBurned: 300 }
      mockSessionRepo.finish.mockResolvedValue(finished)
      const result = await service.finishSession('s1', { finishedAt, caloriesBurned: 300 })
      expect(mockSessionRepo.finish).toHaveBeenCalledWith('s1', { finishedAt, caloriesBurned: 300 })
      expect(result.finishedAt).toEqual(finishedAt)
    })
  })
})
```

**Implementation:** `src/lib/services/SessionService.ts`

```ts
import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'
import type { TrainingSession, TrainingSessionLog } from '@prisma/client'
import { logger } from '@/lib/logger'

interface LogSetInput {
  exerciseId: string
  setNumber: number
  weightKg?: number
  durationSecs?: number
  repsDone?: number
  planItemId?: string
}

interface FinishSessionInput {
  finishedAt: Date
  caloriesBurned?: number
}

export class SessionService {
  constructor(
    private sessionRepo: ISessionRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async startPlanSession(traineeId: string, planId: string): Promise<TrainingSession> {
    logger.info({ service: 'SessionService', operation: 'startPlanSession', entityId: traineeId }, 'Trainee starting plan session')
    const session = await this.sessionRepo.create({ traineeId, planId })
    logger.info({ service: 'SessionService', operation: 'startPlanSession', entityId: session.id, outcome: 'created' }, 'Plan session started')
    return session
  }

  async startExerciseSession(traineeId: string): Promise<TrainingSession> {
    logger.info({ service: 'SessionService', operation: 'startExerciseSession', entityId: traineeId }, 'Trainee starting exercise session')
    const session = await this.sessionRepo.create({ traineeId })
    logger.info({ service: 'SessionService', operation: 'startExerciseSession', entityId: session.id, outcome: 'created' }, 'Exercise session started')
    return session
  }

  async logSet(sessionId: string, data: LogSetInput): Promise<TrainingSessionLog> {
    logger.info({ service: 'SessionService', operation: 'logSet', entityId: sessionId }, 'Logging set')
    const log = await this.sessionLogRepo.create({ sessionId, ...data })
    logger.info({ service: 'SessionService', operation: 'logSet', entityId: log.id, outcome: 'created' }, 'Set logged')
    return log
  }

  async finishSession(sessionId: string, data: FinishSessionInput): Promise<TrainingSession> {
    logger.info({ service: 'SessionService', operation: 'finishSession', entityId: sessionId }, 'Finishing session')
    const session = await this.sessionRepo.finish(sessionId, data)
    logger.info({ service: 'SessionService', operation: 'finishSession', entityId: sessionId, outcome: 'finished' }, 'Session finished')
    return session
  }
}
```

Run: `npm run test:unit -- --testPathPattern=SessionService`

Commit: `feat: add SessionService with unit tests`

---

### Task 22: ProgressionService

**Test file:** `tests/unit/services/ProgressionService.test.ts`

```ts
import { ProgressionService } from '@/lib/services/ProgressionService'
import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'

const mockSessionRepo: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  finish: jest.fn(),
  findByTrainee: jest.fn(),
  findById: jest.fn(),
}

const mockSessionLogRepo: jest.Mocked<ISessionLogRepository> = {
  create: jest.fn(),
  findBySessionAndExercise: jest.fn(),
  findBySession: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new ProgressionService(mockSessionRepo, mockSessionLogRepo)

const makeSession = (id: string, startedAt: Date) => ({
  id,
  traineeId: 'tr1',
  planId: null,
  startedAt,
  finishedAt: startedAt,
  caloriesBurned: null,
})

const makeLog = (sessionId: string, weightKg: number, repsDone: number) => ({
  id: `log-${sessionId}`,
  sessionId,
  exerciseId: 'e1',
  planItemId: null,
  setNumber: 1,
  weightKg,
  durationSecs: null,
  repsDone,
  completedAt: new Date(),
})

describe('ProgressionService', () => {
  describe('getExerciseProgression', () => {
    it('returns max weight per session sorted by date', async () => {
      const date1 = new Date('2026-01-01')
      const date2 = new Date('2026-01-08')
      mockSessionRepo.findByTrainee.mockResolvedValue([
        makeSession('s1', date1),
        makeSession('s2', date2),
      ])
      mockSessionLogRepo.findBySessionAndExercise
        .mockResolvedValueOnce([makeLog('s1', 80, 10), makeLog('s1', 82.5, 8)])
        .mockResolvedValueOnce([makeLog('s2', 85, 6)])

      const result = await service.getExerciseProgression('tr1', 'e1')
      expect(result).toHaveLength(2)
      expect(result[0].date).toEqual(date1)
      expect(result[0].weightKg).toBe(82.5)
      expect(result[1].weightKg).toBe(85)
    })

    it('returns empty array when trainee has no sessions', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([])
      const result = await service.getExerciseProgression('tr1', 'e1')
      expect(result).toHaveLength(0)
    })

    it('excludes sessions with no logs for the exercise', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([makeSession('s1', new Date())])
      mockSessionLogRepo.findBySessionAndExercise.mockResolvedValue([])
      const result = await service.getExerciseProgression('tr1', 'e1')
      expect(result).toHaveLength(0)
    })
  })

  describe('getSessionFrequency', () => {
    it('groups sessions by ISO week', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([
        makeSession('s1', new Date('2026-01-05')),
        makeSession('s2', new Date('2026-01-06')),
        makeSession('s3', new Date('2026-01-12')),
      ])
      const result = await service.getSessionFrequency('tr1')
      expect(result).toHaveLength(2)
      const week1 = result.find(r => r.count === 2)
      const week2 = result.find(r => r.count === 1)
      expect(week1).toBeDefined()
      expect(week2).toBeDefined()
    })

    it('returns empty array when trainee has no sessions', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([])
      const result = await service.getSessionFrequency('tr1')
      expect(result).toHaveLength(0)
    })
  })
})
```

**Implementation:** `src/lib/services/ProgressionService.ts`

```ts
import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'

interface ExerciseProgressionPoint {
  date: Date
  weightKg: number | null
  reps: number | null
}

interface WeeklyFrequency {
  week: string
  count: number
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export class ProgressionService {
  constructor(
    private sessionRepo: ISessionRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async getExerciseProgression(
    traineeId: string,
    exerciseId: string,
  ): Promise<ExerciseProgressionPoint[]> {
    const sessions = await this.sessionRepo.findByTrainee(traineeId)
    const points: ExerciseProgressionPoint[] = []

    for (const session of sessions) {
      const logs = await this.sessionLogRepo.findBySessionAndExercise(session.id, exerciseId)
      if (logs.length === 0) continue
      const maxWeightLog = logs.reduce((best, log) =>
        (log.weightKg ?? -Infinity) > (best.weightKg ?? -Infinity) ? log : best
      )
      points.push({
        date: session.startedAt,
        weightKg: maxWeightLog.weightKg ?? null,
        reps: maxWeightLog.repsDone ?? null,
      })
    }

    return points.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  async getSessionFrequency(traineeId: string): Promise<WeeklyFrequency[]> {
    const sessions = await this.sessionRepo.findByTrainee(traineeId)
    const weekCounts = new Map<string, number>()

    for (const session of sessions) {
      const week = isoWeek(session.startedAt)
      weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1)
    }

    return Array.from(weekCounts.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }
}
```

Run: `npm run test:unit -- --testPathPattern=ProgressionService`

Commit: `feat: add ProgressionService with unit tests`
## Phase 5: API Routes (Tasks 23–28)

### Task 23: Exercise API + shared utilities

Create `src/lib/api/handleError.ts`:

```ts
// src/lib/api/handleError.ts
import { NextResponse } from 'next/server'
import { NotFoundError, DeleteBlockedError, ValidationError, MediaLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export function handleError(error: unknown, path: string): NextResponse {
  if (error instanceof NotFoundError) {
    logger.warn({ path, status: 404, error: error.message }, 'Not found')
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error instanceof DeleteBlockedError) {
    logger.warn({ path, status: 409, error: error.message }, 'Delete blocked')
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
  if (error instanceof ValidationError) {
    logger.warn({ path, status: 400, error: error.message }, 'Validation error')
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (error instanceof MediaLimitError) {
    logger.warn({ path, status: 422, error: error.message }, 'Media limit')
    return NextResponse.json({ error: error.message }, { status: 422 })
  }
  logger.error({ path, status: 500, error: String(error) }, 'Internal server error')
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

Create `src/lib/api/services.ts`:

```ts
// src/lib/api/services.ts — server-side singleton services wired with real repos
import { prisma } from '@/lib/db'
import { ExerciseRepository } from '@/lib/repositories/ExerciseRepository'
import { ExerciseMediaRepository } from '@/lib/repositories/ExerciseMediaRepository'
import { TrainingPlanRepository } from '@/lib/repositories/TrainingPlanRepository'
import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
import { SessionRepository } from '@/lib/repositories/SessionRepository'
import { SessionLogRepository } from '@/lib/repositories/SessionLogRepository'
import { ExerciseService } from '@/lib/services/ExerciseService'
import { ExerciseMediaService } from '@/lib/services/ExerciseMediaService'
import { TrainingPlanService } from '@/lib/services/TrainingPlanService'
import { TraineeService } from '@/lib/services/TraineeService'
import { SessionService } from '@/lib/services/SessionService'
import { ProgressionService } from '@/lib/services/ProgressionService'

export const exerciseService = new ExerciseService(new ExerciseRepository(prisma))
export const exerciseMediaService = new ExerciseMediaService(new ExerciseMediaRepository(prisma), new ExerciseRepository(prisma))
export const trainingPlanService = new TrainingPlanService(new TrainingPlanRepository(prisma))
export const traineeService = new TraineeService(new TraineeRepository(prisma))
export const sessionService = new SessionService(new SessionRepository(prisma), new SessionLogRepository(prisma))
export const progressionService = new ProgressionService(new SessionRepository(prisma), new SessionLogRepository(prisma))
```

Create `src/app/api/exercises/route.ts`:

```ts
/**
 * @swagger
 * /api/exercises:
 *   get:
 *     summary: List all exercises
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: Array of exercises
 *   post:
 *     summary: Create exercise
 *     tags: [Exercises]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExercise'
 *     responses:
 *       201:
 *         description: Created exercise
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { exerciseService } from '@/lib/api/services'
import { CreateExerciseSchema } from '@/lib/domain/exercise'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    const exercises = await exerciseService.list()
    return NextResponse.json(exercises)
  } catch (error) {
    return handleError(error, '/api/exercises')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateExerciseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const exercise = await exerciseService.create(parsed.data)
    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/exercises')
  }
}
```

Create `src/app/api/exercises/[id]/route.ts`:

```ts
/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get exercise with media
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exercise with media array
 *       404:
 *         description: Exercise not found
 *   put:
 *     summary: Update exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExercise'
 *     responses:
 *       200:
 *         description: Updated exercise
 *       400:
 *         description: Validation error
 *       404:
 *         description: Exercise not found
 *   delete:
 *     summary: Delete exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Exercise not found
 *       409:
 *         description: Delete blocked — exercise has session logs
 */
import { NextResponse } from 'next/server'
import { exerciseService } from '@/lib/api/services'
import { UpdateExerciseSchema } from '@/lib/domain/exercise'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const exercise = await exerciseService.findWithMedia(params.id)
    return NextResponse.json(exercise)
  } catch (error) {
    return handleError(error, `/api/exercises/${params.id}`)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = UpdateExerciseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const exercise = await exerciseService.update(params.id, parsed.data)
    return NextResponse.json(exercise)
  } catch (error) {
    return handleError(error, `/api/exercises/${params.id}`)
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await exerciseService.delete(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/exercises/${params.id}`)
  }
}
```

Commit: `feat: add exercise API routes`

---

### Task 24: Media API

Create `src/app/api/exercises/[id]/media/route.ts`:

```ts
/**
 * @swagger
 * /api/exercises/{id}/media:
 *   post:
 *     summary: Upload or attach media to exercise
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [VIDEO, PHOTO, PDF, YOUTUBE]
 *               file:
 *                 type: string
 *                 format: binary
 *               url:
 *                 type: string
 *                 description: YouTube URL (required when type is YOUTUBE)
 *     responses:
 *       201:
 *         description: Media item created
 *       404:
 *         description: Exercise not found
 *       422:
 *         description: Media limit reached (max 10 items per exercise)
 */
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { exerciseMediaService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData()
    const type = formData.get('type') as string

    if (!['VIDEO', 'PHOTO', 'PDF', 'YOUTUBE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
    }

    if (type === 'YOUTUBE') {
      const url = formData.get('url') as string
      if (!url) return NextResponse.json({ error: 'URL required for YOUTUBE type' }, { status: 400 })
      const media = await exerciseMediaService.addMedia(params.id, { type: 'YOUTUBE', url })
      return NextResponse.json(media, { status: 201 })
    }

    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const ext = extname(file.name)
    const filename = `${randomUUID()}${ext}`
    const mediaPath = process.env.MEDIA_PATH ?? '/data/media'
    const dir = join(mediaPath, params.id)
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const relativePath = `${params.id}/${filename}`
    const media = await exerciseMediaService.addMedia(params.id, {
      type: type as 'VIDEO' | 'PHOTO' | 'PDF',
      filePath: relativePath,
      originalFilename: file.name,
    })
    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/exercises/${params.id}/media`)
  }
}
```

Create `src/app/api/media/[id]/route.ts`:

```ts
/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete a media item
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Media not found
 */
import { NextResponse } from 'next/server'
import { exerciseMediaService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await exerciseMediaService.deleteMedia(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/media/${params.id}`)
  }
}
```

Create `src/app/api/media/[...path]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const filePath = join(process.env.MEDIA_PATH ?? '/data/media', ...params.path)
  try {
    const stat = statSync(filePath)
    const stream = createReadStream(filePath)
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: { 'Content-Length': stat.size.toString() },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
```

Commit: `feat: add media API routes`

---

### Task 25: Training Plan API

Create `src/app/api/plans/route.ts`:

```ts
/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: List all training plans
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: Array of training plans
 *   post:
 *     summary: Create training plan
 *     tags: [Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTrainingPlan'
 *     responses:
 *       201:
 *         description: Created plan
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { CreateTrainingPlanSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    const plans = await trainingPlanService.list()
    return NextResponse.json(plans)
  } catch (error) {
    return handleError(error, '/api/plans')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateTrainingPlanSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const plan = await trainingPlanService.create(parsed.data)
    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/plans')
  }
}
```

Create `src/app/api/plans/[id]/route.ts`:

```ts
/**
 * @swagger
 * /api/plans/{id}:
 *   get:
 *     summary: Get plan with items and exercises
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan with nested items
 *       404:
 *         description: Plan not found
 *   put:
 *     summary: Update plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTrainingPlan'
 *     responses:
 *       200:
 *         description: Updated plan
 *       400:
 *         description: Validation error
 *       404:
 *         description: Plan not found
 *   delete:
 *     summary: Delete plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Plan not found
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { UpdateTrainingPlanSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const plan = await trainingPlanService.findWithItems(params.id)
    return NextResponse.json(plan)
  } catch (error) {
    return handleError(error, `/api/plans/${params.id}`)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = UpdateTrainingPlanSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const plan = await trainingPlanService.update(params.id, parsed.data)
    return NextResponse.json(plan)
  } catch (error) {
    return handleError(error, `/api/plans/${params.id}`)
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await trainingPlanService.delete(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/plans/${params.id}`)
  }
}
```

Create `src/app/api/plans/[id]/items/route.ts`:

```ts
/**
 * @swagger
 * /api/plans/{id}/items:
 *   post:
 *     summary: Add item (single or biseries) to plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddPlanItem'
 *     responses:
 *       201:
 *         description: Item added
 *       400:
 *         description: Validation error or biseries slot 2 without slot 1
 *       404:
 *         description: Plan not found
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { AddPlanItemSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = AddPlanItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const item = await trainingPlanService.addItem(params.id, parsed.data)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/plans/${params.id}/items`)
  }
}
```

Create `src/app/api/plans/[id]/items/[itemId]/route.ts`:

```ts
/**
 * @swagger
 * /api/plans/{id}/items/{itemId}:
 *   delete:
 *     summary: Remove item from plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Item removed
 *       404:
 *         description: Plan or item not found
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

export async function DELETE(_: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    await trainingPlanService.removeItem(params.id, params.itemId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/plans/${params.id}/items/${params.itemId}`)
  }
}
```

Create `src/app/api/plans/[id]/items/reorder/route.ts`:

```ts
/**
 * @swagger
 * /api/plans/{id}/items/reorder:
 *   put:
 *     summary: Reorder plan items
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderedItemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Items reordered
 *       400:
 *         description: Validation error
 *       404:
 *         description: Plan not found
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { trainingPlanService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

const ReorderSchema = z.object({ orderedItemIds: z.array(z.string()).min(1) })

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = ReorderSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const plan = await trainingPlanService.reorderItems(params.id, parsed.data.orderedItemIds)
    return NextResponse.json(plan)
  } catch (error) {
    return handleError(error, `/api/plans/${params.id}/items/reorder`)
  }
}
```

Commit: `feat: add training plan API routes`

---

### Task 26: Trainee API

Create `src/app/api/trainees/route.ts`:

```ts
/**
 * @swagger
 * /api/trainees:
 *   get:
 *     summary: List all trainees
 *     tags: [Trainees]
 *     responses:
 *       200:
 *         description: Array of trainees
 *   post:
 *     summary: Create trainee
 *     tags: [Trainees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTrainee'
 *     responses:
 *       201:
 *         description: Created trainee
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { traineeService } from '@/lib/api/services'
import { CreateTraineeSchema } from '@/lib/domain/trainee'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    const trainees = await traineeService.list()
    return NextResponse.json(trainees)
  } catch (error) {
    return handleError(error, '/api/trainees')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateTraineeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const trainee = await traineeService.create(parsed.data)
    return NextResponse.json(trainee, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/trainees')
  }
}
```

Create `src/app/api/trainees/[id]/route.ts`:

```ts
/**
 * @swagger
 * /api/trainees/{id}:
 *   get:
 *     summary: Get trainee by ID
 *     tags: [Trainees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trainee
 *       404:
 *         description: Trainee not found
 *   put:
 *     summary: Update trainee
 *     tags: [Trainees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTrainee'
 *     responses:
 *       200:
 *         description: Updated trainee
 *       400:
 *         description: Validation error
 *       404:
 *         description: Trainee not found
 *   delete:
 *     summary: Delete trainee
 *     tags: [Trainees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Trainee not found
 *       409:
 *         description: Delete blocked — trainee has sessions
 */
import { NextResponse } from 'next/server'
import { traineeService } from '@/lib/api/services'
import { UpdateTraineeSchema } from '@/lib/domain/trainee'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const trainee = await traineeService.findById(params.id)
    return NextResponse.json(trainee)
  } catch (error) {
    return handleError(error, `/api/trainees/${params.id}`)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = UpdateTraineeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const trainee = await traineeService.update(params.id, parsed.data)
    return NextResponse.json(trainee)
  } catch (error) {
    return handleError(error, `/api/trainees/${params.id}`)
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await traineeService.delete(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/trainees/${params.id}`)
  }
}
```

Commit: `feat: add trainee API routes`

---

### Task 27: Session API

Create `src/app/api/sessions/route.ts`:

```ts
/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: List sessions for a trainee
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: traineeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of sessions
 *       400:
 *         description: traineeId query param missing
 *   post:
 *     summary: Start a new session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [traineeId]
 *             properties:
 *               traineeId:
 *                 type: string
 *               planId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session started
 *       400:
 *         description: Validation error
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sessionService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

const StartSessionSchema = z.object({
  traineeId: z.string().min(1),
  planId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const traineeId = request.nextUrl.searchParams.get('traineeId')
    if (!traineeId) return NextResponse.json({ error: 'traineeId is required' }, { status: 400 })
    const sessions = await sessionService.listByTrainee(traineeId)
    return NextResponse.json(sessions)
  } catch (error) {
    return handleError(error, '/api/sessions')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = StartSessionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const session = await sessionService.start(parsed.data.traineeId, parsed.data.planId)
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/sessions')
  }
}
```

Create `src/app/api/sessions/[id]/logs/route.ts`:

```ts
/**
 * @swagger
 * /api/sessions/{id}/logs:
 *   post:
 *     summary: Log a completed set
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exerciseId, setNumber]
 *             properties:
 *               exerciseId:
 *                 type: string
 *               planItemId:
 *                 type: string
 *               setNumber:
 *                 type: integer
 *               weightKg:
 *                 type: number
 *               durationSecs:
 *                 type: integer
 *               repsDone:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Set logged
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sessionService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

const LogSetSchema = z.object({
  exerciseId: z.string().min(1),
  planItemId: z.string().optional(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().positive().optional(),
  durationSecs: z.number().int().positive().optional(),
  repsDone: z.number().int().positive().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = LogSetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const log = await sessionService.logSet(params.id, parsed.data)
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/sessions/${params.id}/logs`)
  }
}
```

Create `src/app/api/sessions/[id]/finish/route.ts`:

```ts
/**
 * @swagger
 * /api/sessions/{id}/finish:
 *   put:
 *     summary: Finish a session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caloriesBurned:
 *                 type: integer
 *                 description: Optional calories from Apple Watch
 *     responses:
 *       200:
 *         description: Session finished
 *       404:
 *         description: Session not found
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sessionService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

const FinishSchema = z.object({ caloriesBurned: z.number().int().positive().optional() })

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = FinishSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const session = await sessionService.finish(params.id, parsed.data.caloriesBurned)
    return NextResponse.json(session)
  } catch (error) {
    return handleError(error, `/api/sessions/${params.id}/finish`)
  }
}
```

Commit: `feat: add session API routes`

---

### Task 28: Swagger UI

Install `next-swagger-doc` and `swagger-ui-react`. Verify latest versions compatible with Next.js 15 before pinning.

Create `src/app/api-docs/swagger.json/route.ts`:

```ts
import { createSwaggerSpec } from 'next-swagger-doc'
import { NextResponse } from 'next/server'

export async function GET() {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: { title: 'FitFamily API', version: '1.0' },
    },
  })
  return NextResponse.json(spec)
}
```

Create `src/app/api-docs/page.tsx`:

```tsx
'use client'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  return <SwaggerUI url="/api-docs/swagger.json" />
}
```

Commit: `feat: add Swagger UI at /api-docs`

---

## Phase 6: Shared UI Components (Tasks 29–33)

### Task 29: UI primitives

Install deps: `npm install clsx tailwind-merge`

Create `src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Create `src/components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-[#E85D26] text-white hover:bg-[#d05020]',
      secondary: 'border border-[rgba(255,255,255,0.08)] text-white hover:bg-[#1A1A1A]',
      ghost: 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[#1A1A1A]',
      danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
    }
    const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

Create `src/components/ui/Input.tsx`:

```tsx
import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-[rgba(255,255,255,0.6)]">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'h-10 px-3 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#E85D26] transition-colors',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'
```

Create `src/components/ui/Card.tsx`:

```tsx
import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
```

Create `src/components/ui/Spinner.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#E85D26]',
        sizes[size],
        className
      )}
    />
  )
}
```

Create `src/components/ui/Badge.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs text-[rgba(255,255,255,0.6)]',
        className
      )}
    >
      {children}
    </span>
  )
}
```

Commit: `feat: add UI primitive components`

---

### Task 30: AppLayout + Header + ModeToggle

Create `src/lib/context/ModeContext.tsx`:

```tsx
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Mode = 'trainer' | 'trainee'

interface ModeContextValue {
  mode: Mode
  setMode: (mode: Mode) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>('trainee')

  useEffect(() => {
    const stored = localStorage.getItem('fitfamily-mode') as Mode | null
    if (stored === 'trainer' || stored === 'trainee') setModeState(stored)
  }, [])

  const setMode = (next: Mode) => {
    setModeState(next)
    localStorage.setItem('fitfamily-mode', next)
  }

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
```

Create `src/components/layout/Header.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMode } from '@/lib/context/ModeContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const t = useTranslations('mode')
  const { mode, setMode } = useMode()

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0A]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          FitFamily
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode(mode === 'trainer' ? 'trainee' : 'trainer')}
        >
          {mode === 'trainer' ? t('switchToTrainee') : t('switchToTrainer')}
        </Button>
      </div>
    </header>
  )
}
```

Create `src/components/layout/AppLayout.tsx`:

```tsx
import { Header } from './Header'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
```

Update `src/app/layout.tsx` to wrap with `ModeProvider` and `AppLayout`. Add translation keys `mode.switchToTrainee` and `mode.switchToTrainer` to `src/i18n/en.json`.

Commit: `feat: add AppLayout with Header and ModeToggle`

---

### Task 31: MediaStrip

Create `src/components/MediaStrip.tsx`:

```tsx
'use client'
import type { ExerciseMedia } from '@prisma/client'

interface MediaStripProps {
  media: ExerciseMedia[]
  className?: string
}

export function MediaStrip({ media, className }: MediaStripProps) {
  if (media.length === 0) return null
  return (
    <div className={`flex gap-3 overflow-x-auto pb-2 ${className ?? ''}`}>
      {media.map((item) => (
        <MediaItem key={item.id} item={item} />
      ))}
    </div>
  )
}

function MediaItem({ item }: { item: ExerciseMedia }) {
  if (item.type === 'PHOTO') {
    return (
      <img
        src={`/api/media/${item.filePath}`}
        alt=""
        className="h-32 w-32 flex-shrink-0 rounded-[8px] object-cover border border-[rgba(255,255,255,0.08)]"
      />
    )
  }
  if (item.type === 'VIDEO') {
    return (
      <video
        src={`/api/media/${item.filePath}`}
        controls
        className="h-32 w-48 flex-shrink-0 rounded-[8px] border border-[rgba(255,255,255,0.08)]"
      />
    )
  }
  if (item.type === 'YOUTUBE') {
    const videoId = new URL(item.url!).searchParams.get('v')
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="h-32 w-48 flex-shrink-0 rounded-[8px] border border-[rgba(255,255,255,0.08)]"
        allowFullScreen
      />
    )
  }
  if (item.type === 'PDF') {
    return (
      <a
        href={`/api/media/${item.filePath}`}
        download={item.originalFilename ?? 'document.pdf'}
        className="flex h-32 w-32 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] text-sm text-[rgba(255,255,255,0.6)] hover:text-white"
      >
        <span className="text-2xl">📄</span>
        <span className="truncate px-2 text-xs">{item.originalFilename ?? 'PDF'}</span>
      </a>
    )
  }
  return null
}
```

Commit: `feat: add MediaStrip component`

---

### Task 32: SetLogger

Create `src/components/SetLogger.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SetLoggerProps {
  setNumber: number
  totalSets: number
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
  previousWeight?: number | null
  onMarkDone: (data: { weightKg?: number; repsDone?: number }) => Promise<void>
}

export function SetLogger({ setNumber, totalSets, targetReps, trackingType, previousWeight, onMarkDone }: SetLoggerProps) {
  const t = useTranslations('session')
  const [weightKg, setWeightKg] = useState(previousWeight?.toString() ?? '')
  const [repsDone, setRepsDone] = useState(targetReps.toString())
  const [loading, setLoading] = useState(false)

  const handleDone = async () => {
    setLoading(true)
    await onMarkDone({
      weightKg: trackingType === 'WEIGHT' ? parseFloat(weightKg) : undefined,
      repsDone: parseInt(repsDone),
    })
    setLoading(false)
  }

  return (
    <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
      <p className="mb-3 text-sm text-[rgba(255,255,255,0.6)]">
        {t('setOf', { current: setNumber, total: totalSets })}
      </p>
      <div className="flex gap-3">
        {trackingType === 'WEIGHT' && (
          <Input
            label={t('weightKg')}
            type="number"
            step="0.5"
            min="0"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-24 text-2xl font-bold"
          />
        )}
        <Input
          label={t('reps')}
          type="number"
          min="1"
          value={repsDone}
          onChange={(e) => setRepsDone(e.target.value)}
          className="w-20 text-2xl font-bold"
        />
      </div>
      {previousWeight && (
        <p className="mt-2 text-xs text-[rgba(255,255,255,0.4)]">
          {t('lastSession')}: {previousWeight} kg
        </p>
      )}
      <Button variant="primary" size="lg" className="mt-4 w-full" onClick={handleDone} disabled={loading}>
        {t('markDone')}
      </Button>
    </div>
  )
}
```

Add translation keys to `src/i18n/en.json`: `session.setOf`, `session.weightKg`, `session.reps`, `session.lastSession`, `session.markDone`.

Commit: `feat: add SetLogger component`

---

### Task 33: ExerciseCard

Create `src/components/ExerciseCard.tsx`:

```tsx
import Link from 'next/link'
import type { Exercise } from '@/lib/domain/exercise'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ExerciseCardProps {
  exercise: Exercise
  href?: string
  onClick?: () => void
}

export function ExerciseCard({ exercise, href, onClick }: ExerciseCardProps) {
  const content = (
    <Card className="cursor-pointer hover:border-[rgba(255,255,255,0.16)] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold">{exercise.name}</h3>
          {exercise.description && (
            <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)] line-clamp-2">{exercise.description}</p>
          )}
        </div>
        <Badge>{exercise.trackingType}</Badge>
      </div>
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  if (onClick) return <button onClick={onClick} className="w-full text-left">{content}</button>
  return content
}
```

Commit: `feat: add ExerciseCard component`
## Phase 7: Trainer Mode UI (Tasks 34–39)

### Task 34: Trainer home page

File: `src/app/(trainer)/trainer/page.tsx`

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Card } from '@/components/ui/Card'

export default async function TrainerHomePage() {
  const t = await getTranslations('trainer')
  const sections = [
    { href: '/trainer/exercises', label: t('exercises'), description: t('exercisesDesc') },
    { href: '/trainer/plans', label: t('plans'), description: t('plansDesc') },
    { href: '/trainer/trainees', label: t('trainees'), description: t('traineesDesc') },
    { href: '/trainer/progress', label: t('progress'), description: t('progressDesc') },
  ]
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t('title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
              <h2 className="font-display font-semibold">{s.label}</h2>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

Add translation keys to `src/i18n/en.json` under `"trainer"`:
```json
{
  "trainer": {
    "title": "Trainer",
    "exercises": "Exercises",
    "exercisesDesc": "Create and manage exercises",
    "plans": "Training Plans",
    "plansDesc": "Build and organise training plans",
    "trainees": "Trainees",
    "traineesDesc": "Manage trainee profiles",
    "progress": "Progress",
    "progressDesc": "View progression charts"
  }
}
```

Commit: `feat: add trainer home page`

---

### Task 35: Exercise list + create

File: `src/app/(trainer)/trainer/exercises/page.tsx`

```tsx
import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { ExerciseCard } from '@/components/ExerciseCard'
import { CreateExerciseModal } from './CreateExerciseModal'

export default async function ExercisesPage() {
  const t = await getTranslations('exercises')
  const exercises = await exerciseService.list()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <CreateExerciseModal />
      </div>

      {exercises.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} href={`/trainer/exercises/${ex.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/exercises/CreateExerciseModal.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreateExerciseModal() {
  const t = useTranslations('exercises')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trackingType, setTrackingType] = useState<'WEIGHT' | 'TIME' | 'NONE'>('WEIGHT')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, trackingType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('createError'))
        return
      }
      setOpen(false)
      setName('')
      setDescription('')
      setTrackingType('WEIGHT')
      router.refresh()
    } catch {
      setError(t('createError'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>{t('newExercise')}</Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('newExercise')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('name')}</label>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('description')}</label>
            <Input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('trackingType')}</label>
            <select
              name="trackingType"
              value={trackingType}
              onChange={(e) => setTrackingType(e.target.value as 'WEIGHT' | 'TIME' | 'NONE')}
              className="w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-3 py-2 text-white"
            >
              <option value="WEIGHT">{t('trackingWeight')}</option>
              <option value="TIME">{t('trackingTime')}</option>
              <option value="NONE">{t('trackingNone')}</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Add translation keys under `"exercises"`:
```json
{
  "exercises": {
    "title": "Exercises",
    "empty": "No exercises yet. Create your first one.",
    "newExercise": "New Exercise",
    "name": "Name",
    "description": "Description (optional)",
    "trackingType": "Tracking type",
    "trackingWeight": "Weight",
    "trackingTime": "Time",
    "trackingNone": "None",
    "save": "Save",
    "saving": "Saving…",
    "cancel": "Cancel",
    "createError": "Failed to create exercise"
  }
}
```

Commit: `feat: add trainer exercise list page`

---

### Task 36: Exercise detail + media management

File: `src/app/(trainer)/trainer/exercises/[id]/page.tsx`

```tsx
import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { EditExerciseForm } from './EditExerciseForm'
import { MediaManager } from './MediaManager'
import { DeleteExerciseButton } from './DeleteExerciseButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('exerciseDetail')
  const exercise = await exerciseService.findWithMedia(id)
  if (!exercise) notFound()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
        <DeleteExerciseButton id={id} />
      </div>
      <EditExerciseForm exercise={exercise} />
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{t('media')}</h2>
        <MediaManager exerciseId={id} initialMedia={exercise.media} />
      </section>
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/exercises/[id]/EditExerciseForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

interface Props {
  exercise: Exercise
}

export function EditExerciseForm({ exercise }: Props) {
  const t = useTranslations('exerciseDetail')
  const router = useRouter()
  const [name, setName] = useState(exercise.name)
  const [description, setDescription] = useState(exercise.description ?? '')
  const [trackingType, setTrackingType] = useState(exercise.trackingType)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/exercises/${exercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, trackingType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('saveError'))
        return
      }
      router.refresh()
    } catch {
      setError(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('name')}</label>
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('description')}</label>
        <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('trackingType')}</label>
        <select
          name="trackingType"
          value={trackingType}
          onChange={(e) => setTrackingType(e.target.value as typeof trackingType)}
          className="w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-3 py-2 text-white"
        >
          <option value="WEIGHT">{t('trackingWeight')}</option>
          <option value="TIME">{t('trackingTime')}</option>
          <option value="NONE">{t('trackingNone')}</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div>
        <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>
      </div>
    </form>
  )
}
```

File: `src/app/(trainer)/trainer/exercises/[id]/DeleteExerciseButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

interface Props {
  id: string
}

export function DeleteExerciseButton({ id }: Props) {
  const t = useTranslations('exerciseDetail')
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('deleteBlockedError'))
        setConfirming(false)
        return
      }
      if (!res.ok) {
        setError(t('deleteError'))
        setConfirming(false)
        return
      }
      router.push('/trainer/exercises')
      router.refresh()
    } catch {
      setError(t('deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!confirming ? (
        <Button variant="ghost" onClick={() => setConfirming(true)}>{t('delete')}</Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('deleting') : t('confirmDelete')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>{t('cancel')}</Button>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/exercises/[id]/MediaManager.tsx`

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MAX_EXERCISE_MEDIA } from '@/lib/domain/constants'
import type { ExerciseMedia, MediaType } from '@prisma/client'

interface Props {
  exerciseId: string
  initialMedia: ExerciseMedia[]
}

function SortableMediaItem({
  item,
  onDelete,
}: {
  item: ExerciseMedia
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const t = useTranslations('mediaManager')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-3"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-[rgba(255,255,255,0.4)]"
      >
        ⠿
      </span>
      <span className="flex-1 text-sm">{item.type === 'YOUTUBE' ? item.url : item.originalFilename ?? item.filePath}</span>
      <button
        onClick={() => onDelete(item.id)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        {t('remove')}
      </button>
    </div>
  )
}

export function MediaManager({ exerciseId, initialMedia }: Props) {
  const t = useTranslations('mediaManager')
  const router = useRouter()
  const [media, setMedia] = useState<ExerciseMedia[]>(initialMedia)
  const [mediaType, setMediaType] = useState<MediaType>('YOUTUBE')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const atLimit = media.length >= MAX_EXERCISE_MEDIA

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = media.findIndex((m) => m.id === active.id)
      const newIndex = media.findIndex((m) => m.id === over.id)
      const reordered = arrayMove(media, oldIndex, newIndex)
      setMedia(reordered)
      await fetch(`/api/exercises/${exerciseId}/media/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      })
      router.refresh()
    },
    [media, exerciseId, router],
  )

  async function handleDelete(mediaId: string) {
    setError(null)
    const res = await fetch(`/api/exercises/${exerciseId}/media/${mediaId}`, { method: 'DELETE' })
    if (!res.ok) {
      setError(t('deleteError'))
      return
    }
    setMedia((prev) => prev.filter((m) => m.id !== mediaId))
    router.refresh()
  }

  async function handleAddYoutube(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploading(true)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'YOUTUBE', url: youtubeUrl }),
      })
      if (res.status === 422) {
        setError(t('limitReached', { max: MAX_EXERCISE_MEDIA }))
        return
      }
      if (!res.ok) {
        setError(t('addError'))
        return
      }
      const created: ExerciseMedia = await res.json()
      setMedia((prev) => [...prev, created])
      setYoutubeUrl('')
      router.refresh()
    } catch {
      setError(t('addError'))
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', mediaType)
      const res = await fetch(`/api/exercises/${exerciseId}/media`, {
        method: 'POST',
        body: form,
      })
      if (res.status === 422) {
        setError(t('limitReached', { max: MAX_EXERCISE_MEDIA }))
        return
      }
      if (!res.ok) {
        setError(t('addError'))
        return
      }
      const created: ExerciseMedia = await res.json()
      setMedia((prev) => [...prev, created])
      router.refresh()
    } catch {
      setError(t('addError'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={media.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {media.map((item) => (
              <SortableMediaItem key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {atLimit ? (
        <p className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('limitReached', { max: MAX_EXERCISE_MEDIA })}
        </p>
      ) : (
        <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4">
          <h3 className="mb-3 text-sm font-semibold">{t('addMedia')}</h3>
          <div className="mb-3">
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('mediaType')}</label>
            <select
              name="mediaType"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as MediaType)}
              className="w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0A0A0A] px-3 py-2 text-white"
            >
              <option value="YOUTUBE">{t('youtube')}</option>
              <option value="VIDEO">{t('video')}</option>
              <option value="PHOTO">{t('photo')}</option>
              <option value="PDF">{t('pdf')}</option>
            </select>
          </div>
          {mediaType === 'YOUTUBE' ? (
            <form onSubmit={handleAddYoutube} className="flex gap-2">
              <Input
                name="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={uploading}>{t('add')}</Button>
            </form>
          ) : (
            <input
              type="file"
              accept={
                mediaType === 'VIDEO'
                  ? 'video/*'
                  : mediaType === 'PHOTO'
                  ? 'image/*'
                  : 'application/pdf'
              }
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-sm text-white"
            />
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
```

Add translation keys under `"exerciseDetail"` and `"mediaManager"`:
```json
{
  "exerciseDetail": {
    "name": "Name",
    "description": "Description",
    "trackingType": "Tracking type",
    "trackingWeight": "Weight",
    "trackingTime": "Time",
    "trackingNone": "None",
    "save": "Save",
    "saving": "Saving…",
    "saveError": "Failed to save",
    "delete": "Delete Exercise",
    "confirmDelete": "Confirm Delete",
    "deleting": "Deleting…",
    "cancel": "Cancel",
    "deleteError": "Failed to delete",
    "deleteBlockedError": "Cannot delete — exercise is referenced by session logs",
    "media": "Media"
  },
  "mediaManager": {
    "addMedia": "Add media",
    "mediaType": "Type",
    "youtube": "YouTube",
    "video": "Video",
    "photo": "Photo",
    "pdf": "PDF",
    "add": "Add",
    "remove": "Remove",
    "limitReached": "Maximum of {max} media items reached",
    "addError": "Failed to add media",
    "deleteError": "Failed to remove media"
  }
}
```

Commit: `feat: add trainer exercise detail page`

---

### Task 37: Training plan list + create

File: `src/app/(trainer)/trainer/plans/page.tsx`

```tsx
import { trainingPlanService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { CreatePlanModal } from './CreatePlanModal'

export default async function PlansPage() {
  const t = await getTranslations('plans')
  const plans = await trainingPlanService.list()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <CreatePlanModal />
      </div>

      {plans.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/trainer/plans/${plan.id}`}>
              <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
                <h2 className="font-display font-semibold">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{plan.description}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/plans/CreatePlanModal.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreatePlanModal() {
  const t = useTranslations('plans')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('createError'))
        return
      }
      setOpen(false)
      setName('')
      setDescription('')
      router.refresh()
    } catch {
      setError(t('createError'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>{t('newPlan')}</Button>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('newPlan')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('name')}</label>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('description')}</label>
            <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

`trainingPlanService.list()` must return `TrainingPlan[]` sorted by `createdAt` descending. Add this method to `TrainingPlanService` if not already present:

```ts
async list(): Promise<readonly TrainingPlan[]> {
  logger.info({ service: 'TrainingPlanService', operation: 'list' }, 'Listing training plans')
  return this.repo.findAll()
}
```

Add translation keys under `"plans"`:
```json
{
  "plans": {
    "title": "Training Plans",
    "empty": "No plans yet. Create your first one.",
    "newPlan": "New Plan",
    "name": "Name",
    "description": "Description (optional)",
    "save": "Save",
    "saving": "Saving…",
    "cancel": "Cancel",
    "createError": "Failed to create plan"
  }
}
```

Commit: `feat: add trainer plan list page`

---

### Task 38: Plan builder

File: `src/app/(trainer)/trainer/plans/[id]/page.tsx`

```tsx
import { trainingPlanService, exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PlanBuilder } from './PlanBuilder'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('planBuilder')
  const [plan, exercises] = await Promise.all([
    trainingPlanService.findWithItems(id),
    exerciseService.list(),
  ])
  if (!plan) notFound()

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{plan.name}</h1>
      {plan.description && (
        <p className="mb-6 text-[rgba(255,255,255,0.6)]">{plan.description}</p>
      )}
      <PlanBuilder plan={plan} allExercises={exercises} />
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx`

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddItemModal } from './AddItemModal'
import type { Exercise } from '@prisma/client'

interface PlanItemExercise {
  id: string
  exerciseId: string
  exercise: Exercise
  sets: number
  reps: number
  slot: number
}

interface PlanItem {
  id: string
  position: number
  exercises: PlanItemExercise[]
}

interface Plan {
  id: string
  name: string
  description?: string | null
  items: PlanItem[]
}

interface Props {
  plan: Plan
  allExercises: Exercise[]
}

function SortablePlanItem({
  item,
  onDelete,
}: {
  item: PlanItem
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const t = useTranslations('planBuilder')

  const isBiseries = item.exercises.length === 2
  const slot1 = item.exercises.find((e) => e.slot === 1)
  const slot2 = item.exercises.find((e) => e.slot === 2)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4"
    >
      <span
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab select-none text-[rgba(255,255,255,0.4)]"
      >
        ⠿
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgba(255,255,255,0.4)]">#{item.position}</span>
          <Badge variant={isBiseries ? 'accent' : 'default'}>
            {isBiseries ? t('biseries') : t('single')}
          </Badge>
        </div>
        {slot1 && (
          <p className="text-sm">
            <span className="font-semibold">{slot1.exercise.name}</span>
            <span className="ml-2 text-[rgba(255,255,255,0.6)]">
              {slot1.sets} × {slot1.reps}
            </span>
          </p>
        )}
        {slot2 && (
          <p className="text-sm">
            <span className="font-semibold">{slot2.exercise.name}</span>
            <span className="ml-2 text-[rgba(255,255,255,0.6)]">
              {slot2.sets} × {slot2.reps}
            </span>
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        {t('removeItem')}
      </button>
    </div>
  )
}

export function PlanBuilder({ plan, allExercises }: Props) {
  const t = useTranslations('planBuilder')
  const router = useRouter()
  const [items, setItems] = useState<PlanItem[]>(plan.items)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)
      setItems(reordered)
      await fetch(`/api/plans/${plan.id}/items/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      })
      router.refresh()
    },
    [items, plan.id, router],
  )

  async function handleDelete(itemId: string) {
    setError(null)
    const res = await fetch(`/api/plans/${plan.id}/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      setError(t('deleteItemError'))
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    router.refresh()
  }

  async function handleItemAdded() {
    setShowAddModal(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.length === 0 && (
              <p className="text-[rgba(255,255,255,0.4)]">{t('noItems')}</p>
            )}
            {items.map((item) => (
              <SortablePlanItem key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <Button onClick={() => setShowAddModal(true)}>{t('addItem')}</Button>
      </div>

      {showAddModal && (
        <AddItemModal
          planId={plan.id}
          allExercises={allExercises}
          nextPosition={items.length + 1}
          onSuccess={handleItemAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

interface Props {
  planId: string
  allExercises: Exercise[]
  nextPosition: number
  onSuccess: () => void
  onClose: () => void
}

interface ExercisePickerProps {
  placeholder: string
  exercises: Exercise[]
  value: string
  onChange: (id: string) => void
}

function ExercisePicker({ placeholder, exercises, value, onChange }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  )
  const selected = exercises.find((e) => e.id === value)

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={selected ? selected.name : query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && !selected && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A]">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.06)]"
              onClick={() => {
                onChange(ex.id)
                setQuery('')
                setOpen(false)
              }}
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AddItemModal({ planId, allExercises, nextPosition, onSuccess, onClose }: Props) {
  const t = useTranslations('planBuilder')
  const [type, setType] = useState<'single' | 'biseries'>('single')

  const [exerciseId1, setExerciseId1] = useState('')
  const [sets1, setSets1] = useState('3')
  const [reps1, setReps1] = useState('10')

  const [exerciseId2, setExerciseId2] = useState('')
  const [sets2, setSets2] = useState('3')
  const [reps2, setReps2] = useState('10')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!exerciseId1) {
      setError(t('slot1Required'))
      return
    }
    if (type === 'biseries' && !exerciseId2) {
      setError(t('slot2Required'))
      return
    }

    setSaving(true)
    try {
      const body =
        type === 'single'
          ? {
              position: nextPosition,
              exercises: [
                { exerciseId: exerciseId1, sets: Number(sets1), reps: Number(reps1), slot: 1 },
              ],
            }
          : {
              position: nextPosition,
              exercises: [
                { exerciseId: exerciseId1, sets: Number(sets1), reps: Number(reps1), slot: 1 },
                { exerciseId: exerciseId2, sets: Number(sets2), reps: Number(reps2), slot: 2 },
              ],
            }

      const res = await fetch(`/api/plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 422) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('slot1Required'))
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('addItemError'))
        return
      }
      onSuccess()
    } catch {
      setError(t('addItemError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('addItem')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('single')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                type === 'single'
                  ? 'bg-[#E85D26] text-white'
                  : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
              }`}
            >
              {t('single')}
            </button>
            <button
              type="button"
              onClick={() => setType('biseries')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                type === 'biseries'
                  ? 'bg-[#E85D26] text-white'
                  : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
              }`}
            >
              {t('biseries')}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-[rgba(255,255,255,0.6)]">
              {type === 'biseries' ? t('slot1Label') : t('exerciseLabel')}
            </p>
            <ExercisePicker
              placeholder={type === 'biseries' ? t('exercise1Placeholder') : t('exercisePlaceholder')}
              exercises={allExercises}
              value={exerciseId1}
              onChange={setExerciseId1}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                <Input name="sets1" type="number" min="1" value={sets1} onChange={(e) => setSets1(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('reps')}</label>
                <Input name="reps1" type="number" min="1" value={reps1} onChange={(e) => setReps1(e.target.value)} required />
              </div>
            </div>
          </div>

          {type === 'biseries' && (
            <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
              <p className="text-sm text-[rgba(255,255,255,0.6)]">{t('slot2Label')}</p>
              <ExercisePicker
                placeholder={t('exercise2Placeholder')}
                exercises={allExercises}
                value={exerciseId2}
                onChange={setExerciseId2}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                  <Input name="sets2" type="number" min="1" value={sets2} onChange={(e) => setSets2(e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('reps')}</label>
                  <Input name="reps2" type="number" min="1" value={reps2} onChange={(e) => setReps2(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? t('saving') : t('addItem')}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Add translation keys under `"planBuilder"`:
```json
{
  "planBuilder": {
    "addItem": "Add Item",
    "removeItem": "Remove",
    "single": "Single",
    "biseries": "Biseries",
    "noItems": "No items yet. Add the first one.",
    "exerciseLabel": "Exercise",
    "slot1Label": "Slot 1",
    "slot2Label": "Slot 2",
    "exercisePlaceholder": "Search exercise…",
    "exercise1Placeholder": "Exercise 1",
    "exercise2Placeholder": "Exercise 2",
    "sets": "Sets",
    "reps": "Reps",
    "save": "Save",
    "saving": "Saving…",
    "cancel": "Cancel",
    "slot1Required": "slot 1 exercise is required",
    "slot2Required": "Slot 2 exercise is required for biseries",
    "addItemError": "Failed to add item",
    "deleteItemError": "Failed to remove item"
  }
}
```

Commit: `feat: add trainer plan builder page`

---

### Task 39: Trainee management

File: `src/app/(trainer)/trainer/trainees/page.tsx`

```tsx
import { traineeService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { TraineeList } from './TraineeList'

export default async function TraineesPage() {
  const t = await getTranslations('trainees')
  const trainees = await traineeService.list()

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t('title')}</h1>
      <TraineeList initialTrainees={trainees} />
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/trainees/TraineeList.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { Trainee } from '@prisma/client'

interface Props {
  initialTrainees: Trainee[]
}

export function TraineeList({ initialTrainees }: Props) {
  const t = useTranslations('trainees')
  const router = useRouter()
  const [trainees, setTrainees] = useState<Trainee[]>(initialTrainees)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    try {
      const res = await fetch('/api/trainees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAddError(data.error ?? t('addError'))
        return
      }
      const created: Trainee = await res.json()
      setTrainees((prev) => [...prev, created])
      setNewName('')
      router.refresh()
    } catch {
      setAddError(t('addError'))
    } finally {
      setAdding(false)
    }
  }

  function startEdit(trainee: Trainee) {
    setEditingId(trainee.id)
    setEditName(trainee.name)
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch(`/api/trainees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    if (!res.ok) return
    const updated: Trainee = await res.json()
    setTrainees((prev) => prev.map((tr) => (tr.id === id ? updated : tr)))
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeleteErrors((prev) => ({ ...prev, [id]: '' }))
    const res = await fetch(`/api/trainees/${id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}))
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: data.error ?? t('deleteBlockedError'),
      }))
      return
    }
    if (!res.ok) {
      setDeleteErrors((prev) => ({ ...prev, [id]: t('deleteError') }))
      return
    }
    setTrainees((prev) => prev.filter((tr) => tr.id !== id))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="flex gap-3">
        <Input
          name="name"
          placeholder={t('namePlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={adding}>{adding ? t('adding') : t('add')}</Button>
      </form>
      {addError && <p className="text-sm text-red-400">{addError}</p>}

      {trainees.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {trainees.map((trainee) => (
            <Card key={trainee.id}>
              <div className="flex items-center gap-3">
                {editingId === trainee.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button onClick={() => handleSaveEdit(trainee.id)}>{t('save')}</Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>{t('cancel')}</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-semibold">{trainee.name}</span>
                    <Button variant="ghost" onClick={() => startEdit(trainee)}>{t('edit')}</Button>
                    <button
                      aria-label={t('deleteLabel', { name: trainee.name })}
                      onClick={() => handleDelete(trainee.id)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      {t('delete')}
                    </button>
                  </>
                )}
              </div>
              {deleteErrors[trainee.id] && (
                <p className="mt-2 text-sm text-red-400">{deleteErrors[trainee.id]}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

Add translation keys under `"trainees"`:
```json
{
  "trainees": {
    "title": "Trainees",
    "empty": "No trainees yet.",
    "namePlaceholder": "Trainee name",
    "add": "Add",
    "adding": "Adding…",
    "addError": "Failed to add trainee",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "deleteLabel": "Delete {name}",
    "deleteError": "Failed to delete",
    "deleteBlockedError": "Cannot delete — trainee has training sessions"
  }
}
```

Commit: `feat: add trainer trainee management page`

---

## Phase 8: Trainee Mode UI (Tasks 40–44)

### Task 40: Trainee home — pick who you are

File: `src/app/page.tsx`

```tsx
import { traineeService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export default async function HomePage() {
  const t = await getTranslations('home')
  const trainees = await traineeService.list()

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold">{t('greeting')}</h1>
      <p className="mb-8 text-[rgba(255,255,255,0.6)]">{t('subtitle')}</p>

      {trainees.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('noTrainees')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trainees.map((trainee) => (
            <Link key={trainee.id} href={`/trainee/${trainee.id}`}>
              <Card className="cursor-pointer py-6 transition-colors hover:border-[rgba(255,255,255,0.16)]">
                <p className="font-display text-2xl font-bold">{trainee.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

The mode toggle in `AppLayout` uses `ModeContext` (stored in `localStorage`). When the user switches to Trainer mode, the header navigates them to `/trainer`. The home page is always the trainee entry point. No server-side redirect is needed — the header `ModeToggle` component handles navigation client-side:

```tsx
// Relevant ModeToggle logic (already part of AppLayout from Task 30)
// When mode === 'trainer', ModeToggle shows "Switch to Trainee" and navigates to /trainer
// When mode === 'trainee', ModeToggle shows "Switch to Trainer" and navigates to /trainer
```

Add translation keys under `"home"`:
```json
{
  "home": {
    "greeting": "Who's training today?",
    "subtitle": "Pick your name to get started.",
    "noTrainees": "No trainees set up yet. Ask your trainer."
  }
}
```

Commit: `feat: add trainee home page`

---

### Task 41: Trainee dashboard

File: `src/app/(trainee)/trainee/[traineeId]/page.tsx`

```tsx
import { traineeService, trainingPlanService, exerciseService, sessionService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  params: Promise<{ traineeId: string }>
}

export default async function TraineeDashboardPage({ params }: Props) {
  const { traineeId } = await params
  const t = await getTranslations('traineeDashboard')

  const [trainee, plans, exercises, lastSession] = await Promise.all([
    traineeService.findById(traineeId),
    trainingPlanService.list(),
    exerciseService.list(),
    sessionService.findLastByTrainee(traineeId),
  ])

  if (!trainee) notFound()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold">{trainee.name}</h1>
        {lastSession && (
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.4)]">
            {t('lastSession', {
              date: new Date(lastSession.startedAt).toLocaleDateString(),
            })}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('startTraining')}</h2>
        {plans.length === 0 ? (
          <p className="text-[rgba(255,255,255,0.4)]">{t('noPlans')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/trainee/${traineeId}/session/${plan.id}`}>
                <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
                  <p className="font-display font-semibold">{plan.name}</p>
                  {plan.description && (
                    <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{plan.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('singleExercise')}</h2>
        <ExercisePicker traineeId={traineeId} exercises={exercises} />
      </section>
    </div>
  )
}
```

File: `src/app/(trainee)/trainee/[traineeId]/ExercisePicker.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

interface Props {
  traineeId: string
  exercises: Exercise[]
}

export function ExercisePicker({ traineeId, exercises }: Props) {
  const t = useTranslations('traineeDashboard')
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <Input
        placeholder={t('searchExercise')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3"
      />
      <div className="flex flex-col gap-2">
        {filtered.map((ex) => (
          <button
            key={ex.id}
            onClick={() => router.push(`/trainee/${traineeId}/exercise/${ex.id}`)}
            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-4 py-3 text-left font-semibold transition-colors hover:border-[rgba(255,255,255,0.16)]"
          >
            {ex.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

`sessionService.findLastByTrainee(traineeId)` returns the most recent `TrainingSession` for a trainee or `null`. Add this method to `SessionService` and `ISessionRepository`:

```ts
async findLastByTrainee(traineeId: string): Promise<TrainingSession | null> {
  return this.repo.findLastByTrainee(traineeId)
}
```

Add translation keys under `"traineeDashboard"`:
```json
{
  "traineeDashboard": {
    "lastSession": "Last session: {date}",
    "startTraining": "Start Training",
    "noPlans": "No training plans available yet.",
    "singleExercise": "Train Single Exercise",
    "searchExercise": "Search exercise…"
  }
}
```

Commit: `feat: add trainee dashboard page`

---

### Task 42: Training plan session

File: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/page.tsx`

```tsx
import { trainingPlanService, sessionService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PlanSessionRunner } from './PlanSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; planId: string }>
}

export default async function PlanSessionPage({ params }: Props) {
  const { traineeId, planId } = await params
  const plan = await trainingPlanService.findWithItems(planId)
  if (!plan) notFound()

  const session = await sessionService.create({ traineeId, planId })

  return <PlanSessionRunner plan={plan} session={session} traineeId={traineeId} />
}
```

File: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MediaStrip } from '@/components/MediaStrip'
import { SetLogger } from '@/components/SetLogger'
import { Button } from '@/components/ui/Button'
import type { Exercise, ExerciseMedia, TrainingSession } from '@prisma/client'

interface PlanItemExercise {
  id: string
  exerciseId: string
  exercise: Exercise & { media: ExerciseMedia[] }
  sets: number
  reps: number
  slot: number
}

interface PlanItem {
  id: string
  position: number
  exercises: PlanItemExercise[]
}

interface Plan {
  id: string
  name: string
  items: PlanItem[]
}

interface Props {
  plan: Plan
  session: TrainingSession
  traineeId: string
}

export function PlanSessionRunner({ plan, session, traineeId }: Props) {
  const t = useTranslations('sessionRunner')
  const router = useRouter()

  const [itemIndex, setItemIndex] = useState(0)
  const [setIndexPerSlot, setSetIndexPerSlot] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const currentItem = plan.items[itemIndex]

  function getSetIndex(slotKey: string) {
    return setIndexPerSlot[slotKey] ?? 0
  }

  async function handleMarkDone(
    exerciseId: string,
    planItemId: string,
    slot: number,
    sets: number,
    weightKg: number | null,
    repsDone: number | null,
  ) {
    setLogError(null)
    const slotKey = `${planItemId}-${slot}`
    const currentSet = getSetIndex(slotKey) + 1

    const res = await fetch(`/api/sessions/${session.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        planItemId,
        setNumber: currentSet,
        weightKg,
        repsDone,
      }),
    })

    if (!res.ok) {
      setLogError(t('logError'))
      return
    }

    const newSetIndex = currentSet
    setSetIndexPerSlot((prev) => ({ ...prev, [slotKey]: newSetIndex }))

    const allSlotsComplete = currentItem.exercises.every((ex) => {
      const key = `${currentItem.id}-${ex.slot}`
      const idx = ex.slot === slot ? newSetIndex : (setIndexPerSlot[key] ?? 0)
      return idx >= ex.sets
    })

    if (!allSlotsComplete) return

    if (itemIndex + 1 >= plan.items.length) {
      setDone(true)
      return
    }

    setItemIndex((prev) => prev + 1)
  }

  if (done) {
    router.push(
      `/trainee/${traineeId}/finish?sessionId=${session.id}&planId=${plan.id}`,
    )
    return null
  }

  if (!currentItem) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{plan.name}</h1>
        <span className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
        </span>
      </div>

      {currentItem.exercises.map((ex) => {
        const slotKey = `${currentItem.id}-${ex.slot}`
        const currentSet = getSetIndex(slotKey)
        const setsLeft = ex.sets - currentSet

        return (
          <div key={ex.id} className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">{ex.exercise.name}</h2>
              {ex.exercise.description && (
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{ex.exercise.description}</p>
              )}
            </div>

            {ex.exercise.media.length > 0 && (
              <MediaStrip media={ex.exercise.media} />
            )}

            {setsLeft > 0 && (
              <SetLogger
                label={t('setLabel', { current: currentSet + 1, total: ex.sets })}
                trackingType={ex.exercise.trackingType}
                onMarkDone={(weightKg, repsDone) =>
                  handleMarkDone(
                    ex.exerciseId,
                    currentItem.id,
                    ex.slot,
                    ex.sets,
                    weightKg,
                    repsDone,
                  )
                }
              />
            )}

            {setsLeft === 0 && (
              <p className="font-semibold text-[rgba(255,255,255,0.4)]">{t('allSetsDone')}</p>
            )}
          </div>
        )
      })}

      {logError && <p className="text-sm text-red-400">{logError}</p>}
    </div>
  )
}
```

`SetLogger` is a client component already defined in Task 30 context. Its interface:

```ts
interface SetLoggerProps {
  label: string              // e.g. "Set 1 of 3"
  trackingType: TrackingType
  onMarkDone: (weightKg: number | null, repsDone: number | null) => Promise<void>
}
```

`sessionService.create({ traineeId, planId })` is called as a server-side direct call on page load, not via HTTP. It must return the created `TrainingSession` with its `id`.

Add translation keys under `"sessionRunner"`:
```json
{
  "sessionRunner": {
    "itemProgress": "{current} of {total}",
    "setLabel": "Set {current} of {total}",
    "allSetsDone": "Done",
    "logError": "Failed to log set. Please try again.",
    "markDone": "Mark Done"
  }
}
```

Commit: `feat: add training plan session runner`

---

### Task 43: Single exercise session

File: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/page.tsx`

```tsx
import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ExerciseSessionRunner } from './ExerciseSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; exerciseId: string }>
}

export default async function SingleExerciseSessionPage({ params }: Props) {
  const { traineeId, exerciseId } = await params
  const exercise = await exerciseService.findWithMedia(exerciseId)
  if (!exercise) notFound()

  return <ExerciseSessionRunner exercise={exercise} traineeId={traineeId} />
}
```

File: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MediaStrip } from '@/components/MediaStrip'
import { SetLogger } from '@/components/SetLogger'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise, ExerciseMedia } from '@prisma/client'

interface Props {
  exercise: Exercise & { media: ExerciseMedia[] }
  traineeId: string
}

type Phase = 'setup' | 'running'

export function ExerciseSessionRunner({ exercise, traineeId }: Props) {
  const t = useTranslations('singleSession')
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('setup')
  const [targetSets, setTargetSets] = useState(3)
  const [targetReps, setTargetReps] = useState(10)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentSet, setCurrentSet] = useState(0)
  const [startError, setStartError] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setStartError(null)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traineeId }),
    })
    if (!res.ok) {
      setStartError(t('startError'))
      return
    }
    const session = await res.json()
    setSessionId(session.id)
    setPhase('running')
  }

  async function handleMarkDone(weightKg: number | null, repsDone: number | null) {
    if (!sessionId) return
    setLogError(null)
    const nextSet = currentSet + 1
    const res = await fetch(`/api/sessions/${sessionId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: exercise.id,
        planItemId: null,
        setNumber: nextSet,
        weightKg,
        repsDone,
      }),
    })
    if (!res.ok) {
      setLogError(t('logError'))
      return
    }
    if (nextSet >= targetSets) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}`)
      return
    }
    setCurrentSet(nextSet)
  }

  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
          {exercise.description && (
            <p className="mt-1 text-[rgba(255,255,255,0.6)]">{exercise.description}</p>
          )}
        </div>

        {exercise.media.length > 0 && <MediaStrip media={exercise.media} />}

        <form onSubmit={handleStart} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{t('setTarget')}</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('sets')}</label>
              <Input
                name="sets"
                type="number"
                min="1"
                value={targetSets}
                onChange={(e) => setTargetSets(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('reps')}</label>
              <Input
                name="reps"
                type="number"
                min="1"
                value={targetReps}
                onChange={(e) => setTargetReps(Number(e.target.value))}
                required
              />
            </div>
          </div>
          {startError && <p className="text-sm text-red-400">{startError}</p>}
          <Button type="submit">{t('start')}</Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
      </div>

      {exercise.media.length > 0 && <MediaStrip media={exercise.media} />}

      <SetLogger
        label={t('setLabel', { current: currentSet + 1, total: targetSets })}
        trackingType={exercise.trackingType}
        onMarkDone={handleMarkDone}
      />

      {logError && <p className="text-sm text-red-400">{logError}</p>}
    </div>
  )
}
```

Add translation keys under `"singleSession"`:
```json
{
  "singleSession": {
    "setTarget": "Set your target",
    "sets": "Sets",
    "reps": "Reps",
    "start": "Start",
    "startError": "Failed to start session",
    "setLabel": "Set {current} of {total}",
    "logError": "Failed to log set. Please try again."
  }
}
```

Commit: `feat: add single exercise session`

---

### Task 44: Session finish screen

File: `src/app/(trainee)/trainee/[traineeId]/finish/page.tsx`

```tsx
import { getTranslations } from 'next-intl/server'
import { FinishScreen } from './FinishScreen'

interface Props {
  params: Promise<{ traineeId: string }>
  searchParams: Promise<{ sessionId: string; planId?: string }>
}

export default async function FinishPage({ params, searchParams }: Props) {
  const { traineeId } = await params
  const { sessionId } = await searchParams

  return <FinishScreen traineeId={traineeId} sessionId={sessionId} />
}
```

File: `src/app/(trainee)/trainee/[traineeId]/finish/FinishScreen.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  traineeId: string
  sessionId: string
}

export function FinishScreen({ traineeId, sessionId }: Props) {
  const t = useTranslations('finish')
  const router = useRouter()
  const [calories, setCalories] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const body: { caloriesBurned?: number } = {}
      if (calories !== '') {
        body.caloriesBurned = Number(calories)
      }
      const res = await fetch(`/api/sessions/${sessionId}/finish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setError(t('saveError'))
        return
      }
      router.push(`/trainee/${traineeId}`)
    } catch {
      setError(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      <div>
        <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-[rgba(255,255,255,0.6)]">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSave} className="flex w-full max-w-xs flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm text-[rgba(255,255,255,0.6)]">
            {t('caloriesLabel')}
          </label>
          <Input
            name="calories"
            type="number"
            min="0"
            placeholder={t('caloriesPlaceholder')}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">{t('caloriesHint')}</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t('saving') : t('saveFinish')}
        </Button>
      </form>
    </div>
  )
}
```

Add translation keys under `"finish"`:
```json
{
  "finish": {
    "title": "Session Complete",
    "subtitle": "Great work!",
    "caloriesLabel": "Calories burned (optional)",
    "caloriesPlaceholder": "e.g. 320",
    "caloriesHint": "Enter the value from your Apple Watch",
    "saveFinish": "Save & Finish",
    "saving": "Saving…",
    "saveError": "Failed to save session"
  }
}
```

Commit: `feat: add session finish screen`

---

## Phase 9: E2E Tests (Tasks 45–47)

### Task 45: Playwright setup

File: `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'docker-compose -f docker-compose.test.yml up --wait',
    url: 'http://localhost:3000',
    reuseExistingServer: !!process.env.CI,
    timeout: 120000,
  },
})
```

File: `docker-compose.test.yml`

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: fitfamily_test
      POSTGRES_USER: fitfamily
      POSTGRES_PASSWORD: fitfamily
    networks: [internal]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fitfamily"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://fitfamily:fitfamily@db:5432/fitfamily_test
      MEDIA_PATH: /data/media
      NODE_ENV: production
    volumes:
      - test_media:/data/media
    depends_on:
      db:
        condition: service_healthy
    networks: [internal]

volumes:
  test_media:

networks:
  internal:
```

File: `tests/e2e/helpers/setup.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { TrackingType, MediaType } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ??
        'postgresql://fitfamily:fitfamily@localhost:5432/fitfamily_test',
    },
  },
})

export async function seedTrainee(data: { name: string }) {
  return prisma.trainee.create({ data })
}

export async function seedExercise(data: {
  name: string
  trackingType: TrackingType
  mediaCount?: number
}) {
  const { mediaCount = 0, ...rest } = data
  const exercise = await prisma.exercise.create({ data: rest })
  for (let i = 1; i <= mediaCount; i++) {
    await prisma.exerciseMedia.create({
      data: {
        exerciseId: exercise.id,
        type: 'PHOTO' as MediaType,
        filePath: `dummy/${i}.jpg`,
        position: i,
      },
    })
  }
  return exercise
}

export async function seedPlan(data: {
  name: string
  items: Array<{ exerciseId: string; sets: number; reps: number }>
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  for (let i = 0; i < data.items.length; i++) {
    const item = await prisma.trainingPlanItem.create({
      data: { planId: plan.id, position: i + 1 },
    })
    await prisma.trainingPlanItemExercise.create({
      data: {
        itemId: item.id,
        exerciseId: data.items[i].exerciseId,
        sets: data.items[i].sets,
        reps: data.items[i].reps,
        slot: 1,
      },
    })
  }
  return plan
}

export async function seedSession(data: {
  traineeId: string
  exerciseId?: string
  planId?: string
}) {
  const session = await prisma.trainingSession.create({
    data: {
      traineeId: data.traineeId,
      planId: data.planId ?? null,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  })
  if (data.exerciseId) {
    await prisma.trainingSessionLog.create({
      data: {
        sessionId: session.id,
        exerciseId: data.exerciseId,
        setNumber: 1,
        weightKg: 50,
        repsDone: 8,
      },
    })
  }
  return session
}
```

Commit: `feat: add Playwright config and test Docker Compose`

---

### Task 46: Golden path E2E tests

File: `tests/e2e/trainer.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainer — Exercise management', () => {
  test('creates exercise with media', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Switch to Trainer')
    await page.goto('/trainer/exercises')

    await page.click('text=New Exercise')
    await page.fill('[name=name]', 'Barbell Squat')
    await page.fill('[name=description]', 'Compound leg exercise')
    await page.selectOption('[name=trackingType]', 'WEIGHT')
    await page.click('text=Save')

    await expect(page.locator('text=Barbell Squat')).toBeVisible()

    await page.click('text=Barbell Squat')
    await page.click('text=Add media')
    await page.selectOption('[name=mediaType]', 'YOUTUBE')
    await page.fill('[name=url]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('text=Add')
    await expect(page.locator('iframe')).toBeVisible()
  })

  test('creates training plan with biseries', async ({ page }) => {
    await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    await seedExercise({ name: 'Lunge', trackingType: 'WEIGHT' })

    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('[name=name]', 'Leg Day')
    await page.click('text=Save')
    await page.click('text=Leg Day')

    await page.click('text=Add Item')
    await page.click('text=Biseries')
    await page.fill('[placeholder="Exercise 1"]', 'Squat')
    await page.click('text=Squat')
    await page.fill('[name=sets1]', '3')
    await page.fill('[name=reps1]', '10')
    await page.fill('[placeholder="Exercise 2"]', 'Lunge')
    await page.click('text=Lunge')
    await page.fill('[name=sets2]', '3')
    await page.fill('[name=reps2]', '12')
    await page.click('text=Add Item')

    await expect(page.locator('text=Squat')).toBeVisible()
    await expect(page.locator('text=Lunge')).toBeVisible()
    await expect(page.locator('text=BISERIES')).toBeVisible()
  })
})
```

File: `tests/e2e/trainee.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainee — Full plan session', () => {
  test('runs full training plan and logs sets', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Test User' })
    const exercise = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await seedPlan({
      name: 'Push Day',
      items: [{ exerciseId: exercise.id, sets: 2, reps: 8 }],
    })

    await page.goto('/')
    await expect(page.locator('text=Test User')).toBeVisible()
    await page.click('text=Test User')
    await page.click('text=Push Day')

    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Set 1 of 2')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.fill('[name=repsDone]', '8')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Session Complete')).toBeVisible()
    await page.fill('[name=calories]', '320')
    await page.click('text=Save & Finish')

    await expect(page).toHaveURL(`/trainee/${trainee.id}`)
  })

  test('trains single exercise outside a plan', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Solo User' })
    await seedExercise({ name: 'Pull-up', trackingType: 'NONE' })

    await page.goto('/')
    await page.click('text=Solo User')
    await page.click('text=Train Single Exercise')
    await page.click('text=Pull-up')

    await page.fill('[name=sets]', '3')
    await page.fill('[name=reps]', '8')
    await page.click('text=Start')

    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`text=Set ${i} of 3`)).toBeVisible()
      await page.click('text=Mark Done')
    }

    await page.click('text=Save & Finish')
    await expect(page).toHaveURL(`/trainee/${trainee.id}`)
  })
})
```

Commit: `test: add golden path E2E tests`

---

### Task 47: Failure path E2E tests

File: `tests/e2e/failure-paths.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan, seedSession } from './helpers/setup'

test.describe('Failure paths', () => {
  test('cannot delete exercise that is in use', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Active User' })
    const exercise = await seedExercise({ name: 'In-Use Exercise', trackingType: 'WEIGHT' })
    await seedSession({ traineeId: trainee.id, exerciseId: exercise.id })

    await page.goto('/trainer/exercises')
    await page.click('text=In-Use Exercise')
    await page.click('text=Delete Exercise')
    await page.click('text=Confirm Delete')

    await expect(page.locator('text=Cannot delete')).toBeVisible()
    await expect(page.locator('text=In-Use Exercise')).toBeVisible()
  })

  test('cannot delete trainee with sessions', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Busy Trainee' })
    await seedSession({ traineeId: trainee.id })

    await page.goto('/trainer/trainees')
    await page.click(`[aria-label="Delete Busy Trainee"]`)
    await page.click('text=Confirm')

    await expect(page.locator('text=Cannot delete')).toBeVisible()
  })

  test('media upload blocked after 10 items', async ({ page }) => {
    const exercise = await seedExercise({
      name: 'Full Media Exercise',
      trackingType: 'WEIGHT',
      mediaCount: 10,
    })

    await page.goto(`/trainer/exercises/${exercise.id}`)

    await expect(page.locator('text=maximum')).toBeVisible()
    await expect(page.locator('button:has-text("Add")')).toBeDisabled()
  })

  test('biseries item requires slot 1 before slot 2', async ({ page }) => {
    const plan = await seedPlan({ name: 'Test Plan', items: [] })
    await seedExercise({ name: 'Exercise A', trackingType: 'WEIGHT' })

    await page.goto(`/trainer/plans/${plan.id}`)
    await page.click('text=Add Item')
    await page.click('text=Biseries')
    await page.fill('[placeholder="Exercise 2"]', 'Exercise A')
    await page.click('text=Exercise A')
    await page.click('text=Add Item')

    await expect(page.locator('text=slot 1')).toBeVisible()
  })

  test('PWA manifest and service worker present', async ({ page }) => {
    await page.goto('/')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    const manifestResponse = await page.request.get('/manifest.json')
    const manifest = await manifestResponse.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#E85D26')
  })
})
```

Commit: `test: add failure path and edge case E2E tests`
