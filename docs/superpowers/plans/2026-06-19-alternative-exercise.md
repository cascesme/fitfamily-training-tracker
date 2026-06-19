# Alternative Exercise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional alternative exercises to training plan slots so trainees can permanently swap to a configured substitute during a session.

**Architecture:** Three nullable columns on `TrainingPlanItemExercise` store the alternative; no new model, repository, or API route. `TrainingPlanService` gains an `IExerciseRepository` dependency to validate the alternative exercise exists. The trainee UI adds a one-way switch button per slot, hidden once the first set is logged.

**Tech Stack:** Prisma (schema + migration), TypeScript, Zod `superRefine`, Next.js 15 App Router, React `useState`, `next-intl`, Jest (unit + integration via Testcontainers), Playwright E2E.

## Global Constraints

- Node via nvm: `~/.nvm/versions/node/v24.1.0/bin/node`
- All commands from repo root: `/home/ccastro/orca/fitfamily-training-tracker`
- API routes call one service method and return — no business logic in routes
- Repositories are the only files that import Prisma — services never import Prisma directly
- Services depend on repository **interfaces**, not concrete classes
- All typed errors (`ValidationError`, `NotFoundError`) map through `handleError` in route catch blocks
- Zero hardcoded UI strings — all go through `next-intl` (`src/i18n/en.json`)
- Dark theme only: bg `#0A0A0A`/`#111111`/`#1A1A1A`, accent `#E85D26` for CTAs only
- Spec: `docs/superpowers/specs/2026-06-19-alternative-exercise-design.md`

---

## File Map

