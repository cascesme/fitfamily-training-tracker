# Users, Profiles & Authorization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk-based Google-only authentication with an email allowlist, trainer/trainee roles, and automatic trainee identity resolution from auth — replacing the current client-side mode toggle.

**Architecture:** Clerk handles Google OAuth, sessions, and user storage. On first sign-in, a `user.created` webhook fires and checks the `AllowedUser` DB table, sets `publicMetadata.role` on the Clerk user, and links `clerkUserId` to the `Trainee` record. Subsequent requests read role from the JWT (zero DB hit). A `/auth/pending` polling page handles the webhook race condition on first sign-in.

**Tech Stack:** `@clerk/nextjs@^6`, `svix@^1` (webhook verification), Prisma transactions for atomic AllowedUser + Trainee creation.

## Global Constraints

- Node via nvm: prefix commands with full path or source nvm. Use `~/.nvm/versions/node/v24.1.0/bin/npx` for all `npx` calls.
- All user-facing strings go in `src/i18n/en.json` — zero hardcoded UI text.
- API routes call one service method and return. Zero business logic in routes.
- Repositories are the ONLY files that import Prisma. Services never import Prisma directly.
- `src/lib/api/handleError.ts` catches ALL API route errors — no ad-hoc NextResponse in catch blocks.
- `src/lib/api/services.ts` is the DI root — never construct services/repos inline in routes.
- TDD: write failing test first, make it pass, then refactor.
- Commit after each task passes its tests.
- Before adding any library: web-search for the latest stable version compatible with Next.js 15 / Node LTS / TypeScript 5 / Prisma latest. Never assume a version from memory.
- Dark theme only. Background `#0A0A0A` / `#111111`. Primary accent `#E85D26`.
- Run `npm run typecheck && npm run lint` before each commit.

---

## File Map

**New:**
- `prisma/seed.ts` — seeds trainer emails into AllowedUser table
- `src/types/clerk.d.ts` — augments Clerk types so `publicMetadata.role` is typed
- `src/middleware.ts` — Clerk route protection
- `src/app/sign-in/[[...sign-in]]/page.tsx` — Clerk SignIn page
- `src/app/auth/pending/page.tsx` — server component polling for role after first sign-in
- `src/app/auth/pending/PendingClient.tsx` — client component that calls router.refresh() every 2s
- `src/app/access-denied/page.tsx` — shown to non-allowlisted users
- `src/app/api/webhooks/clerk/route.ts` — handles user.created: sets role, links trainee
- `src/lib/domain/allowedUser.ts` — AllowedUser types, Zod schema, IAllowedUserRepository interface
- `src/lib/repositories/AllowedUserRepository.ts` — Prisma implementation
- `src/lib/services/AllowedUserService.ts` — findByEmail (used by webhook)
- `src/lib/api/auth.ts` — server-side helpers: requireTrainerRole(), resolveAuthTrainee()
- `tests/unit/domain/allowedUser.test.ts`
- `tests/unit/services/AllowedUserService.test.ts`
- `tests/integration/repositories/AllowedUserRepository.test.ts`
- `tests/integration/webhook/clerk.test.ts`

**Modified:**
- `prisma/schema.prisma` — add Role enum, AllowedUser model, add email/clerkUserId to Trainee
- `package.json` — add @clerk/nextjs, svix; add prisma.seed script
- `.env.example` — add Clerk env vars
- `src/lib/domain/trainee.ts` — add email to CreateTraineeSchema; add findByClerkUserId, findByEmail, createWithAllowedUser, linkClerkUser to ITraineeRepository
- `src/lib/repositories/TraineeRepository.ts` — implement new interface methods; createWithAllowedUser uses $transaction
- `src/lib/services/TraineeService.ts` — update create() to accept email; add findByClerkUserId(); add linkClerkUserByEmail()
- `src/lib/errors.ts` — add ForbiddenError
- `src/lib/api/handleError.ts` — handle ForbiddenError → 403
- `src/lib/api/services.ts` — add allowedUserService singleton
- `src/app/layout.tsx` — wrap with ClerkProvider, remove ModeProvider
- `src/components/layout/Header.tsx` — replace mode toggle with UserButton
- `src/app/page.tsx` — replace trainee selector with role-based redirect
- `src/app/(trainer)/trainer/trainees/TraineeList.tsx` — add email input + display
- `src/app/(trainee)/trainee/[traineeId]/page.tsx` — add auth guard
- `src/app/(trainee)/trainee/[traineeId]/session/[planId]/page.tsx` — add auth guard
- `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/page.tsx` — add auth guard
- `src/app/(trainee)/trainee/[traineeId]/finish/page.tsx` — add auth guard
- `src/app/api/trainees/route.ts` — trainer-only guard; updated POST schema (email required)
- `src/app/api/trainees/[id]/route.ts` — trainer-only guard
- `src/i18n/en.json` — add auth keys (signIn, accessDenied, pending); remove mode keys
- `tests/unit/services/TraineeService.test.ts` — update mocks + create() signature
- `tests/unit/domain/trainee.test.ts` — add email field tests
- `tests/e2e/helpers/setup.ts` — update cleanDatabase(); add seedAllowedUser()
- `tests/e2e/mode-switch.spec.ts` — delete (feature removed)

**Deleted:**
- `src/lib/context/ModeContext.tsx`

---

### Task 1: Install Clerk packages + env vars

**Files:**
- Modify: `package.json`
- Create: `.env.example` (if not exists, or modify)

**Interfaces:**
- Produces: `@clerk/nextjs` and `svix` available in all subsequent tasks

- [ ] **Step 1: Web-search for latest versions**

  Search: "clerk nextjs latest version npm 2025" and "svix npm latest". Confirm compatibility with Next.js 15. Record exact versions found.

- [ ] **Step 2: Install packages**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm install @clerk/nextjs svix
  ```

  Verify both appear in `package.json` `dependencies` with pinned versions.

- [ ] **Step 3: Add prisma seed script to package.json**

  In `package.json`, add (or merge into existing) `"prisma"` key at the top level:

  ```json
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
  ```

  Also add `tsx` as a devDependency:

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm install --save-dev tsx
  ```

- [ ] **Step 4: Add Clerk env vars to .env.example (or .env.local)**

  Create/update `.env.example` with:

  ```
  # Clerk Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  CLERK_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
  ```

  Also add these to your local `.env` file with real values from the Clerk dashboard. Create a Clerk project if you haven't. Set it to Google-only OAuth, restricted mode (allowlist enabled).

- [ ] **Step 5: Typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck
  ```

  Expected: PASS (no new types imported yet)

- [ ] **Step 6: Commit**

  ```bash
  git add package.json package-lock.json .env.example
  git commit -m "feat(auth): install @clerk/nextjs and svix packages"
  ```

---

### Task 2: Prisma schema + migration + seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json` (prisma.seed already added in Task 1)
- Create: `tests/integration/seed.test.ts`

**Interfaces:**
- Produces: `AllowedUser` model, `Role` enum, `Trainee.email`, `Trainee.clerkUserId` available to all subsequent tasks

- [ ] **Step 1: Write failing seed idempotency integration test**

  Create `tests/integration/seed.test.ts`:

  ```ts
  import { setupTestDb, teardownTestDb, type TestDb } from './helpers/db'
  import { runSeed } from '../../prisma/seed'

  let db: TestDb

  beforeAll(async () => { db = await setupTestDb() })
  afterAll(async () => { await teardownTestDb(db) })

  describe('seed', () => {
    it('runs without error', async () => {
      await expect(runSeed(db.prisma)).resolves.toBeUndefined()
    })

    it('is idempotent — second run does not throw or duplicate', async () => {
      await runSeed(db.prisma)
      await runSeed(db.prisma)
      const count = await db.prisma.allowedUser.count()
      expect(count).toBe(1)
    })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects integration -- tests/integration/seed.test.ts
  ```

  Expected: FAIL — `Cannot find module '../../prisma/seed'` and `allowedUser` model not found.