**Modified:**
- `prisma/schema.prisma` — 3 nullable columns on `TrainingPlanItemExercise`, named relations on `Exercise`
- `src/lib/domain/plan.ts` — `AddPlanItemSchema` + `superRefine`, `TrainingPlanItemExerciseWithDetails`, `ITrainingPlanRepository.addItem`
- `src/lib/repositories/TrainingPlanRepository.ts` — `addItem` passes alt fields, `findForSession` includes `alternativeExercise`
- `src/lib/services/TrainingPlanService.ts` — accepts `IExerciseRepository`, validates alt exercise exists
- `src/lib/api/services.ts` — pass `ExerciseRepository` to `TrainingPlanService` constructor
- `src/app/api/plans/[id]/items/route.ts` — update Swagger JSDoc
- `src/i18n/en.json` — 4 new keys
- `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx` — per-row alternative section
- `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` — alternative switch state + rendering
- `tests/unit/domain/plan.test.ts` — 6 new `AddPlanItemSchema` cases
- `tests/unit/services/TrainingPlanService.test.ts` — 3 new `addItem` cases, constructor update
- `tests/integration/repositories/TrainingPlanRepository.test.ts` — 4 new cases
- `tests/e2e/helpers/setup.ts` — `seedPlanWithAlternative` helper
- `tests/e2e/alternative-exercise.spec.ts` — new spec file (create)

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<auto>/migration.sql` (auto-generated)

**Interfaces:**
- Produces: Updated Prisma client types — `TrainingPlanItemExercise` gains `alternativeExerciseId?`, `alternativeSets?`, `alternativeReps?`, `alternativeExercise`. All downstream tasks depend on this.

- [ ] **Step 1: Update `prisma/schema.prisma`**

Replace the `TrainingPlanItemExercise` and `Exercise` model blocks with:

```prisma
model Exercise {
  id           String                     @id @default(cuid())
  name         String
  description  String?
  trackingType TrackingType               @default(WEIGHT)
  createdAt    DateTime                   @default(now())
  updatedAt    DateTime                   @updatedAt
  media        ExerciseMedia[]
  planItems    TrainingPlanItemExercise[] @relation("PrimaryExercise")
  alternativePlanItems TrainingPlanItemExercise[] @relation("AlternativeExercise")
  sessionLogs  TrainingSessionLog[]
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
```

- [ ] **Step 2: Run migration**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx prisma migrate dev --name add-alternative-exercise
```

Expected: migration file created, Prisma client regenerated. Output ends with `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify Prisma client compiles**

```bash
npm run typecheck
```

Expected: zero errors on the schema change. (Other errors may exist until later tasks complete — that's expected.)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add alternative exercise columns to TrainingPlanItemExercise"
```

---

### Task 2: Unit Tests for AddPlanItemSchema Co-validation (TDD — write failing tests first)

**Files:**
- Modify: `tests/unit/domain/plan.test.ts`

**Interfaces:**
- Consumes: `AddPlanItemSchema` from `@/lib/domain/plan` (current schema, no alternative fields yet)
- Produces: 6 failing tests that Task 3 will make pass

- [ ] **Step 1: Add the 6 new test cases to `tests/unit/domain/plan.test.ts`**

Append a new `describe` block after the existing `describe('AddPlanItemSchema', ...)`:

```ts
describe('AddPlanItemSchema — alternative exercise co-validation', () => {
  const base = { exerciseId: 'ex1', sets: 3, reps: 10, order: 1 }

  it('accepts item with all three alternative fields set', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ ...base, alternativeExerciseId: 'alt1', alternativeSets: 3, alternativeReps: 8 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects when alternativeExerciseId set but alternativeSets missing', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ ...base, alternativeExerciseId: 'alt1', alternativeReps: 8 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('alternativeSets'))).toBe(true)
  })

  it('rejects when alternativeExerciseId set but alternativeReps missing', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ ...base, alternativeExerciseId: 'alt1', alternativeSets: 3 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('alternativeReps'))).toBe(true)
  })

  it('rejects when alternativeExerciseId set but both alternativeSets and alternativeReps missing', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ ...base, alternativeExerciseId: 'alt1' }],
    })
    expect(result.success).toBe(false)
    const paths = result.error!.issues.flatMap((i) => i.path)
    expect(paths).toContain('alternativeSets')
    expect(paths).toContain('alternativeReps')
  })

  it('rejects when alternativeSets/Reps set without alternativeExerciseId', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ ...base, alternativeSets: 3, alternativeReps: 8 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('alternativeExerciseId'))).toBe(true)
  })

  it('rejects when alternativeExerciseId equals exerciseId', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ ...base, alternativeExerciseId: 'ex1', alternativeSets: 3, alternativeReps: 8 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('alternativeExerciseId'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the new tests and confirm they fail**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/plan.test.ts
```

Expected: the 6 new tests fail. The "accepts item with all three alternative fields set" test passes (Zod strips unknown keys by default — that's expected). The co-validation rejection tests fail because the schema has no `superRefine` yet.

---

### Task 3: Domain Layer Changes (make schema tests pass)

**Files:**
- Modify: `src/lib/domain/plan.ts`

**Interfaces:**
- Produces:
  - `AddPlanItemSchema` — extended with optional alt fields + `superRefine` co-validation
  - `TrainingPlanItemExerciseWithDetails` — gains `alternativeExercise: (PrismaExercise & { media: ExerciseMedia[] }) | null`
  - `ITrainingPlanRepository.addItem` — extended parameter type with optional alt fields
  - `AddPlanItemInput` — inferred type updated automatically

- [ ] **Step 1: Update `src/lib/domain/plan.ts`**

Replace the entire file content with:

```ts
import { z } from 'zod'
import { MAX_SERIES_EXERCISES } from '@/lib/domain/constants'
import type {
  TrainingPlan as PrismaTrainingPlan,
  TrainingPlanItem as PrismaTrainingPlanItem,
  TrainingPlanItemExercise as PrismaTrainingPlanItemExercise,
  Exercise as PrismaExercise,
  ExerciseMedia,
} from '@prisma/client'

export type TrainingPlanItemExercise = PrismaTrainingPlanItemExercise
export type TrainingPlanItem = PrismaTrainingPlanItem & { exercises?: TrainingPlanItemExercise[] }
export type TrainingPlan = PrismaTrainingPlan & { items?: TrainingPlanItem[] }

export type TrainingPlanItemExerciseWithDetails = PrismaTrainingPlanItemExercise & {
  exercise: PrismaExercise & { media: ExerciseMedia[] }
  alternativeExercise: (PrismaExercise & { media: ExerciseMedia[] }) | null
}
export type TrainingPlanItemWithDetails = PrismaTrainingPlanItem & {
  exercises: TrainingPlanItemExerciseWithDetails[]
}
export type TrainingPlanWithDetails = PrismaTrainingPlan & {
  items: TrainingPlanItemWithDetails[]
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
  exercises: z
    .array(
      z
        .object({
          exerciseId: z.string().min(1),
          sets: z.number().int().positive(),
          reps: z.number().int().positive(),
          order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
          alternativeExerciseId: z.string().min(1).optional(),
          alternativeSets: z.number().int().positive().optional(),
          alternativeReps: z.number().int().positive().optional(),
        })
        .superRefine((ex, ctx) => {
          const hasAlt = !!ex.alternativeExerciseId
          const hasSets = ex.alternativeSets !== undefined
          const hasReps = ex.alternativeReps !== undefined
          if (hasAlt && !hasSets) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'alternativeSets required when alternativeExerciseId is set',
              path: ['alternativeSets'],
            })
          }
          if (hasAlt && !hasReps) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'alternativeReps required when alternativeExerciseId is set',
              path: ['alternativeReps'],
            })
          }
          if (!hasAlt && (hasSets || hasReps)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'alternativeExerciseId required when alternativeSets or alternativeReps is set',
              path: ['alternativeExerciseId'],
            })
          }
          if (hasAlt && ex.alternativeExerciseId === ex.exerciseId) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'alternativeExerciseId must differ from exerciseId',
              path: ['alternativeExerciseId'],
            })
          }
        }),
    )
    .min(1)
    .max(MAX_SERIES_EXERCISES),
})
export type AddPlanItemInput = z.infer<typeof AddPlanItemSchema>

export const ReorderItemsSchema = z.object({
  positions: z.array(z.object({ id: z.string(), position: z.number().int().positive() })),
})
export type ReorderItemsInput = z.infer<typeof ReorderItemsSchema>

export interface ITrainingPlanRepository {
  findAll(): Promise<TrainingPlan[]>
  findById(id: string): Promise<TrainingPlan | null>
  findWithItems(id: string): Promise<TrainingPlan | null>
  findForSession(id: string): Promise<TrainingPlanWithDetails | null>
  create(data: CreatePlanInput): Promise<TrainingPlan>
  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan>
  delete(id: string): Promise<void>
  addItem(
    planId: string,
    position: number,
    exercises: Array<{
      exerciseId: string
      sets: number
      reps: number
      order: number
      alternativeExerciseId?: string
      alternativeSets?: number
      alternativeReps?: number
    }>,
  ): Promise<TrainingPlanItem>
  removeItem(itemId: string): Promise<void>
  reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null>
}
```

- [ ] **Step 2: Run the failing tests from Task 2 — they should now pass**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/plan.test.ts
```

Expected: all tests pass, including the 6 new co-validation cases.

- [ ] **Step 3: Run full unit suite to check no regressions**

```bash
npm run test:unit
```

Expected: all tests pass (TypeScript may show type errors in service/repo — that's OK until Tasks 5–6).

- [ ] **Step 4: Commit**

```bash
git add src/lib/domain/plan.ts tests/unit/domain/plan.test.ts
git commit -m "feat(domain): extend AddPlanItemSchema and types for alternative exercise"
```

---

### Task 4: Unit Tests for TrainingPlanService Alternative Validation (TDD — write failing tests)

**Files:**
- Modify: `tests/unit/services/TrainingPlanService.test.ts`

**Interfaces:**
- Consumes: `TrainingPlanService` constructor currently takes only `(repo: ITrainingPlanRepository)` — tests will fail because the new constructor requires `IExerciseRepository` as second argument. After Task 5 the constructor signature changes.
- Produces: 3 new failing tests covering alt exercise validation in `addItem`

- [ ] **Step 1: Add mock exercise repo and 3 new test cases to `tests/unit/services/TrainingPlanService.test.ts`**

At the top of the file, add the import and mock (after existing imports):

```ts
import type { IExerciseRepository } from '@/lib/domain/exercise'

const mockExerciseRepo: jest.Mocked<Pick<IExerciseRepository, 'findById'>> = {
  findById: jest.fn(),
}
```

Update the `service` declaration line (replace `const service = new TrainingPlanService(mockRepo)` with):

```ts
const service = new TrainingPlanService(mockRepo, mockExerciseRepo as IExerciseRepository)
```

Add `mockExerciseRepo.findById.mockReset()` to the `beforeEach`:

```ts
beforeEach(() => {
  jest.clearAllMocks()
  mockExerciseRepo.findById.mockReset()
})
```

Append these 3 cases inside `describe('addItem', ...)`:

```ts
it('throws ValidationError when alternativeExerciseId references non-existent exercise', async () => {
  mockExerciseRepo.findById.mockResolvedValue(null)
  await expect(
    service.addItem('p1', 1, [{
      exerciseId: 'e1',
      sets: 3,
      reps: 10,
      order: 1,
      alternativeExerciseId: 'nope',
      alternativeSets: 3,
      alternativeReps: 8,
    }]),
  ).rejects.toThrow(ValidationError)
  expect(mockRepo.addItem).not.toHaveBeenCalled()
})

it('passes alternative fields through to repo when alternative exercise exists', async () => {
  const altExercise = {
    id: 'alt1',
    name: 'Alt',
    trackingType: 'WEIGHT' as const,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  mockExerciseRepo.findById.mockResolvedValue(altExercise)
  mockRepo.addItem.mockResolvedValue(mockPlanItem)

  await service.addItem('p1', 1, [{
    exerciseId: 'e1',
    sets: 3,
    reps: 10,
    order: 1,
    alternativeExerciseId: 'alt1',
    alternativeSets: 3,
    alternativeReps: 8,
  }])

  expect(mockRepo.addItem).toHaveBeenCalledWith('p1', 1, [{
    exerciseId: 'e1',
    sets: 3,
    reps: 10,
    order: 1,
    alternativeExerciseId: 'alt1',
    alternativeSets: 3,
    alternativeReps: 8,
  }])
})

it('does not call exerciseRepo.findById when no alternative specified', async () => {
  mockRepo.addItem.mockResolvedValue(mockPlanItem)
  await service.addItem('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }])
  expect(mockExerciseRepo.findById).not.toHaveBeenCalled()
  expect(mockRepo.addItem).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the service tests — confirm new ones fail**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: the 3 new tests fail (constructor doesn't accept `IExerciseRepository` yet, or `findById` is never called).

---

### Task 5: Service + DI Wiring (make service tests pass)

**Files:**
- Modify: `src/lib/services/TrainingPlanService.ts`
- Modify: `src/lib/api/services.ts`

**Interfaces:**
- Consumes: `IExerciseRepository.findById(id: string): Promise<Exercise | null>` from `@/lib/domain/exercise`
- Produces: `TrainingPlanService(repo, exerciseRepo)` — both required at construction; `addItem` validates alternative exercise exists before calling repo

- [ ] **Step 1: Replace `src/lib/services/TrainingPlanService.ts` with:**

```ts
import type { ITrainingPlanRepository, CreatePlanInput, UpdatePlanInput, TrainingPlan, TrainingPlanItem } from '@/lib/domain/plan'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface PlanItemExerciseInput {
  exerciseId: string
  sets: number
  reps: number
  order: number
  alternativeExerciseId?: string
  alternativeSets?: number
  alternativeReps?: number
}

export class TrainingPlanService {
  constructor(
    private repo: ITrainingPlanRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  list(): Promise<TrainingPlan[]> {
    return this.repo.findAll()
  }

  findById(id: string): Promise<TrainingPlan | null> {
    return this.repo.findById(id)
  }

  findWithItems(id: string): Promise<TrainingPlan | null> {
    return this.repo.findWithItems(id)
  }

  async findForSession(id: string) {
    return this.repo.findForSession(id)
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
  ): Promise<TrainingPlanItem> {
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId }, 'Adding item to plan')

    const orders = exercises.map((e) => e.order).sort((a, b) => a - b)
    const isContiguous = orders.every((o, i) => o === i + 1)
    if (!isContiguous) {
      logger.warn(
        { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'series-order-contiguous' },
        'Series rejected — order values must be contiguous starting at 1',
      )
      throw new ValidationError('series exercises must have contiguous order starting at 1')
    }

    if (exercises.length > 1) {
      const allEqualSets = exercises.every((e) => e.sets === exercises[0].sets)
      if (!allEqualSets) {
        logger.warn(
          { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'series-equal-sets' },
          'Series rejected — unequal set counts',
        )
        throw new ValidationError('series exercises must have equal set counts')
      }
    }

    for (const ex of exercises) {
      if (ex.alternativeExerciseId) {
        const altEx = await this.exerciseRepo.findById(ex.alternativeExerciseId)
        if (!altEx) {
          logger.warn(
            { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', alternativeExerciseId: ex.alternativeExerciseId },
            'Plan item rejected — alternative exercise not found',
          )
          throw new ValidationError(`Alternative exercise ${ex.alternativeExerciseId} not found`)
        }
      }
    }

    const item = await this.repo.addItem(planId, position, exercises)
    logger.info(
      {
        service: 'TrainingPlanService',
        operation: 'addItem',
        entityId: item.id,
        outcome: 'created',
        hasAlternative: exercises.some((e) => !!e.alternativeExerciseId),
      },
      'Plan item added',
    )
    return item
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

- [ ] **Step 2: Update `src/lib/api/services.ts`**

Replace the `trainingPlanService` line:

```ts
export const trainingPlanService = new TrainingPlanService(
  new TrainingPlanRepository(prisma),
  new ExerciseRepository(prisma),
)
```

(The `ExerciseRepository` import is already present on line 4 of `services.ts` — no new import needed.)

- [ ] **Step 3: Run service tests — confirm all pass**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: all tests pass including the 3 new ones.

- [ ] **Step 4: Run full unit suite**

```bash
npm run test:unit
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/TrainingPlanService.ts src/lib/api/services.ts tests/unit/services/TrainingPlanService.test.ts
git commit -m "feat(service): TrainingPlanService validates alternative exercise exists"
```

---

### Task 6: Repository Changes

**Files:**
- Modify: `src/lib/repositories/TrainingPlanRepository.ts`

**Interfaces:**
- Consumes: `ITrainingPlanRepository.addItem` extended signature from Task 3
- Produces: `addItem` stores alt columns; `findForSession` hydrates `alternativeExercise` with media

- [ ] **Step 1: Update `addItem` in `src/lib/repositories/TrainingPlanRepository.ts`**

Replace the `addItem` method:

```ts
async addItem(
  planId: string,
  position: number,
  exercises: Array<{
    exerciseId: string
    sets: number
    reps: number
    order: number
    alternativeExerciseId?: string
    alternativeSets?: number
    alternativeReps?: number
  }>,
): Promise<TrainingPlanItem> {
  return this.prisma.trainingPlanItem.create({
    data: {
      planId,
      position,
      exercises: {
        create: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          order: ex.order,
          alternativeExerciseId: ex.alternativeExerciseId ?? null,
          alternativeSets: ex.alternativeSets ?? null,
          alternativeReps: ex.alternativeReps ?? null,
        })),
      },
    },
    include: { exercises: true },
  })
}
```

- [ ] **Step 2: Update `findForSession` in `src/lib/repositories/TrainingPlanRepository.ts`**

Replace the `findForSession` method:

```ts
async findForSession(id: string) {
  return this.prisma.trainingPlan.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: {
          exercises: {
            orderBy: { order: 'asc' },
            include: {
              exercise: {
                include: { media: { orderBy: { position: 'asc' } } },
              },
              alternativeExercise: {
                include: { media: { orderBy: { position: 'asc' } } },
              },
            },
          },
        },
      },
    },
  })
}
```

Note: The `as Promise<TrainingPlanWithDetails | null>` cast is removed because the Prisma inferred return type now matches `TrainingPlanWithDetails`. If TypeScript complains, add the cast back.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/repositories/TrainingPlanRepository.ts
git commit -m "feat(repo): TrainingPlanRepository stores and hydrates alternative exercise"
```

---

### Task 7: Integration Tests for TrainingPlanRepository

**Files:**
- Modify: `tests/integration/repositories/TrainingPlanRepository.test.ts`

**Interfaces:**
- Consumes: Updated `TrainingPlanRepository` from Task 6
- Produces: 4 integration test cases covering alt fields

- [ ] **Step 1: Add an `altExerciseId` variable at the top of the test file**

After the existing `let exerciseId: string` declaration, add:

```ts
let altExerciseId: string
```

- [ ] **Step 2: Create the alt exercise in `beforeEach`**

In the existing `beforeEach`, after creating `exerciseId`, add:

```ts
const alt = await db.prisma.exercise.create({ data: { name: 'Alt', trackingType: 'WEIGHT' } })
altExerciseId = alt.id
```

The cleanup in `afterEach` already runs `deleteMany` for exercises, so no change needed there.

- [ ] **Step 3: Append 4 new test cases inside `describe('TrainingPlanRepository', ...)`**

```ts
it('addItem stores alternative exercise columns', async () => {
  const plan = await repo.create({ name: 'P' })
  await repo.addItem(plan.id, 1, [{
    exerciseId,
    sets: 3,
    reps: 10,
    order: 1,
    alternativeExerciseId: altExerciseId,
    alternativeSets: 2,
    alternativeReps: 8,
  }])
  const row = await db.prisma.trainingPlanItemExercise.findFirst({
    where: { item: { planId: plan.id } },
  })
  expect(row?.alternativeExerciseId).toBe(altExerciseId)
  expect(row?.alternativeSets).toBe(2)
  expect(row?.alternativeReps).toBe(8)
})

it('addItem sets alternative columns to null when not provided', async () => {
  const plan = await repo.create({ name: 'P' })
  await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
  const row = await db.prisma.trainingPlanItemExercise.findFirst({
    where: { item: { planId: plan.id } },
  })
  expect(row?.alternativeExerciseId).toBeNull()
  expect(row?.alternativeSets).toBeNull()
  expect(row?.alternativeReps).toBeNull()
})

it('findForSession hydrates alternativeExercise with media', async () => {
  const plan = await repo.create({ name: 'P' })
  await repo.addItem(plan.id, 1, [{
    exerciseId,
    sets: 3,
    reps: 10,
    order: 1,
    alternativeExerciseId: altExerciseId,
    alternativeSets: 3,
    alternativeReps: 8,
  }])
  const result = await repo.findForSession(plan.id)
  const slot = result?.items[0].exercises[0] as any
  expect(slot.alternativeExercise).not.toBeNull()
  expect(slot.alternativeExercise.id).toBe(altExerciseId)
  expect(slot.alternativeExercise.media).toEqual([])
})

it('findForSession returns null alternativeExercise when not set', async () => {
  const plan = await repo.create({ name: 'P' })
  await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
  const result = await repo.findForSession(plan.id)
  const slot = result?.items[0].exercises[0] as any
  expect(slot.alternativeExercise).toBeNull()
})
```