- [ ] **Step 3: Update prisma/schema.prisma**

  Add `Role` enum and `AllowedUser` model. Add `email` and `clerkUserId` to `Trainee`. Full updated schema:

  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
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

  enum Role {
    trainer
    trainee
  }

  model AllowedUser {
    id        String   @id @default(cuid())
    email     String   @unique
    role      Role
    createdAt DateTime @default(now())
  }

  model Trainee {
    id          String            @id @default(cuid())
    name        String
    email       String            @unique
    clerkUserId String?           @unique
    createdAt   DateTime          @default(now())
    updatedAt   DateTime          @updatedAt
    sessions    TrainingSession[]
  }

  model Exercise {
    id           String                     @id @default(cuid())
    name         String
    description  String?
    trackingType TrackingType               @default(WEIGHT)
    createdAt    DateTime                   @default(now())
    updatedAt    DateTime                   @updatedAt
    media        ExerciseMedia[]
    planItems    TrainingPlanItemExercise[]  @relation("PrimaryExercise")
    alternativePlanItems TrainingPlanItemExercise[] @relation("AlternativeExercise")
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
    id           String                     @id @default(cuid())
    planId       String
    plan         TrainingPlan               @relation(fields: [planId], references: [id])
    position     Int
    isTabata     Boolean                    @default(false)
    workTimeSecs Int?
    restTimeSecs Int?
    exercises    TrainingPlanItemExercise[]

    @@unique([planId, position])
  }

  model TrainingPlanItemExercise {
    id         String           @id @default(cuid())
    itemId     String
    item       TrainingPlanItem @relation(fields: [itemId], references: [id])
    exerciseId String
    exercise   Exercise         @relation(fields: [exerciseId], references: [id], name: "PrimaryExercise")
    sets       Int
    reps       Int
    order      Int

    alternativeExerciseId String?
    alternativeExercise   Exercise? @relation(fields: [alternativeExerciseId], references: [id], name: "AlternativeExercise", onDelete: SetNull)
    alternativeSets       Int?
    alternativeReps       Int?

    @@unique([itemId, order])
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

- [ ] **Step 4: Run Prisma migration**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx prisma migrate dev --name add-auth-alloweduser-trainee-email
  ```

  Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 5: Create prisma/seed.ts**

  ```ts
  import { PrismaClient } from '@prisma/client'

  // Replace these with real trainer emails before deploying
  const TRAINER_EMAILS: string[] = [
    'trainer@example.com',
  ]

  export async function runSeed(prisma: PrismaClient): Promise<void> {
    await prisma.allowedUser.createMany({
      data: TRAINER_EMAILS.map((email) => ({ email, role: 'trainer' as const })),
      skipDuplicates: true,
    })
  }

  const prisma = new PrismaClient()
  runSeed(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
  ```

- [ ] **Step 6: Run test to verify it passes**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects integration -- tests/integration/seed.test.ts
  ```

  Expected: PASS — 2 tests.

- [ ] **Step 7: Typecheck + lint**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  ```

  Expected: PASS

- [ ] **Step 8: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts package.json tests/integration/seed.test.ts
  git commit -m "feat(auth): add AllowedUser model, Role enum, email/clerkUserId to Trainee"
  ```

---

### Task 3: AllowedUser domain + repository + service + tests

**Files:**
- Create: `src/lib/domain/allowedUser.ts`
- Create: `src/lib/repositories/AllowedUserRepository.ts`
- Create: `src/lib/services/AllowedUserService.ts`
- Create: `tests/unit/domain/allowedUser.test.ts`
- Create: `tests/unit/services/AllowedUserService.test.ts`
- Create: `tests/integration/repositories/AllowedUserRepository.test.ts`

**Interfaces:**
- Consumes: `AllowedUser` Prisma model (from Task 2)
- Produces:
  - `IAllowedUserRepository` with `findByEmail(email: string): Promise<AllowedUser | null>` and `create(data: { email: string; role: 'trainer' | 'trainee' }): Promise<AllowedUser>`
  - `AllowedUserService` with `findByEmail(email: string): Promise<AllowedUser | null>`
  - Both exported and used in Task 5 (DI), Task 8 (webhook)

- [ ] **Step 1: Write failing unit tests**

  Create `tests/unit/domain/allowedUser.test.ts`:

  ```ts
  import { CreateAllowedUserSchema } from '@/lib/domain/allowedUser'

  describe('CreateAllowedUserSchema', () => {
    it('accepts valid email + trainer role', () => {
      const result = CreateAllowedUserSchema.safeParse({ email: 'alice@example.com', role: 'trainer' })
      expect(result.success).toBe(true)
    })

    it('accepts valid email + trainee role', () => {
      const result = CreateAllowedUserSchema.safeParse({ email: 'bob@example.com', role: 'trainee' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = CreateAllowedUserSchema.safeParse({ email: 'not-an-email', role: 'trainer' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid role', () => {
      const result = CreateAllowedUserSchema.safeParse({ email: 'alice@example.com', role: 'admin' })
      expect(result.success).toBe(false)
    })
  })
  ```

  Create `tests/unit/services/AllowedUserService.test.ts`:

  ```ts
  import { AllowedUserService } from '@/lib/services/AllowedUserService'
  import type { IAllowedUserRepository } from '@/lib/domain/allowedUser'

  const mockRepo: jest.Mocked<IAllowedUserRepository> = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  }

  beforeEach(() => { jest.clearAllMocks() })

  const service = new AllowedUserService(mockRepo)

  const baseAllowedUser = {
    id: 'au1',
    email: 'alice@example.com',
    role: 'trainer' as const,
    createdAt: new Date(),
  }

  describe('AllowedUserService', () => {
    describe('findByEmail', () => {
      it('returns allowed user when found', async () => {
        mockRepo.findByEmail.mockResolvedValue(baseAllowedUser)
        const result = await service.findByEmail('alice@example.com')
        expect(result).toEqual(baseAllowedUser)
      })

      it('returns null when not found', async () => {
        mockRepo.findByEmail.mockResolvedValue(null)
        const result = await service.findByEmail('unknown@example.com')
        expect(result).toBeNull()
      })
    })
  })
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/allowedUser.test.ts tests/unit/services/AllowedUserService.test.ts
  ```

  Expected: FAIL — `Cannot find module '@/lib/domain/allowedUser'`

- [ ] **Step 3: Create src/lib/domain/allowedUser.ts**

  ```ts
  import { z } from 'zod'
  import type { AllowedUser as PrismaAllowedUser } from '@prisma/client'

  export type AllowedUser = PrismaAllowedUser

  export const CreateAllowedUserSchema = z.object({
    email: z.string().email(),
    role: z.enum(['trainer', 'trainee']),
  })
  export type CreateAllowedUserInput = z.infer<typeof CreateAllowedUserSchema>

  export interface IAllowedUserRepository {
    findByEmail(email: string): Promise<AllowedUser | null>
    create(data: CreateAllowedUserInput): Promise<AllowedUser>
  }
  ```

- [ ] **Step 4: Create src/lib/repositories/AllowedUserRepository.ts**

  ```ts
  import { PrismaClient } from '@prisma/client'
  import type { IAllowedUserRepository, CreateAllowedUserInput, AllowedUser } from '@/lib/domain/allowedUser'

  export class AllowedUserRepository implements IAllowedUserRepository {
    constructor(private prisma: PrismaClient) {}

    findByEmail(email: string): Promise<AllowedUser | null> {
      return this.prisma.allowedUser.findUnique({ where: { email } })
    }

    create(data: CreateAllowedUserInput): Promise<AllowedUser> {
      return this.prisma.allowedUser.create({ data })
    }
  }
  ```

- [ ] **Step 5: Create src/lib/services/AllowedUserService.ts**

  ```ts
  import type { IAllowedUserRepository, AllowedUser } from '@/lib/domain/allowedUser'

  export class AllowedUserService {
    constructor(private repo: IAllowedUserRepository) {}

    findByEmail(email: string): Promise<AllowedUser | null> {
      return this.repo.findByEmail(email)
    }
  }
  ```

- [ ] **Step 6: Run unit tests to verify they pass**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/allowedUser.test.ts tests/unit/services/AllowedUserService.test.ts
  ```

  Expected: PASS — 5 tests.

- [ ] **Step 7: Write integration test**

  Create `tests/integration/repositories/AllowedUserRepository.test.ts`:

  ```ts
  import { AllowedUserRepository } from '@/lib/repositories/AllowedUserRepository'
  import { setupTestDb, teardownTestDb, type TestDb } from '../helpers/db'

  let db: TestDb
  let repo: AllowedUserRepository

  beforeAll(async () => { db = await setupTestDb() })
  afterAll(async () => { await teardownTestDb(db) })

  beforeEach(async () => {
    repo = new AllowedUserRepository(db.prisma)
    await db.prisma.allowedUser.deleteMany()
  })

  describe('AllowedUserRepository', () => {
    it('creates an allowed user', async () => {
      const au = await repo.create({ email: 'alice@example.com', role: 'trainer' })
      expect(au.id).toBeDefined()
      expect(au.email).toBe('alice@example.com')
      expect(au.role).toBe('trainer')
    })

    it('findByEmail returns user when found', async () => {
      await repo.create({ email: 'alice@example.com', role: 'trainee' })
      const found = await repo.findByEmail('alice@example.com')
      expect(found?.email).toBe('alice@example.com')
    })

    it('findByEmail returns null when not found', async () => {
      const found = await repo.findByEmail('nobody@example.com')
      expect(found).toBeNull()
    })

    it('enforces unique email constraint', async () => {
      await repo.create({ email: 'alice@example.com', role: 'trainer' })
      await expect(repo.create({ email: 'alice@example.com', role: 'trainee' })).rejects.toThrow()
    })
  })
  ```

- [ ] **Step 8: Run integration test**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects integration -- tests/integration/repositories/AllowedUserRepository.test.ts
  ```

  Expected: PASS — 4 tests.

- [ ] **Step 9: Typecheck + lint + commit**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  git add src/lib/domain/allowedUser.ts src/lib/repositories/AllowedUserRepository.ts src/lib/services/AllowedUserService.ts tests/unit/domain/allowedUser.test.ts tests/unit/services/AllowedUserService.test.ts tests/integration/repositories/AllowedUserRepository.test.ts
  git commit -m "feat(auth): AllowedUser domain, repository, and service"
  ```

---

### Task 4: Update Trainee domain + repository + service + tests

**Files:**
- Modify: `src/lib/domain/trainee.ts`
- Modify: `src/lib/repositories/TraineeRepository.ts`
- Modify: `src/lib/services/TraineeService.ts`
- Modify: `tests/unit/services/TraineeService.test.ts`
- Modify: `tests/unit/domain/trainee.test.ts`
- Modify: `tests/integration/repositories/TraineeRepository.test.ts`

**Interfaces:**
- Consumes: updated `Trainee` Prisma model with `email`, `clerkUserId` (Task 2)
- Produces:
  - `CreateTraineeSchema` now requires `email: string`
  - `ITraineeRepository` adds: `findByClerkUserId`, `findByEmail`, `createWithAllowedUser`, `linkClerkUser`
  - `TraineeService` adds: `findByClerkUserId()`, `linkClerkUserByEmail()`; `create()` calls `createWithAllowedUser`
  - Used by Task 5 (DI), Task 8 (webhook), Task 9 (auth guards)

- [ ] **Step 1: Update failing unit tests for trainee domain**

  In `tests/unit/domain/trainee.test.ts`, update `CreateTraineeSchema` tests to include email:

  ```ts
  import { CreateTraineeSchema, UpdateTraineeSchema } from '@/lib/domain/trainee'

  describe('CreateTraineeSchema', () => {
    it('accepts valid name and email', () => {
      const result = CreateTraineeSchema.safeParse({ name: 'Alex', email: 'alex@example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = CreateTraineeSchema.safeParse({ name: '', email: 'alex@example.com' })
      expect(result.success).toBe(false)
    })

    it('rejects name longer than 100 chars', () => {
      const result = CreateTraineeSchema.safeParse({ name: 'a'.repeat(101), email: 'alex@example.com' })
      expect(result.success).toBe(false)
    })

    it('rejects missing name field', () => {
      const result = CreateTraineeSchema.safeParse({ email: 'alex@example.com' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
      const result = CreateTraineeSchema.safeParse({ name: 'Alex', email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rejects missing email', () => {
      const result = CreateTraineeSchema.safeParse({ name: 'Alex' })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateTraineeSchema', () => {
    it('accepts partial input with just name', () => {
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

- [ ] **Step 2: Update TraineeService unit tests**

  Replace the full contents of `tests/unit/services/TraineeService.test.ts`:

  ```ts
  import { TraineeService } from '@/lib/services/TraineeService'
  import type { ITraineeRepository } from '@/lib/domain/trainee'
  import { DeleteBlockedError, NotFoundError } from '@/lib/errors'

  const mockRepo: jest.Mocked<ITraineeRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByClerkUserId: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    createWithAllowedUser: jest.fn(),
    linkClerkUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasSessions: jest.fn(),
  }

  beforeEach(() => { jest.clearAllMocks() })

  const service = new TraineeService(mockRepo)

  const baseTrainee = {
    id: 't1',
    name: 'Alice',
    email: 'alice@example.com',
    clerkUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('TraineeService', () => {
    describe('create', () => {
      it('creates trainee + allowedUser via createWithAllowedUser', async () => {
        mockRepo.createWithAllowedUser.mockResolvedValue(baseTrainee)
        const result = await service.create({ name: 'Alice', email: 'alice@example.com' })
        expect(mockRepo.createWithAllowedUser).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@example.com' })
        expect(result).toEqual(baseTrainee)
      })
    })

    describe('findByClerkUserId', () => {
      it('returns trainee when found', async () => {
        mockRepo.findByClerkUserId.mockResolvedValue(baseTrainee)
        const result = await service.findByClerkUserId('clerk_123')
        expect(result).toEqual(baseTrainee)
      })

      it('returns null when not found', async () => {
        mockRepo.findByClerkUserId.mockResolvedValue(null)
        const result = await service.findByClerkUserId('clerk_unknown')
        expect(result).toBeNull()
      })
    })

    describe('linkClerkUserByEmail', () => {
      it('links clerkUserId to trainee by email', async () => {
        mockRepo.linkClerkUser.mockResolvedValue(undefined)
        await service.linkClerkUserByEmail('alice@example.com', 'clerk_123')
        expect(mockRepo.linkClerkUser).toHaveBeenCalledWith('alice@example.com', 'clerk_123')
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
      })
    })
  })
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/trainee.test.ts tests/unit/services/TraineeService.test.ts
  ```

  Expected: FAIL — schema missing email, service missing new methods.

- [ ] **Step 4: Update src/lib/domain/trainee.ts**

  ```ts
  import { z } from 'zod'
  import type { Trainee as PrismaTrainee } from '@prisma/client'

  export type Trainee = PrismaTrainee

  export const CreateTraineeSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
  })
  export type CreateTraineeInput = z.infer<typeof CreateTraineeSchema>

  export const UpdateTraineeSchema = z.object({ name: z.string().min(1).max(100) }).partial()
  export type UpdateTraineeInput = z.infer<typeof UpdateTraineeSchema>

  export interface ITraineeRepository {
    findAll(): Promise<Trainee[]>
    findById(id: string): Promise<Trainee | null>
    findByClerkUserId(clerkUserId: string): Promise<Trainee | null>
    findByEmail(email: string): Promise<Trainee | null>
    create(data: CreateTraineeInput): Promise<Trainee>
    createWithAllowedUser(data: CreateTraineeInput): Promise<Trainee>
    linkClerkUser(email: string, clerkUserId: string): Promise<void>
    update(id: string, data: UpdateTraineeInput): Promise<Trainee>
    delete(id: string): Promise<void>
    hasSessions(id: string): Promise<boolean>
  }
  ```

- [ ] **Step 5: Update src/lib/repositories/TraineeRepository.ts**

  ```ts
  import { PrismaClient } from '@prisma/client'
  import type {
    ITraineeRepository,
    CreateTraineeInput,
    UpdateTraineeInput,
    Trainee,
  } from '@/lib/domain/trainee'

  export class TraineeRepository implements ITraineeRepository {
    constructor(private prisma: PrismaClient) {}

    findAll(): Promise<Trainee[]> {
      return this.prisma.trainee.findMany({ orderBy: { name: 'asc' } })
    }

    findById(id: string): Promise<Trainee | null> {
      return this.prisma.trainee.findUnique({ where: { id } })
    }

    findByClerkUserId(clerkUserId: string): Promise<Trainee | null> {
      return this.prisma.trainee.findUnique({ where: { clerkUserId } })
    }

    findByEmail(email: string): Promise<Trainee | null> {
      return this.prisma.trainee.findUnique({ where: { email } })
    }

    create(data: CreateTraineeInput): Promise<Trainee> {
      return this.prisma.trainee.create({ data })
    }

    async createWithAllowedUser(data: CreateTraineeInput): Promise<Trainee> {
      return this.prisma.$transaction(async (tx) => {
        await tx.allowedUser.create({ data: { email: data.email, role: 'trainee' } })
        return tx.trainee.create({ data: { name: data.name, email: data.email } })
      })
    }

    async linkClerkUser(email: string, clerkUserId: string): Promise<void> {
      await this.prisma.trainee.update({ where: { email }, data: { clerkUserId } })
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

- [ ] **Step 6: Update src/lib/services/TraineeService.ts**

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

    findByClerkUserId(clerkUserId: string): Promise<Trainee | null> {
      return this.repo.findByClerkUserId(clerkUserId)
    }

    async create(data: CreateTraineeInput): Promise<Trainee> {
      logger.info({ service: 'TraineeService', operation: 'create' }, 'Creating trainee')
      const trainee = await this.repo.createWithAllowedUser(data)
      logger.info({ service: 'TraineeService', operation: 'create', entityId: trainee.id, outcome: 'created' }, 'Trainee created')
      return trainee
    }

    async linkClerkUserByEmail(email: string, clerkUserId: string): Promise<void> {
      logger.info({ service: 'TraineeService', operation: 'linkClerkUser', entityId: email }, 'Linking Clerk user to trainee')
      await this.repo.linkClerkUser(email, clerkUserId)
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

- [ ] **Step 7: Run unit tests to verify they pass**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/trainee.test.ts tests/unit/services/TraineeService.test.ts
  ```

  Expected: PASS — all tests.

- [ ] **Step 8: Update TraineeRepository integration test**

  In `tests/integration/repositories/TraineeRepository.test.ts`, update `beforeEach` to clear AllowedUser too, and update `create` test to include email:

  ```ts
  beforeEach(async () => {
    repo = new TraineeRepository(db.prisma)
    await db.prisma.trainingSessionLog.deleteMany()
    await db.prisma.trainingSession.deleteMany()
    await db.prisma.trainee.deleteMany()
    await db.prisma.allowedUser.deleteMany()
  })
  ```

  Update the `creates a trainee` test:
  ```ts
  it('creates a trainee', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    expect(t.id).toBeDefined()
    expect(t.name).toBe('Alice')
    expect(t.email).toBe('alice@example.com')
  })
  ```

  Update all other tests that call `repo.create` to include `email`:
  ```ts
  // e.g.:
  await repo.create({ name: 'Alice', email: 'alice@example.com' })
  await repo.create({ name: 'Bob', email: 'bob@example.com' })
  ```

  Add new tests at the end of the describe block:
  ```ts
  it('createWithAllowedUser creates both Trainee and AllowedUser atomically', async () => {
    const t = await repo.createWithAllowedUser({ name: 'Charlie', email: 'charlie@example.com' })
    expect(t.email).toBe('charlie@example.com')
    const au = await db.prisma.allowedUser.findUnique({ where: { email: 'charlie@example.com' } })
    expect(au?.role).toBe('trainee')
  })

  it('createWithAllowedUser rolls back if email already exists in AllowedUser', async () => {
    await db.prisma.allowedUser.create({ data: { email: 'charlie@example.com', role: 'trainer' } })
    await expect(
      repo.createWithAllowedUser({ name: 'Charlie', email: 'charlie@example.com' })
    ).rejects.toThrow()
    const traineeCount = await db.prisma.trainee.count({ where: { email: 'charlie@example.com' } })
    expect(traineeCount).toBe(0)
  })

  it('findByClerkUserId returns trainee when clerkUserId matches', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await repo.linkClerkUser('alice@example.com', 'clerk_abc')
    const found = await repo.findByClerkUserId('clerk_abc')
    expect(found?.id).toBe(t.id)
  })

  it('findByClerkUserId returns null when not found', async () => {
    expect(await repo.findByClerkUserId('clerk_none')).toBeNull()
  })

  it('linkClerkUser sets clerkUserId on trainee', async () => {
    await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await repo.linkClerkUser('alice@example.com', 'clerk_xyz')
    const found = await repo.findByEmail('alice@example.com')
    expect(found?.clerkUserId).toBe('clerk_xyz')
  })
  ```

- [ ] **Step 9: Run integration tests**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects integration -- tests/integration/repositories/TraineeRepository.test.ts
  ```

  Expected: PASS — all tests.

- [ ] **Step 10: Typecheck + lint + commit**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  git add src/lib/domain/trainee.ts src/lib/repositories/TraineeRepository.ts src/lib/services/TraineeService.ts tests/unit/domain/trainee.test.ts tests/unit/services/TraineeService.test.ts tests/integration/repositories/TraineeRepository.test.ts
  git commit -m "feat(auth): update Trainee domain, repo, and service for email + clerkUserId"
  ```

---

### Task 5: ForbiddenError + handleError + Clerk types + DI services

**Files:**
- Modify: `src/lib/errors.ts`
- Modify: `src/lib/api/handleError.ts`
- Modify: `src/lib/api/services.ts`
- Create: `src/types/clerk.d.ts`
- Create: `src/lib/api/auth.ts`

**Interfaces:**
- Consumes: `AllowedUserService` (Task 3), `TraineeService` (Task 4)
- Produces:
  - `ForbiddenError` class — used by trainer-only API routes and `requireTrainerRole()`
  - `handleError` handles 403
  - `allowedUserService` singleton in `services.ts`
  - `requireTrainerRole()` and `resolveAuthTrainee()` helpers in `auth.ts`
  - `sessionClaims.publicMetadata.role` typed as `'trainer' | 'trainee' | undefined`

- [ ] **Step 1: Add ForbiddenError to src/lib/errors.ts**

  Append to the existing file:

  ```ts
  export class ForbiddenError extends Error {
    constructor() {
      super('Forbidden')
      this.name = 'ForbiddenError'
    }
  }
  ```

- [ ] **Step 2: Update src/lib/api/handleError.ts**

  Add `ForbiddenError` import and handling:

  ```ts
  import { NextResponse } from 'next/server'
  import { NotFoundError, DeleteBlockedError, ValidationError, MediaLimitError, ForbiddenError } from '@/lib/errors'
  import { logger } from '@/lib/logger'

  export function handleError(error: unknown, path: string): NextResponse {
    if (error instanceof ForbiddenError) {
      logger.warn({ path, status: 403 }, 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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

- [ ] **Step 3: Create src/types/clerk.d.ts**

  This augments Clerk's global types so `publicMetadata.role` is typed everywhere:

  ```ts
  export {}

  declare global {
    interface UserPublicMetadata {
      role?: 'trainer' | 'trainee'
    }
  }
  ```

- [ ] **Step 4: Update src/lib/api/services.ts**

  Add `allowedUserService`:

  ```ts
  import { prisma } from '@/lib/db'
  import { ExerciseRepository } from '@/lib/repositories/ExerciseRepository'
  import { ExerciseMediaRepository } from '@/lib/repositories/ExerciseMediaRepository'
  import { TrainingPlanRepository } from '@/lib/repositories/TrainingPlanRepository'
  import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
  import { AllowedUserRepository } from '@/lib/repositories/AllowedUserRepository'
  import { SessionRepository } from '@/lib/repositories/SessionRepository'
  import { SessionLogRepository } from '@/lib/repositories/SessionLogRepository'
  import { ExerciseService } from '@/lib/services/ExerciseService'
  import { ExerciseMediaService } from '@/lib/services/ExerciseMediaService'
  import { TrainingPlanService } from '@/lib/services/TrainingPlanService'
  import { TraineeService } from '@/lib/services/TraineeService'
  import { AllowedUserService } from '@/lib/services/AllowedUserService'
  import { SessionService } from '@/lib/services/SessionService'
  import { ProgressionService } from '@/lib/services/ProgressionService'

  export const exerciseService = new ExerciseService(new ExerciseRepository(prisma))
  export const exerciseMediaService = new ExerciseMediaService(new ExerciseMediaRepository(prisma), new ExerciseRepository(prisma))
  export const trainingPlanService = new TrainingPlanService(new TrainingPlanRepository(prisma), new ExerciseRepository(prisma))
  export const traineeService = new TraineeService(new TraineeRepository(prisma))
  export const allowedUserService = new AllowedUserService(new AllowedUserRepository(prisma))
  export const sessionService = new SessionService(new SessionRepository(prisma), new SessionLogRepository(prisma))
  export const progressionService = new ProgressionService(new SessionRepository(prisma), new SessionLogRepository(prisma))
  ```

- [ ] **Step 5: Create src/lib/api/auth.ts**

  ```ts
  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { ForbiddenError } from '@/lib/errors'
  import { traineeService } from './services'
  import type { Trainee } from '@/lib/domain/trainee'

  export async function requireTrainerRole(): Promise<void> {
    const { sessionClaims } = await auth()
    if (sessionClaims?.publicMetadata?.role !== 'trainer') {
      throw new ForbiddenError()
    }
  }

  export async function resolveAuthTrainee(): Promise<Trainee> {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')
    const trainee = await traineeService.findByClerkUserId(userId)
    if (!trainee) redirect('/access-denied')
    return trainee
  }
  ```

- [ ] **Step 6: Typecheck + lint + commit**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  git add src/lib/errors.ts src/lib/api/handleError.ts src/lib/api/services.ts src/lib/api/auth.ts src/types/clerk.d.ts
  git commit -m "feat(auth): ForbiddenError, handleError 403, AllowedUserService in DI, auth helpers"
  ```

---

### Task 6: Clerk middleware + ClerkProvider in layout

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx`
- Delete: `src/lib/context/ModeContext.tsx`

**Interfaces:**
- Consumes: `@clerk/nextjs/server` (Task 1), Clerk env vars
- Produces: All routes protected; `ClerkProvider` wraps the app tree

- [ ] **Step 1: Create src/middleware.ts**

  ```ts
  import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
  import { NextResponse } from 'next/server'

  const isPublic = createRouteMatcher([
    '/sign-in(.*)',
    '/access-denied',
    '/api/webhooks/clerk',
  ])

  const isPending = createRouteMatcher(['/auth/pending'])
  const isTrainerRoute = createRouteMatcher(['/trainer(.*)'])
  const isTraineeRoute = createRouteMatcher(['/trainee(.*)'])

  export default clerkMiddleware(async (auth, req) => {
    if (isPublic(req)) return NextResponse.next()

    const { userId, sessionClaims } = await auth()

    if (isPending(req)) {
      if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))
      return NextResponse.next()
    }

    if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))

    const role = sessionClaims?.publicMetadata?.role

    if (!role) return NextResponse.redirect(new URL('/auth/pending', req.url))

    if (isTrainerRoute(req) && role !== 'trainer') {
      return NextResponse.redirect(new URL('/trainee', req.url))
    }

    if (isTraineeRoute(req) && role !== 'trainee') {
      return NextResponse.redirect(new URL('/trainer', req.url))
    }

    return NextResponse.next()
  })

  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)',
    ],
  }
  ```

  Note: `/trainee` without `[traineeId]` is handled by the home page redirect (Task 9), which resolves the correct ID.

- [ ] **Step 2: Update src/app/layout.tsx**

  Remove `ModeProvider`, add `ClerkProvider`:

  ```tsx
  import type { Metadata } from 'next'
  import { Manrope, Inter } from 'next/font/google'
  import { NextIntlClientProvider } from 'next-intl'
  import { getMessages } from 'next-intl/server'
  import { ClerkProvider } from '@clerk/nextjs'
  import { AppLayout } from '@/components/layout/AppLayout'
  import './globals.css'

  const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
  const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

  export const metadata: Metadata = {
    title: 'FitFamily',
    description: 'Family fitness tracking',
    manifest: '/manifest.json',
    icons: {
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    },
  }

  export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const messages = await getMessages()
    return (
      <ClerkProvider>
        <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
          <body>
            <NextIntlClientProvider messages={messages}>
              <AppLayout>
                {children}
              </AppLayout>
            </NextIntlClientProvider>
          </body>
        </html>
      </ClerkProvider>
    )
  }
  ```

- [ ] **Step 3: Delete src/lib/context/ModeContext.tsx**

  ```bash
  rm src/lib/context/ModeContext.tsx
  ```

- [ ] **Step 4: Typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck
  ```

  Expected: Errors for anything that still imports `ModeContext` or `useMode`. Those will be fixed in Task 7.

- [ ] **Step 5: Commit**

  ```bash
  git add src/middleware.ts src/app/layout.tsx
  git rm src/lib/context/ModeContext.tsx
  git commit -m "feat(auth): Clerk middleware route protection and ClerkProvider in layout"
  ```

---

### Task 7: Auth pages + Header cleanup + i18n

**Files:**
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/auth/pending/page.tsx`
- Create: `src/app/auth/pending/PendingClient.tsx`
- Create: `src/app/access-denied/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `ClerkProvider` (Task 6), `resolveAuthTrainee()` (Task 5), `auth()` from `@clerk/nextjs/server`
- Produces: `/sign-in`, `/auth/pending`, `/access-denied` pages; `Header` with `UserButton` instead of mode toggle

- [ ] **Step 1: Update src/i18n/en.json**

  Remove the `"mode"` key entirely. Add auth keys:

  ```json
  "auth": {
    "pendingTitle": "Setting up your account…",
    "pendingSubtitle": "You'll be redirected automatically.",
    "accessDeniedTitle": "Access not granted.",
    "accessDeniedSubtitle": "Contact your trainer to get access.",
    "signInTitle": "Welcome to FitFamily"
  }
  ```

  (Edit the file to remove `"mode": { ... }` block and add `"auth": { ... }` block.)

- [ ] **Step 2: Create src/app/sign-in/[[...sign-in]]/page.tsx**

  ```tsx
  import { SignIn } from '@clerk/nextjs'

  export default function SignInPage() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <SignIn
          appearance={{
            variables: {
              colorBackground: '#111111',
              colorText: '#ffffff',
              colorPrimary: '#E85D26',
              colorInputBackground: '#1A1A1A',
              colorInputText: '#ffffff',
            },
            elements: {
              card: 'border border-[rgba(255,255,255,0.08)] rounded-lg shadow-none',
              footer: 'hidden',
              socialButtonsBlockButton: 'border border-[rgba(255,255,255,0.08)]',
            },
          }}
          routing="path"
          path="/sign-in"
        />
      </div>
    )
  }
  ```

- [ ] **Step 3: Create src/app/auth/pending/PendingClient.tsx**

  ```tsx
  'use client'
  import { useEffect } from 'react'
  import { useRouter } from 'next/navigation'

  export function PendingClient() {
    const router = useRouter()
    useEffect(() => {
      const id = setInterval(() => router.refresh(), 2000)
      return () => clearInterval(id)
    }, [router])

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#0A0A0A]">
        <p className="font-display text-lg font-semibold">Setting up your account…</p>
        <p className="text-sm text-[rgba(255,255,255,0.4)]">You&apos;ll be redirected automatically.</p>
      </div>
    )
  }
  ```

- [ ] **Step 4: Create src/app/auth/pending/page.tsx**

  ```tsx
  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { traineeService } from '@/lib/api/services'
  import { PendingClient } from './PendingClient'

  export default async function PendingPage() {
    const { userId, sessionClaims } = await auth()
    if (!userId) redirect('/sign-in')

    const role = sessionClaims?.publicMetadata?.role
    if (role === 'trainer') redirect('/trainer')
    if (role === 'trainee') {
      const trainee = await traineeService.findByClerkUserId(userId)
      if (trainee) redirect(`/trainee/${trainee.id}`)
      redirect('/access-denied')
    }

    return <PendingClient />
  }
  ```

- [ ] **Step 5: Create src/app/access-denied/page.tsx**

  ```tsx
  import Link from 'next/link'

  export default function AccessDeniedPage() {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0A] px-4 text-center">
        <h1 className="font-display text-2xl font-bold">Access not granted.</h1>
        <p className="text-[rgba(255,255,255,0.6)]">Contact your trainer to get access.</p>
        <Link href="/sign-in" className="text-sm text-[rgba(255,255,255,0.4)] underline">
          Back to sign in
        </Link>
      </div>
    )
  }
  ```

- [ ] **Step 6: Update src/components/layout/Header.tsx**

  Remove mode toggle and `useMode` import. Add `UserButton`:

  ```tsx
  'use client'
  import Link from 'next/link'
  import { UserButton, useAuth } from '@clerk/nextjs'

  export function Header() {
    const { sessionClaims } = useAuth()
    const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role
    const homeHref = role === 'trainer' ? '/trainer' : '/'

    return (
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={homeHref} className="font-display text-lg font-bold tracking-tight">
            FitFamily
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </header>
    )
  }
  ```

- [ ] **Step 7: Typecheck + lint**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  ```

  Expected: PASS (the remaining `useMode` usages — only in the now-deleted ModeContext and the old header — are gone).

- [ ] **Step 8: Commit**

  ```bash
  git add src/app/sign-in/ src/app/auth/ src/app/access-denied/ src/components/layout/Header.tsx src/i18n/en.json
  git commit -m "feat(auth): sign-in page, pending page, access-denied page, Header with UserButton"
  ```

---

### Task 8: Clerk webhook handler + integration test

**Files:**
- Create: `src/app/api/webhooks/clerk/route.ts`
- Create: `tests/integration/webhook/clerk.test.ts`

**Interfaces:**
- Consumes: `allowedUserService.findByEmail()` (Task 5), `traineeService.linkClerkUserByEmail()` (Task 4), `svix` (Task 1), `@clerk/nextjs/server` `clerkClient()`
- Produces: `POST /api/webhooks/clerk` — sets role or deletes user on `user.created`

- [ ] **Step 1: Write failing integration test**

  Create `tests/integration/webhook/clerk.test.ts`:

  ```ts
  import { setupTestDb, teardownTestDb, type TestDb } from '../helpers/db'
  import { AllowedUserRepository } from '@/lib/repositories/AllowedUserRepository'
  import { AllowedUserService } from '@/lib/services/AllowedUserService'
  import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
  import { TraineeService } from '@/lib/services/TraineeService'
  import { handleClerkUserCreated } from '@/lib/services/ClerkWebhookHandler'

  // Mock Clerk API
  const mockUpdateMetadata = jest.fn()
  const mockDeleteUser = jest.fn()

  jest.mock('@clerk/nextjs/server', () => ({
    clerkClient: jest.fn().mockResolvedValue({
      users: {
        updateUserMetadata: (...args: unknown[]) => mockUpdateMetadata(...args),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
      },
    }),
  }))

  let db: TestDb

  beforeAll(async () => { db = await setupTestDb() })
  afterAll(async () => { await teardownTestDb(db) })

  beforeEach(async () => {
    jest.clearAllMocks()
    await db.prisma.trainee.deleteMany()
    await db.prisma.allowedUser.deleteMany()
  })

  function makeServices() {
    const allowedUserService = new AllowedUserService(new AllowedUserRepository(db.prisma))
    const traineeService = new TraineeService(new TraineeRepository(db.prisma))
    return { allowedUserService, traineeService }
  }

  describe('handleClerkUserCreated', () => {
    it('sets trainer role when email is in AllowedUser as trainer', async () => {
      await db.prisma.allowedUser.create({ data: { email: 'trainer@example.com', role: 'trainer' } })
      const { allowedUserService, traineeService } = makeServices()

      await handleClerkUserCreated('user_123', 'trainer@example.com', allowedUserService, traineeService)

      expect(mockUpdateMetadata).toHaveBeenCalledWith('user_123', { publicMetadata: { role: 'trainer' } })
      expect(mockDeleteUser).not.toHaveBeenCalled()
    })

    it('sets trainee role and links clerkUserId when email is trainee', async () => {
      await db.prisma.allowedUser.create({ data: { email: 'trainee@example.com', role: 'trainee' } })
      await db.prisma.trainee.create({ data: { name: 'Alice', email: 'trainee@example.com' } })
      const { allowedUserService, traineeService } = makeServices()

      await handleClerkUserCreated('user_456', 'trainee@example.com', allowedUserService, traineeService)

      expect(mockUpdateMetadata).toHaveBeenCalledWith('user_456', { publicMetadata: { role: 'trainee' } })
      const trainee = await db.prisma.trainee.findUnique({ where: { email: 'trainee@example.com' } })
      expect(trainee?.clerkUserId).toBe('user_456')
    })

    it('deletes Clerk user when email is not in AllowedUser', async () => {
      const { allowedUserService, traineeService } = makeServices()

      await handleClerkUserCreated('user_789', 'nobody@example.com', allowedUserService, traineeService)

      expect(mockDeleteUser).toHaveBeenCalledWith('user_789')
      expect(mockUpdateMetadata).not.toHaveBeenCalled()
    })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects integration -- tests/integration/webhook/clerk.test.ts
  ```

  Expected: FAIL — `Cannot find module '@/lib/services/ClerkWebhookHandler'`

- [ ] **Step 3: Create src/lib/services/ClerkWebhookHandler.ts**

  Extract the business logic from the route handler so it's testable:

  ```ts
  import { clerkClient } from '@clerk/nextjs/server'
  import type { AllowedUserService } from './AllowedUserService'
  import type { TraineeService } from './TraineeService'
  import { logger } from '@/lib/logger'

  export async function handleClerkUserCreated(
    userId: string,
    email: string,
    allowedUserService: AllowedUserService,
    traineeService: TraineeService,
  ): Promise<void> {
    const client = await clerkClient()
    const allowed = await allowedUserService.findByEmail(email)

    if (!allowed) {
      logger.warn({ service: 'ClerkWebhookHandler', operation: 'user.created', email, outcome: 'blocked' }, 'Email not in AllowedUser — deleting Clerk user')
      await client.users.deleteUser(userId)
      return
    }

    await client.users.updateUserMetadata(userId, { publicMetadata: { role: allowed.role } })
    logger.info({ service: 'ClerkWebhookHandler', operation: 'user.created', email, role: allowed.role, outcome: 'role-set' }, 'Role set on Clerk user')

    if (allowed.role === 'trainee') {
      await traineeService.linkClerkUserByEmail(email, userId)
      logger.info({ service: 'ClerkWebhookHandler', operation: 'user.created', email, outcome: 'linked' }, 'Clerk user linked to Trainee record')
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects integration -- tests/integration/webhook/clerk.test.ts
  ```

  Expected: PASS — 3 tests.

- [ ] **Step 5: Create src/app/api/webhooks/clerk/route.ts**

  ```ts
  import { Webhook } from 'svix'
  import { headers } from 'next/headers'
  import { allowedUserService, traineeService } from '@/lib/api/services'
  import { handleClerkUserCreated } from '@/lib/services/ClerkWebhookHandler'
  import { logger } from '@/lib/logger'

  type ClerkUserCreatedEvent = {
    type: 'user.created'
    data: {
      id: string
      email_addresses: { id: string; email_address: string }[]
      primary_email_address_id: string
    }
  }

  export async function POST(req: Request) {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) {
      logger.error({ service: 'ClerkWebhook' }, 'CLERK_WEBHOOK_SECRET not set')
      return new Response('Server misconfiguration', { status: 500 })
    }

    const payload = await req.text()
    const headerList = await headers()
    const svixHeaders = {
      'svix-id': headerList.get('svix-id') ?? '',
      'svix-timestamp': headerList.get('svix-timestamp') ?? '',
      'svix-signature': headerList.get('svix-signature') ?? '',
    }

    let event: ClerkUserCreatedEvent
    try {
      const wh = new Webhook(secret)
      event = wh.verify(payload, svixHeaders) as ClerkUserCreatedEvent
    } catch {
      logger.warn({ service: 'ClerkWebhook' }, 'Invalid webhook signature')
      return new Response('Invalid signature', { status: 400 })
    }

    if (event.type !== 'user.created') {
      return new Response('OK', { status: 200 })
    }

    const primaryEmail = event.data.email_addresses.find(
      (e) => e.id === event.data.primary_email_address_id,
    )?.email_address

    if (!primaryEmail) {
      logger.warn({ service: 'ClerkWebhook', userId: event.data.id }, 'No primary email on user.created')
      return new Response('No email', { status: 400 })
    }

    await handleClerkUserCreated(event.data.id, primaryEmail, allowedUserService, traineeService)
    return new Response('OK', { status: 200 })
  }
  ```

- [ ] **Step 6: Typecheck + lint + commit**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  git add src/lib/services/ClerkWebhookHandler.ts src/app/api/webhooks/clerk/route.ts tests/integration/webhook/clerk.test.ts
  git commit -m "feat(auth): Clerk webhook handler sets role and links trainee on user.created"
  ```

---

### Task 9: Home page redirect + trainee page auth guards

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/(trainee)/trainee/[traineeId]/page.tsx`
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/page.tsx`
- Modify: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/page.tsx`
- Modify: `src/app/(trainee)/trainee/[traineeId]/finish/page.tsx`

**Interfaces:**
- Consumes: `auth()` from `@clerk/nextjs/server`, `resolveAuthTrainee()` (Task 5)
- Produces: `/` redirects by role; all trainee pages verify URL traineeId matches authenticated user

- [ ] **Step 1: Replace src/app/page.tsx**

  ```tsx
  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { traineeService } from '@/lib/api/services'

  export default async function HomePage() {
    const { userId, sessionClaims } = await auth()
    if (!userId) redirect('/sign-in')

    const role = sessionClaims?.publicMetadata?.role
    if (role === 'trainer') redirect('/trainer')

    if (role === 'trainee') {
      const trainee = await traineeService.findByClerkUserId(userId)
      if (trainee) redirect(`/trainee/${trainee.id}`)
      redirect('/access-denied')
    }

    redirect('/auth/pending')
  }
  ```

- [ ] **Step 2: Update src/app/(trainee)/trainee/[traineeId]/page.tsx**

  Add auth guard at the top (before the existing data fetches). Replace the current `traineeService.findById` call:

  ```tsx
  export const dynamic = 'force-dynamic'

  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { traineeService, trainingPlanService, exerciseService, sessionService } from '@/lib/api/services'
  import { getTranslations } from 'next-intl/server'
  import Link from 'next/link'
  import { Card } from '@/components/ui/Card'
  import { ExercisePicker } from './ExercisePicker'

  interface Props {
    params: Promise<{ traineeId: string }>
  }

  export default async function TraineeDashboardPage({ params }: Props) {
    const { traineeId } = await params
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const myTrainee = await traineeService.findByClerkUserId(userId)
    if (!myTrainee || myTrainee.id !== traineeId) {
      redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
    }

    const t = await getTranslations('traineeDashboard')
    const [plans, exercises, lastSession] = await Promise.all([
      trainingPlanService.list(),
      exerciseService.list(),
      sessionService.findLastByTrainee(traineeId),
    ])

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-display text-3xl font-bold">{myTrainee.name}</h1>
          {lastSession && (
            <p className="mt-1 text-sm text-[rgba(255,255,255,0.4)]">
              {t('lastSession', { date: new Date(lastSession.startedAt).toLocaleDateString() })}
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

- [ ] **Step 3: Update src/app/(trainee)/trainee/[traineeId]/session/[planId]/page.tsx**

  Add auth guard before the plan fetch:

  ```tsx
  export const dynamic = 'force-dynamic'

  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { trainingPlanService, traineeService } from '@/lib/api/services'
  import { notFound } from 'next/navigation'
  import { PlanSessionRunner } from './PlanSessionRunner'

  interface Props {
    params: Promise<{ traineeId: string; planId: string }>
  }

  export default async function PlanSessionPage({ params }: Props) {
    const { traineeId, planId } = await params
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const myTrainee = await traineeService.findByClerkUserId(userId)
    if (!myTrainee || myTrainee.id !== traineeId) {
      redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
    }

    const plan = await trainingPlanService.findForSession(planId)
    if (!plan) notFound()

    return <PlanSessionRunner plan={plan} traineeId={traineeId} />
  }
  ```

- [ ] **Step 4: Update src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/page.tsx**

  ```tsx
  export const dynamic = 'force-dynamic'

  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { exerciseService, traineeService } from '@/lib/api/services'
  import { notFound } from 'next/navigation'
  import { ExerciseSessionRunner } from './ExerciseSessionRunner'
  import type { Exercise, ExerciseMedia } from '@prisma/client'

  interface Props {
    params: Promise<{ traineeId: string; exerciseId: string }>
  }

  export default async function SingleExerciseSessionPage({ params }: Props) {
    const { traineeId, exerciseId } = await params
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const myTrainee = await traineeService.findByClerkUserId(userId)
    if (!myTrainee || myTrainee.id !== traineeId) {
      redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
    }

    const exercise = await exerciseService.findWithMedia(exerciseId)
    if (!exercise) notFound()

    return (
      <ExerciseSessionRunner
        exercise={exercise as Exercise & { media: ExerciseMedia[] }}
        traineeId={traineeId}
      />
    )
  }
  ```

- [ ] **Step 5: Update src/app/(trainee)/trainee/[traineeId]/finish/page.tsx**

  ```tsx
  import { auth } from '@clerk/nextjs/server'
  import { redirect } from 'next/navigation'
  import { traineeService } from '@/lib/api/services'
  import { notFound } from 'next/navigation'
  import { FinishScreen } from './FinishScreen'

  interface Props {
    params: Promise<{ traineeId: string }>
    searchParams: Promise<{ sessionId?: string; planId?: string }>
  }

  export default async function FinishPage({ params, searchParams }: Props) {
    const { traineeId } = await params
    const { sessionId } = await searchParams
    if (!sessionId) notFound()

    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const myTrainee = await traineeService.findByClerkUserId(userId)
    if (!myTrainee || myTrainee.id !== traineeId) {
      redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
    }

    return <FinishScreen traineeId={traineeId} sessionId={sessionId} />
  }
  ```

- [ ] **Step 6: Typecheck + lint**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  ```

  Expected: PASS

- [ ] **Step 7: Commit**

  ```bash
  git add src/app/page.tsx src/app/\(trainee\)/
  git commit -m "feat(auth): home page role redirect; trainee pages scoped to authenticated user"
  ```

---

### Task 10: TraineeList email field + trainer API role guards

**Files:**
- Modify: `src/app/(trainer)/trainer/trainees/TraineeList.tsx`
- Modify: `src/app/api/trainees/route.ts`
- Modify: `src/app/api/trainees/[id]/route.ts`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `requireTrainerRole()` (Task 5), updated `CreateTraineeSchema` with email (Task 4)
- Produces: Trainer CRUD creates trainee + AllowedUser atomically; non-trainers get 403 from API

- [ ] **Step 1: Add email i18n keys**

  In `src/i18n/en.json`, update the `"trainees"` section to add email-related keys:

  ```json
  "trainees": {
    "title": "Trainees",
    "empty": "No trainees yet.",
    "namePlaceholder": "Full name",
    "emailPlaceholder": "Email address",
    "emailLabel": "Email",
    "add": "Add",
    "adding": "Adding…",
    "addError": "Failed to add trainee",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "confirm": "Confirm",
    "deleteLabel": "Delete {name}",
    "deleteError": "Failed to delete",
    "deleteBlockedError": "Cannot delete — trainee has training sessions",
    "saveEditError": "Failed to save"
  }
  ```

- [ ] **Step 2: Update src/app/(trainer)/trainer/trainees/TraineeList.tsx**

  Replace the full component with the email-aware version:

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
    const [newEmail, setNewEmail] = useState('')
    const [addError, setAddError] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editError, setEditError] = useState<string | null>(null)
    const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

    async function handleAdd(e: React.FormEvent) {
      e.preventDefault()
      setAddError(null)
      setAdding(true)
      try {
        const res = await fetch('/api/trainees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName, email: newEmail }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setAddError(data.error ?? t('addError'))
          return
        }
        const created: Trainee = await res.json()
        setTrainees((prev) => [...prev, created])
        setNewName('')
        setNewEmail('')
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
      setEditError(null)
      try {
        const res = await fetch(`/api/trainees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName }),
        })
        if (!res.ok) {
          setEditError(t('saveEditError'))
          return
        }
        const updated: Trainee = await res.json()
        setTrainees((prev) => prev.map((tr) => (tr.id === id ? updated : tr)))
        setEditingId(null)
        router.refresh()
      } catch {
        setEditError(t('saveEditError'))
      }
    }

    async function handleDelete(id: string) {
      setConfirmingDeleteId(null)
      setDeleteErrors((prev) => ({ ...prev, [id]: '' }))
      const res = await fetch(`/api/trainees/${id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        setDeleteErrors((prev) => ({ ...prev, [id]: data.error ?? t('deleteBlockedError') }))
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
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row">
          <Input
            name="name"
            placeholder={t('namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="flex-1"
          />
          <Input
            name="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
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
                      <Button variant="ghost" onClick={() => { setEditingId(null); setEditError(null) }}>{t('cancel')}</Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-semibold">{trainee.name}</p>
                        <p className="text-sm text-[rgba(255,255,255,0.4)]">{trainee.email}</p>
                      </div>
                      <Button variant="ghost" onClick={() => startEdit(trainee)}>{t('edit')}</Button>
                      {confirmingDeleteId === trainee.id ? (
                        <>
                          <Button variant="danger" onClick={() => handleDelete(trainee.id)}>{t('confirm')}</Button>
                          <Button variant="ghost" onClick={() => setConfirmingDeleteId(null)}>{t('cancel')}</Button>
                        </>
                      ) : (
                        <button
                          aria-label={t('deleteLabel', { name: trainee.name })}
                          onClick={() => setConfirmingDeleteId(trainee.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          {t('delete')}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {editingId === trainee.id && editError && (
                  <p className="mt-2 text-sm text-red-400">{editError}</p>
                )}
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

- [ ] **Step 3: Update src/app/api/trainees/route.ts**

  Add `requireTrainerRole()` guard and update `POST` to use new schema with email:

  ```ts
  /**
   * @swagger
   * /api/trainees:
   *   get:
   *     summary: List all trainees
   *     tags: [Trainees]
   *     security:
   *       - ClerkAuth: []
   *     responses:
   *       200:
   *         description: Array of trainees
   *       403:
   *         description: Forbidden — trainer role required
   *   post:
   *     summary: Create trainee (trainer only)
   *     tags: [Trainees]
   *     security:
   *       - ClerkAuth: []
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
   *       403:
   *         description: Forbidden — trainer role required
   */
  import { NextResponse } from 'next/server'
  import { traineeService } from '@/lib/api/services'
  import { requireTrainerRole } from '@/lib/api/auth'
  import { CreateTraineeSchema } from '@/lib/domain/trainee'
  import { handleError } from '@/lib/api/handleError'

  export async function GET() {
    try {
      await requireTrainerRole()
      const trainees = await traineeService.list()
      return NextResponse.json(trainees)
    } catch (error) {
      return handleError(error, '/api/trainees')
    }
  }

  export async function POST(request: Request) {
    try {
      await requireTrainerRole()
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

- [ ] **Step 4: Update src/app/api/trainees/[id]/route.ts**

  Add `requireTrainerRole()` to all three handlers. Only the leading imports and first line of each function body change — keep all existing Swagger annotations and logic:

  ```ts
  import { NextResponse } from 'next/server'
  import { traineeService } from '@/lib/api/services'
  import { requireTrainerRole } from '@/lib/api/auth'
  import { UpdateTraineeSchema } from '@/lib/domain/trainee'
  import { handleError } from '@/lib/api/handleError'

  export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
      await requireTrainerRole()
      const trainee = await traineeService.findById(id)
      return NextResponse.json(trainee)
    } catch (error) {
      return handleError(error, `/api/trainees/${id}`)
    }
  }

  export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
      await requireTrainerRole()
      const body = await request.json()
      const parsed = UpdateTraineeSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      const trainee = await traineeService.update(id, parsed.data)
      return NextResponse.json(trainee)
    } catch (error) {
      return handleError(error, `/api/trainees/${id}`)
    }
  }

  export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
      await requireTrainerRole()
      await traineeService.delete(id)
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleError(error, `/api/trainees/${id}`)
    }
  }
  ```

  (Restore the full Swagger JSDoc from the original file above these functions.)

- [ ] **Step 5: Typecheck + lint**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  ```

  Expected: PASS

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/\(trainer\)/trainer/trainees/TraineeList.tsx src/app/api/trainees/ src/i18n/en.json
  git commit -m "feat(auth): TraineeList shows email; trainer-only API guards on /api/trainees"
  ```

---

### Task 11: E2E test updates

**Files:**
- Modify: `tests/e2e/helpers/setup.ts`
- Delete: `tests/e2e/mode-switch.spec.ts`
- Modify: `tests/e2e/trainee.spec.ts` (update `seedTrainee` calls to include email)
- Modify: `tests/e2e/trainer.spec.ts` (update `seedTrainee` calls if any)
- Modify: `tests/e2e/failure-paths.spec.ts` (update `seedTrainee` calls)

**Interfaces:**
- Consumes: updated `Trainee` schema (Task 2), auth bypass approach
- Produces: all existing E2E tests updated; mode-switch tests removed

Note on E2E auth: Clerk's `@clerk/testing` package provides Playwright integration. For this internal family app, the recommended approach is to use Clerk's test tokens OR to add `TEST_MODE=true` env bypass in the middleware. Check [Clerk E2E docs](https://clerk.com/docs/testing/playwright/overview) and implement accordingly. The steps below assume test bypass via Clerk's `@clerk/testing/playwright` package.

- [ ] **Step 1: Delete mode-switch spec**

  ```bash
  git rm tests/e2e/mode-switch.spec.ts
  ```

- [ ] **Step 2: Install Clerk testing package**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm install --save-dev @clerk/testing
  ```

  Verify the version is compatible with your Clerk Next.js version.

- [ ] **Step 3: Update tests/e2e/helpers/setup.ts**

  Update `cleanDatabase` to also truncate `AllowedUser`. Update `seedTrainee` to include `email`. Add `seedAllowedUser`:

  ```ts
  import { PrismaPg } from '@prisma/adapter-pg'
  import { PrismaClient } from '@prisma/client'
  import type { TrackingType, MediaType } from '@prisma/client'

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://fitfamily:fitfamily@localhost:5433/fitfamily_test'

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  export async function cleanDatabase() {
    await prisma.$executeRawUnsafe(
      `TRUNCATE "TrainingSessionLog", "TrainingSession", "TrainingPlanItemExercise", "TrainingPlanItem", "TrainingPlan", "ExerciseMedia", "Exercise", "Trainee", "AllowedUser" CASCADE`
    )
  }

  export async function seedAllowedUser(data: { email: string; role: 'trainer' | 'trainee' }) {
    return prisma.allowedUser.create({ data })
  }

  export async function seedTrainee(data: { name: string; email: string; clerkUserId?: string }) {
    return prisma.trainee.create({ data })
  }

  // ... keep all existing seedExercise, seedPlan, etc. functions unchanged
  ```

- [ ] **Step 4: Update seedTrainee calls in all E2E specs**

  Search for all `seedTrainee` calls and add the `email` field:

  ```bash
  grep -rn "seedTrainee" tests/e2e/
  ```

  For each occurrence like `seedTrainee({ name: 'Alice' })`, update to `seedTrainee({ name: 'Alice', email: 'alice@example.com' })`.

- [ ] **Step 5: Add Clerk test auth bypass to Playwright config**

  In `playwright.config.ts` (or wherever global setup is), follow the `@clerk/testing/playwright` docs to add `clerkSetup()` and configure test tokens. Add `CLERK_SECRET_KEY` to your test env. Mark trainer-mode tests with a clerk fixture that sets `role: 'trainer'` and trainee tests with `role: 'trainee'`.

  Exact implementation depends on `@clerk/testing` version — consult the official Clerk Playwright docs after verifying the installed version.

- [ ] **Step 6: Run full E2E suite**

  ```bash
  docker compose -f docker-compose.test.yml build
  ~/.nvm/versions/node/v24.1.0/bin/npm run test:e2e
  ```

  Expected: All tests pass. Mode-switch tests gone. Existing trainer/trainee tests pass with Clerk auth bypass.

- [ ] **Step 7: Run full unit + integration suite**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run test:unit
  ~/.nvm/versions/node/v24.1.0/bin/npm run test:integration
  ```

  Expected: All pass.

- [ ] **Step 8: Final typecheck + lint + commit**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npm run typecheck && ~/.nvm/versions/node/v24.1.0/bin/npm run lint
  git add tests/e2e/
  git rm tests/e2e/mode-switch.spec.ts
  git commit -m "feat(auth): update E2E tests for auth — add email to seedTrainee, remove mode-switch tests"
  ```