- [ ] **Step 4: Run integration tests**

```bash
npm run test:integration
```

Expected: all 4 new tests pass (plus existing tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add tests/integration/repositories/TrainingPlanRepository.test.ts
git commit -m "test(integration): TrainingPlanRepository stores and hydrates alternative exercise"
```

---

### Task 8: API Swagger Annotation

**Files:**
- Modify: `src/app/api/plans/[id]/items/route.ts`

**Interfaces:**
- Consumes: Nothing new — JSDoc only
- Produces: Updated OpenAPI annotation for `POST /api/plans/{id}/items`

- [ ] **Step 1: Update the JSDoc comment in `src/app/api/plans/[id]/items/route.ts`**

Replace the existing `@swagger` block with:

```ts
/**
 * @swagger
 * /api/plans/{id}/items:
 *   post:
 *     summary: Add item to training plan
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
 *           description: |
 *             Each exercise may optionally carry an alternative.
 *             alternativeExerciseId, alternativeSets, and alternativeReps
 *             must all be present together or all absent.
 *             alternativeExerciseId must differ from exerciseId.
 *     responses:
 *       201:
 *         description: Plan item created
 *       400:
 *         description: Validation error (co-presence violation, self-alternative, invalid fields)
 *       404:
 *         description: Plan not found
 *       422:
 *         description: Alternative exercise ID does not reference an existing exercise
 */
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/plans/[id]/items/route.ts
git commit -m "docs(api): update Swagger annotation for alternative exercise fields"
```

---

### Task 9: i18n Strings

**Files:**
- Modify: `src/i18n/en.json`

**Interfaces:**
- Produces: Keys `planBuilder.addAlternativeExercise`, `planBuilder.alternativeExercise`, `planBuilder.alternativeExercisePlaceholder`, `planBuilder.altRequired`, `sessionRunner.doAlternativeInstead`

- [ ] **Step 1: Add 4 keys to `planBuilder` and 1 to `sessionRunner` in `src/i18n/en.json`**

In the `"planBuilder"` object, add after `"addItemError"`:

```json
"addAlternativeExercise": "Add alternative exercise",
"alternativeExercise": "Alternative exercise",
"alternativeExercisePlaceholder": "Select alternative exercise",
"altRequired": "Alternative exercise {n} is required"
```

In the `"sessionRunner"` object, add after `"reviewButton"`:

```json
"doAlternativeInstead": "Do alternative exercise instead"
```

- [ ] **Step 2: Run typecheck to confirm no i18n type errors**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat(i18n): add alternative exercise strings"
```

---

### Task 10: Trainer UI — AddItemModal

**Files:**
- Modify: `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

**Interfaces:**
- Consumes: `planBuilder.addAlternativeExercise`, `planBuilder.alternativeExercise`, `planBuilder.alternativeExercisePlaceholder`, `planBuilder.altRequired` from i18n (Task 9)
- Produces: Per-row toggle section for alternative exercise with its own ExercisePicker + sets + reps; submit includes alt fields when open

- [ ] **Step 1: Replace `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx` with:**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MAX_SERIES_EXERCISES } from '@/lib/domain/constants'
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

interface Row {
  exerciseId: string
  sets: string
  reps: string
  altOpen: boolean
  altExerciseId: string
  altSets: string
  altReps: string
}

const EMPTY_ROW: Row = {
  exerciseId: '',
  sets: '3',
  reps: '10',
  altOpen: false,
  altExerciseId: '',
  altSets: '3',
  altReps: '10',
}

export function AddItemModal({ planId, allExercises, nextPosition, onSuccess, onClose }: Props) {
  const t = useTranslations('planBuilder')
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addRow() {
    if (rows.length >= MAX_SERIES_EXERCISES) return
    setRows((prev) => [...prev, { ...EMPTY_ROW, sets: prev[0].sets }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i === index) return { ...r, ...patch }
        if (index === 0 && patch.sets !== undefined) return { ...r, sets: patch.sets }
        return r
      }),
    )
  }

  function toggleAlt(index: number) {
    const row = rows[index]
    if (row.altOpen) {
      updateRow(index, { altOpen: false, altExerciseId: '', altSets: '3', altReps: '10' })
    } else {
      updateRow(index, { altOpen: true })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const missingPrimary = rows.findIndex((r) => !r.exerciseId)
    if (missingPrimary !== -1) {
      setError(t('exerciseRequired', { n: missingPrimary + 1 }))
      return
    }

    const missingAlt = rows.findIndex((r) => r.altOpen && !r.altExerciseId)
    if (missingAlt !== -1) {
      setError(t('altRequired', { n: missingAlt + 1 }))
      return
    }

    setSaving(true)
    try {
      const body = {
        position: nextPosition,
        exercises: rows.map((r, i) => ({
          exerciseId: r.exerciseId,
          sets: Number(r.sets),
          reps: Number(r.reps),
          order: i + 1,
          ...(r.altOpen && r.altExerciseId
            ? {
                alternativeExerciseId: r.altExerciseId,
                alternativeSets: Number(r.altSets),
                alternativeReps: Number(r.altReps),
              }
            : {}),
        })),
      }

      const res = await fetch(`/api/plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6 max-h-[90vh]">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('addItem')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {rows.map((row, i) => {
            const selectedEx = allExercises.find((e) => e.id === row.exerciseId) ?? null
            const availableForAlt = allExercises.filter((e) => e.id !== row.exerciseId)
            return (
              <div key={i} className={i > 0 ? 'flex flex-col gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4' : 'flex flex-col gap-3'}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[rgba(255,255,255,0.6)]">{t('exerciseNLabel', { n: i + 1 })}</p>
                  {i > 0 && (
                    <button type="button" onClick={() => removeRow(i)} className="text-sm text-red-400 hover:text-red-300">
                      {t('removeItem')}
                    </button>
                  )}
                </div>
                <ExercisePicker
                  placeholder={t('exerciseNPlaceholder', { n: i + 1 })}
                  exercises={allExercises}
                  value={row.exerciseId}
                  onChange={(id) => updateRow(i, { exerciseId: id })}
                />
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                    <Input
                      name={`sets${i + 1}`}
                      type="number"
                      min="1"
                      value={row.sets}
                      onChange={(e) => updateRow(i, { sets: e.target.value })}
                      required
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">
                      {selectedEx?.trackingType === 'TIME' ? t('duration') : t('reps')}
                    </label>
                    <Input
                      name={`reps${i + 1}`}
                      type="number"
                      min="1"
                      value={row.reps}
                      onChange={(e) => updateRow(i, { reps: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="self-start text-sm text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]"
                  onClick={() => toggleAlt(i)}
                >
                  {row.altOpen ? '▲' : '▼'} {t('addAlternativeExercise')}
                </button>

                {row.altOpen && (
                  <div className="flex flex-col gap-3 rounded border border-[rgba(255,255,255,0.08)] p-3">
                    <p className="text-xs font-medium text-[rgba(255,255,255,0.5)]">{t('alternativeExercise')}</p>
                    <ExercisePicker
                      placeholder={t('alternativeExercisePlaceholder')}
                      exercises={availableForAlt}
                      value={row.altExerciseId}
                      onChange={(id) => updateRow(i, { altExerciseId: id })}
                    />
                    <div className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                        <Input
                          name={`altSets${i + 1}`}
                          type="number"
                          min="1"
                          value={row.altSets}
                          onChange={(e) => updateRow(i, { altSets: e.target.value })}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('reps')}</label>
                        <Input
                          name={`altReps${i + 1}`}
                          type="number"
                          min="1"
                          value={row.altReps}
                          onChange={(e) => updateRow(i, { altReps: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {rows.length < MAX_SERIES_EXERCISES && (
            <Button type="button" variant="ghost" onClick={addRow}>
              {t('addExercise')}
            </Button>
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

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx
git commit -m "feat(ui): add alternative exercise section to AddItemModal"
```

---

### Task 11: Trainee UI — PlanSessionRunner

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

**Interfaces:**
- Consumes:
  - `TrainingPlanWithDetails` from Task 3 — `exercises[].alternativeExercise`, `exercises[].alternativeSets`, `exercises[].alternativeReps`
  - `sessionRunner.doAlternativeInstead` from i18n (Task 9)
- Produces: Per-slot alternative switch button (single + series); one-way activation; effective exercise used for logging

**Note on series sets:** In series items, `totalSets` always uses the primary exercise's set count (`sorted[0].sets`). If an alternative has a different `alternativeSets`, it is not used as the series termination count — the series ends at the primary's set count. This is a V1 simplification consistent with the spec's one-way switch and the series equal-sets invariant.

- [ ] **Step 1: Replace `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` with:**

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import { PlanReviewOverlay } from '@/components/PlanReviewOverlay'
import { SetLogger } from '@/components/SetLogger'
import { SeriesSetLogger } from '@/components/SeriesSetLogger'
import { RestTimerScreen } from '@/components/RestTimerScreen'
import type { SetLogData } from '@/components/SeriesSetLogger'
import { fadeSlideUp, springTransition } from '@/lib/animation'
import { playSetComplete } from '@/lib/audio'
import type { TrainingPlanWithDetails } from '@/lib/domain/plan'

interface Props {
  plan: TrainingPlanWithDetails
  traineeId: string
}

export function PlanSessionRunner({ plan, traineeId }: Props) {
  const t = useTranslations('sessionRunner')
  const tSession = useTranslations('session')
  const router = useRouter()
  const [phase, setPhase] = useState<'ready' | 'running'>('ready')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [itemIndex, setItemIndex] = useState(0)
  const [setProgress, setSetProgress] = useState<Record<string, number>>({})
  const [logError, setLogError] = useState<string | null>(null)
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)
  const [seriesRoundProgress, setSeriesRoundProgress] = useState<Record<string, number>>({})
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [alternativeActive, setAlternativeActive] = useState<Record<string, boolean>>({})
  const logging = useRef(false)
  const starting = useRef(false)

  const totalExercises = plan.items.reduce((sum, item) => sum + item.exercises.length, 0)
  const totalSets = plan.items.reduce(
    (sum, item) => item.exercises.reduce((s, ex) => s + ex.sets, sum),
    0,
  )
  const completedItemIds = new Set(
    plan.items.filter((_, idx) => idx < itemIndex).map((item) => item.id),
  )

  function activateAlternative(slotId: string) {
    setAlternativeActive((prev) => ({ ...prev, [slotId]: true }))
  }

  async function handleStart() {
    if (starting.current) return
    starting.current = true
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId, planId: plan.id }),
      })
      if (!res.ok) return
      const s = await res.json()
      setSessionId(s.id)
      setPhase('running')
    } finally {
      starting.current = false
    }
  }

  const currentItem = plan.items[itemIndex]

  async function handleMarkDone(
    planItemExerciseId: string,
    exerciseId: string,
    sets: number,
    data: { weightKg?: number; repsDone?: number; durationSecs?: number },
  ) {
    if (!sessionId) return
    if (logging.current) return
    logging.current = true
    setLogError(null)
    const currentSet = (setProgress[planItemExerciseId] ?? 0) + 1

    try {
      const res = await fetch(`/api/sessions/${sessionId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          planItemId: currentItem!.id,
          setNumber: currentSet,
          weightKg: data.weightKg ?? null,
          repsDone: data.repsDone ?? null,
          durationSecs: data.durationSecs ?? undefined,
        }),
      })
      if (!res.ok) {
        setLogError(t('logError'))
        return
      }
    } catch {
      setLogError(t('logError'))
      return
    } finally {
      logging.current = false
    }

    const newProgress = { ...setProgress, [planItemExerciseId]: currentSet }
    setSetProgress(newProgress)
    playSetComplete()

    const allDone = currentItem!.exercises.every((ex) => {
      const effectiveSets = alternativeActive[ex.id] && ex.alternativeSets != null
        ? ex.alternativeSets
        : ex.sets
      return (newProgress[ex.id] ?? 0) >= effectiveSets
    })
    if (!allDone) return

    if (itemIndex + 1 >= plan.items.length) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}&planId=${plan.id}`)
      return
    }
    setItemIndex((prev) => prev + 1)
  }

  async function handleSeriesSetDone(data: SetLogData[]) {
    if (!sessionId || logging.current) return
    logging.current = true
    setLogError(null)

    const sorted = currentItem!.exercises.slice().sort((a, b) => a.order - b.order)
    const setNumber = (seriesRoundProgress[currentItem!.id] ?? 0) + 1

    try {
      const responses = await Promise.all(
        sorted.map((ex, i) => {
          const effectiveExerciseId =
            alternativeActive[ex.id] && ex.alternativeExercise
              ? ex.alternativeExercise.id
              : ex.exerciseId
          return fetch(`/api/sessions/${sessionId}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exerciseId: effectiveExerciseId,
              planItemId: currentItem!.id,
              setNumber,
              weightKg: data[i].weightKg ?? null,
              repsDone: data[i].repsDone ?? null,
              durationSecs: data[i].durationSecs ?? undefined,
            }),
          })
        }),
      )
      if (responses.some((res) => !res.ok)) {
        setLogError(t('logError'))
        return
      }
    } catch {
      setLogError(t('logError'))
      return
    } finally {
      logging.current = false
    }

    const seriesTotalSets = sorted[0].sets
    setSeriesRoundProgress((prev) => ({ ...prev, [currentItem!.id]: setNumber }))
    playSetComplete()

    if (setNumber < seriesTotalSets) {
      setShowRestTimer(true)
      return
    }

    setShowRestTimer(false)
    if (itemIndex + 1 >= plan.items.length) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}&planId=${plan.id}`)
      return
    }
    setItemIndex((prev) => prev + 1)
  }

  const sessionContent = (
    <AnimatePresence mode="wait">
      {phase === 'ready' && (
        <motion.div
          key="ready"
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          exit={fadeSlideUp.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-6 px-4"
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 top-4 text-[rgba(255,255,255,0.6)] hover:text-white"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <Button type="button" variant="ghost" size="sm" onClick={() => setReviewOpen(true)} className="absolute right-4 top-4">
            {t('reviewButton')}
          </Button>

          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="font-display text-2xl font-bold">{plan.name}</h1>
              <p className="text-sm text-[rgba(255,255,255,0.6)]">
                {tSession('ready.exerciseCount', { count: totalExercises, sets: totalSets })}
              </p>
            </div>
            <hr className="border-[rgba(255,255,255,0.08)]" />
            <p className="text-center italic text-[rgba(255,255,255,0.4)]">{tSession('ready.tagline')}</p>
            <motion.div whileTap={{ scale: 0.97 }} transition={springTransition}>
              <Button type="button" variant="primary" size="lg" className="w-full" onClick={handleStart}>
                {tSession('ready.cta')}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {phase === 'running' && currentItem && (
        <motion.div
          key="running"
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          exit={fadeSlideUp.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          {(() => {
            const isSeries = currentItem.exercises.length > 1

            if (showRestTimer) {
              return <RestTimerScreen onComplete={() => setShowRestTimer(false)} />
            }

            if (isSeries) {
              const sorted = currentItem.exercises.slice().sort((a, b) => a.order - b.order)
              const currentRound = seriesRoundProgress[currentItem.id] ?? 0

              const effectiveSorted = sorted.map((ex) => {
                const isAlt = !!alternativeActive[ex.id] && !!ex.alternativeExercise
                return {
                  id: ex.id,
                  name: isAlt ? ex.alternativeExercise!.name : ex.exercise.name,
                  targetReps: isAlt ? (ex.alternativeReps ?? ex.reps) : ex.reps,
                  trackingType: isAlt
                    ? (ex.alternativeExercise!.trackingType as 'WEIGHT' | 'TIME' | 'NONE')
                    : (ex.exercise.trackingType as 'WEIGHT' | 'TIME' | 'NONE'),
                }
              })

              const altKey = sorted
                .filter((ex) => alternativeActive[ex.id])
                .map((ex) => ex.id)
                .join('-')

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setReviewOpen(true)}>
                        {t('reviewButton')}
                      </Button>
                      <span className="text-sm text-[rgba(255,255,255,0.4)]">
                        {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
                      </span>
                    </div>
                  </div>

                  {currentRound === 0 && sorted.some((ex) => ex.alternativeExercise && !alternativeActive[ex.id]) && (
                    <div className="flex flex-col gap-1">
                      {sorted.map((ex) =>
                        ex.alternativeExercise && !alternativeActive[ex.id] ? (
                          <button
                            key={ex.id}
                            type="button"
                            className="self-start text-left text-sm text-[rgba(255,255,255,0.4)] underline hover:text-[rgba(255,255,255,0.7)]"
                            onClick={() => activateAlternative(ex.id)}
                          >
                            {t('doAlternativeInstead')} ({ex.exercise.name} → {ex.alternativeExercise.name})
                          </button>
                        ) : null,
                      )}
                    </div>
                  )}

                  <SeriesSetLogger
                    key={altKey}
                    setNumber={currentRound + 1}
                    totalSets={sorted[0].sets}
                    exercises={effectiveSorted}
                    onMarkDone={handleSeriesSetDone}
                  />
                  {logError && <p className="text-sm text-red-400">{logError}</p>}
                </>
              )
            }

            return (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setReviewOpen(true)}>
                      {t('reviewButton')}
                    </Button>
                    <span className="text-sm text-[rgba(255,255,255,0.4)]">
                      {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
                    </span>
                  </div>
                </div>
                {currentItem.exercises.map((ex) => {
                  const currentSet = setProgress[ex.id] ?? 0
                  const isAltActive = !!alternativeActive[ex.id] && !!ex.alternativeExercise
                  const effectiveExercise = isAltActive ? ex.alternativeExercise! : ex.exercise
                  const effectiveSets = isAltActive && ex.alternativeSets != null ? ex.alternativeSets : ex.sets
                  const effectiveReps = isAltActive && ex.alternativeReps != null ? ex.alternativeReps : ex.reps
                  const effectiveExerciseId = isAltActive ? ex.alternativeExercise!.id : ex.exerciseId
                  const setsLeft = effectiveSets - currentSet

                  return (
                    <div key={ex.id} className="flex flex-col gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-bold">{effectiveExercise.name}</h2>
                        {effectiveExercise.description && (
                          <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">
                            {effectiveExercise.description}
                          </p>
                        )}
                      </div>

                      {ex.alternativeExercise && currentSet === 0 && !isAltActive && (
                        <button
                          type="button"
                          className="self-start text-sm text-[rgba(255,255,255,0.4)] underline hover:text-[rgba(255,255,255,0.7)]"
                          onClick={() => activateAlternative(ex.id)}
                        >
                          {t('doAlternativeInstead')}
                        </button>
                      )}

                      {effectiveExercise.media.length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setViewerOpenFor(ex.id)}
                          className="hover:border-[#E85D26]"
                        >
                          {t('viewMedia')} ({effectiveExercise.media.length})
                        </Button>
                      )}
                      {viewerOpenFor === ex.id && (
                        <MediaViewer media={effectiveExercise.media} onClose={() => setViewerOpenFor(null)} />
                      )}
                      {setsLeft > 0 && (
                        <SetLogger
                          key={`${ex.id}-${currentSet}-${isAltActive}`}
                          setNumber={currentSet + 1}
                          totalSets={effectiveSets}
                          targetReps={effectiveReps}
                          trackingType={effectiveExercise.trackingType as 'WEIGHT' | 'TIME' | 'NONE'}
                          onMarkDone={(data) => handleMarkDone(ex.id, effectiveExerciseId, effectiveSets, data)}
                        />
                      )}
                      {setsLeft === 0 && (
                        <p className="font-semibold text-[rgba(255,255,255,0.4)]">{t('allSetsDone')}</p>
                      )}
                    </div>
                  )
                })}
                {logError && <p className="text-sm text-red-400">{logError}</p>}
              </>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {sessionContent}
      {reviewOpen && (
        <PlanReviewOverlay
          plan={plan}
          onClose={() => setReviewOpen(false)}
          completedItemIds={phase === 'running' ? completedItemIds : undefined}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx
git commit -m "feat(ui): add alternative exercise switch to PlanSessionRunner"
```

---

### Task 12: E2E Tests

**Files:**
- Modify: `tests/e2e/helpers/setup.ts`
- Create: `tests/e2e/alternative-exercise.spec.ts`

**Interfaces:**
- Consumes: `seedExercise`, `seedTrainee`, `seedPlan`, `cleanDatabase` from `tests/e2e/helpers/setup.ts`
- Produces: `seedPlanWithAlternative` helper; 4 E2E scenarios

- [ ] **Step 1: Add `seedPlanWithAlternative` to `tests/e2e/helpers/setup.ts`**

Append after the existing `seedSession` export:

```ts
export async function seedPlanWithAlternative(data: {
  name: string
  primaryExerciseId: string
  alternativeExerciseId: string
  primarySets?: number
  primaryReps?: number
  alternativeSets?: number
  alternativeReps?: number
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  const item = await prisma.trainingPlanItem.create({
    data: { planId: plan.id, position: 1 },
  })
  await prisma.trainingPlanItemExercise.create({
    data: {
      itemId: item.id,
      exerciseId: data.primaryExerciseId,
      sets: data.primarySets ?? 3,
      reps: data.primaryReps ?? 10,
      order: 1,
      alternativeExerciseId: data.alternativeExerciseId,
      alternativeSets: data.alternativeSets ?? 2,
      alternativeReps: data.alternativeReps ?? 8,
    },
  })
  return plan
}
```

- [ ] **Step 2: Create `tests/e2e/alternative-exercise.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
import { seedExercise, seedTrainee, seedPlan, seedPlanWithAlternative, cleanDatabase } from './helpers/setup'

test.describe('Alternative Exercise', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
  })

  test('slot without alternative shows no switch button', async ({ page }) => {
    const primary = await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    await seedTrainee({ name: 'Alex' })
    await seedPlan({ name: 'No-Alt Plan', items: [{ exerciseId: primary.id, sets: 3, reps: 10 }] })

    await page.goto('/')
    await page.click('text=Alex')
    await page.click('text=Start Training')
    await page.click('text=No-Alt Plan')
    await page.click('button:has-text("LET\'S GO")')

    await expect(page.locator('text=Do alternative exercise instead')).not.toBeVisible()
  })

  test('trainee sees alternative button and switches to alternative', async ({ page }) => {
    const primary = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    const alt = await seedExercise({ name: 'Push Up', trackingType: 'WEIGHT' })
    await seedTrainee({ name: 'Alex' })
    await seedPlanWithAlternative({
      name: 'Swap Plan',
      primaryExerciseId: primary.id,
      alternativeExerciseId: alt.id,
    })

    await page.goto('/')
    await page.click('text=Alex')
    await page.click('text=Start Training')
    await page.click('text=Swap Plan')
    await page.click('button:has-text("LET\'S GO")')

    await expect(page.locator('h2:has-text("Bench Press")')).toBeVisible()
    await expect(page.locator('text=Do alternative exercise instead')).toBeVisible()

    await page.click('text=Do alternative exercise instead')

    await expect(page.locator('h2:has-text("Push Up")')).toBeVisible()
    await expect(page.locator('h2:has-text("Bench Press")')).not.toBeVisible()
    await expect(page.locator('text=Do alternative exercise instead')).not.toBeVisible()
  })

  test('alternative button disappears after first set is logged', async ({ page }) => {
    const primary = await seedExercise({ name: 'Deadlift', trackingType: 'WEIGHT' })
    const alt = await seedExercise({ name: 'Romanian Deadlift', trackingType: 'WEIGHT' })
    await seedTrainee({ name: 'Alex' })
    await seedPlanWithAlternative({
      name: 'Swap Plan',
      primaryExerciseId: primary.id,
      alternativeExerciseId: alt.id,
    })

    await page.goto('/')
    await page.click('text=Alex')
    await page.click('text=Start Training')
    await page.click('text=Swap Plan')
    await page.click('button:has-text("LET\'S GO")')

    await expect(page.locator('text=Do alternative exercise instead')).toBeVisible()

    await page.fill('[name=weightKg]', '80')
    await page.fill('[name=repsDone]', '10')
    await page.click('button:has-text("Mark Done")')

    await expect(page.locator('text=Do alternative exercise instead')).not.toBeVisible()
  })

  test('trainer can add plan item with alternative exercise via AddItemModal', async ({ page }) => {
    const primary = await seedExercise({ name: 'Overhead Press', trackingType: 'WEIGHT' })
    const alt = await seedExercise({ name: 'Dumbbell Press', trackingType: 'WEIGHT' })

    await page.goto('/trainer/plans')
    await page.click('button:has-text("New Plan")')
    await page.fill('input[name=name]', 'Alt Test Plan')
    await page.click('button:has-text("Save")')

    await page.click('button:has-text("Add Item")')
    await page.fill('input[placeholder="Exercise 1"]', 'Overhead')
    await page.click('text=Overhead Press')

    await page.click('text=Add alternative exercise')
    await page.fill('input[placeholder="Select alternative exercise"]', 'Dumbbell')
    await page.click('text=Dumbbell Press')

    await page.click('button:has-text("Add Item")')

    await expect(page.locator('text=Overhead Press')).toBeVisible()
  })
})
```

- [ ] **Step 3: Build the Docker test image**

```bash
docker compose -f docker-compose.test.yml build
```

Expected: build completes without errors.

- [ ] **Step 4: Run the E2E tests**

```bash
npx playwright test tests/e2e/alternative-exercise.spec.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Run full E2E suite to check no regressions**

```bash
npm run test:e2e
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/helpers/setup.ts tests/e2e/alternative-exercise.spec.ts
git commit -m "test(e2e): add alternative exercise E2E scenarios"
```
