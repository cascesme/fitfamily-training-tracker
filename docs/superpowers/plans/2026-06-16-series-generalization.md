# Series Generalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 2-exercise "biseries" concept with a generalized "series" concept supporting 1–5 exercises performed back-to-back with one shared round counter and rest timer. Full rename throughout: DB field (`slot`→`order`), components (`BiSeriesSetLogger`→`SeriesSetLogger`), business rule tags, i18n keys, and docs.

**Architecture:** `TrainingPlanItemExercise.order` (renamed from `slot`) replaces the fixed 1/2 slot system; `MAX_SERIES_EXERCISES = 5` caps array length at the Zod layer. `TrainingPlanService.addItem` replaces 3 hardcoded 2-exercise checks with 2 N-aware checks (contiguous order, equal sets). `SeriesSetLogger` (renamed from `BiSeriesSetLogger`) takes an `exercises: SeriesExercise[]` array instead of fixed `exerciseA`/`exerciseB` props. `PlanSessionRunner` sorts by `order` and maps over N exercises instead of branching on a fixed pair. `AddItemModal` replaces the Single/Biseries mode toggle with dynamic add/remove exercise rows (1–5).

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript · Prisma · PostgreSQL 17 · next-intl · Tailwind CSS 4 · Jest + @testing-library/react + Testcontainers · Playwright

**Design spec:** `docs/superpowers/specs/2026-06-16-series-generalization-design.md`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/domain/constants.ts` | Add `MAX_SERIES_EXERCISES = 5` |
| `src/lib/domain/plan.ts` | `AddPlanItemSchema`: `slot`→`order`, max 2→`MAX_SERIES_EXERCISES`; `ITrainingPlanRepository`: rename `findItemSlot`→`findItemAtOrder`, `slot`→`order` in signatures |
| `tests/unit/domain/plan.test.ts` | Rename biseries cases to series; add 5-exercise, 6-exercise-rejected, non-contiguous-order cases |
| `src/lib/services/TrainingPlanService.ts` | Replace 3 hardcoded 2-exercise checks with 2 N-aware checks; rename rule tags |
| `tests/unit/services/TrainingPlanService.test.ts` | Rename biseries cases; add 5-exercise, unequal-sets-across-3, non-contiguous cases |
| `prisma/schema.prisma` | `TrainingPlanItemExercise.slot`→`order`; unique constraint follows |
| `src/lib/repositories/TrainingPlanRepository.ts` | `orderBy: { slot }`→`{ order }`; `findItemSlot`→`findItemAtOrder` |
| `tests/integration/repositories/TrainingPlanRepository.test.ts` | Rename biseries cases; add 5-exercise persistence case |
| `src/components/BiSeriesSetLogger.tsx` → `src/components/SeriesSetLogger.tsx` | Rename file; array-based props/state instead of fixed A/B |
| `tests/unit/components/BiSeriesSetLogger.test.tsx` → `tests/unit/components/SeriesSetLogger.test.tsx` | Rename file; array-based assertions; add 3-exercise case |
| `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` | Generalize biseries branch to N-exercise series branch |
| `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx` | Replace Single/Biseries toggle with dynamic rows (1–5) |
| `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx` | Badge logic generalized; order by `order` |
| `src/i18n/en.json` | Rename biseries-related keys in `session` and `planBuilder` namespaces |
| `tests/e2e/trainer.spec.ts` | Rename biseries test to series |
| `tests/e2e/failure-paths.spec.ts` | Rename + generalize message; add 6th-exercise-rejected test |
| `tests/e2e/trainee.spec.ts` | Rename biseries test to series; extend to 3 exercises |
| `tests/e2e/helpers/setup.ts` | Rename `seedBiseriePlan`→`seedSeriesPlan`, generalize to N exercises |
| `CLAUDE.md` | Update business rule bullet |

---

## Task 1: Constants + Zod Schema (TDD)

**Files:**
- Modify: `tests/unit/domain/plan.test.ts`
- Modify: `src/lib/domain/constants.ts`
- Modify: `src/lib/domain/plan.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/domain/plan.test.ts`, replace the entire `describe('AddPlanItemSchema', ...)` block (lines 37–85) with:

```typescript
describe('AddPlanItemSchema', () => {
  it('accepts single exercise item', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, order: 1 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts series item with two exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 2,
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'ex2', sets: 3, reps: 10, order: 2 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts series item with five exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 3,
      exercises: [1, 2, 3, 4, 5].map((order) => ({ exerciseId: `ex${order}`, sets: 3, reps: 10, order })),
    })
    expect(result.success).toBe(true)
  })

  it('rejects series item with six exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [1, 2, 3, 4, 5, 6].map((order) => ({ exerciseId: `ex${order}`, sets: 3, reps: 10, order })),
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty exercises array', () => {
    const result = AddPlanItemSchema.safeParse({ position: 1, exercises: [] })
    expect(result.success).toBe(false)
  })

  it('rejects order value above MAX_SERIES_EXERCISES', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, order: 6 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative position', () => {
    const result = AddPlanItemSchema.safeParse({
      position: -1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, order: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero sets', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 0, reps: 10, order: 1 }],
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/plan.test.ts
```

Expected: FAIL — schema still uses `slot` with `.max(2)`.

- [ ] **Step 3: Add `MAX_SERIES_EXERCISES` constant**

In `src/lib/domain/constants.ts`, add:

```typescript
export const MAX_SERIES_EXERCISES = 5
```

- [ ] **Step 4: Update `AddPlanItemSchema` and `ITrainingPlanRepository`**

In `src/lib/domain/plan.ts`:

```typescript
import { MAX_SERIES_EXERCISES } from '@/lib/domain/constants'

// ...

export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
  })).min(1).max(MAX_SERIES_EXERCISES),
})
```

Update `ITrainingPlanRepository`:

```typescript
export interface ITrainingPlanRepository {
  findAll(): Promise<TrainingPlan[]>
  findById(id: string): Promise<TrainingPlan | null>
  findWithItems(id: string): Promise<TrainingPlan | null>
  findForSession(id: string): Promise<TrainingPlanWithDetails | null>
  create(data: CreatePlanInput): Promise<TrainingPlan>
  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan>
  delete(id: string): Promise<void>
  addItem(planId: string, position: number, exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>): Promise<TrainingPlanItem>
  removeItem(itemId: string): Promise<void>
  reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null>
}
```

- [ ] **Step 5: Run to confirm PASS**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/domain/plan.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/constants.ts src/lib/domain/plan.ts tests/unit/domain/plan.test.ts
git commit -m "feat(series): generalize AddPlanItemSchema from biseries slot(1-2) to series order(1-5)"
```

---

## Task 2: Service Validation Generalization (TDD)

**Files:**
- Modify: `tests/unit/services/TrainingPlanService.test.ts`
- Modify: `src/lib/services/TrainingPlanService.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/services/TrainingPlanService.test.ts`:

Rename the mock field `findItemSlot: jest.fn()` (line 16) → `findItemAtOrder: jest.fn()`.

Replace the entire `describe('addItem', ...)` block (lines 72–114) with:

```typescript
describe('addItem', () => {
  it('adds single exercise item without order validation', async () => {
    mockRepo.addItem.mockResolvedValue(mockPlanItem)
    await service.addItem('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }])
    expect(mockRepo.addItem).toHaveBeenCalledWith('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }])
  })

  it('allows series when order 1 and order 2 both present with equal sets', async () => {
    mockRepo.addItem.mockResolvedValue(mockPlanItem)
    await service.addItem('p1', 1, [
      { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
      { exerciseId: 'e2', sets: 3, reps: 10, order: 2 },
    ])
    expect(mockRepo.addItem).toHaveBeenCalled()
  })

  it('allows series with five exercises at equal sets and contiguous order', async () => {
    mockRepo.addItem.mockResolvedValue(mockPlanItem)
    await service.addItem('p1', 1, [1, 2, 3, 4, 5].map((order) => ({
      exerciseId: `e${order}`, sets: 3, reps: 10, order,
    })))
    expect(mockRepo.addItem).toHaveBeenCalled()
  })

  it('throws ValidationError when two exercises share the same order', async () => {
    await expect(
      service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'e2', sets: 3, reps: 10, order: 1 },
      ])
    ).rejects.toThrow(ValidationError)
    expect(mockRepo.addItem).not.toHaveBeenCalled()
  })

  it('throws ValidationError when order values are not contiguous from 1', async () => {
    await expect(
      service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'e2', sets: 3, reps: 10, order: 3 },
      ])
    ).rejects.toThrow(ValidationError)
    expect(mockRepo.addItem).not.toHaveBeenCalled()
  })

  it('throws ValidationError when series exercises have unequal set counts', async () => {
    await expect(
      service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'e2', sets: 4, reps: 10, order: 2 },
      ])
    ).rejects.toThrow(ValidationError)
    expect(mockRepo.addItem).not.toHaveBeenCalled()
  })

  it('throws ValidationError when unequal sets appear among three or more exercises', async () => {
    await expect(
      service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'e2', sets: 3, reps: 10, order: 2 },
        { exerciseId: 'e3', sets: 4, reps: 10, order: 3 },
      ])
    ).rejects.toThrow(ValidationError)
    expect(mockRepo.addItem).not.toHaveBeenCalled()
  })

  it('throws ValidationError when order 2 provided without order 1 in item', async () => {
    await expect(
      service.addItem('p1', 1, [{ exerciseId: 'e2', sets: 3, reps: 10, order: 2 }])
    ).rejects.toThrow(ValidationError)
    expect(mockRepo.addItem).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: FAIL — type errors (`order` doesn't exist on `PlanItemExerciseInput` yet) and the new contiguous/3-exercise cases aren't handled.

- [ ] **Step 3: Replace `addItem` validation logic**

In `src/lib/services/TrainingPlanService.ts`, update the `PlanItemExerciseInput` interface (lines 5–10):

```typescript
interface PlanItemExerciseInput {
  exerciseId: string
  sets: number
  reps: number
  order: number
}
```

Replace the entire body of `addItem` (lines 55–87) with:

```typescript
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

  const item = await this.repo.addItem(planId, position, exercises)
  logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: item.id, outcome: 'created' }, 'Plan item added')
  return item
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/TrainingPlanService.ts tests/unit/services/TrainingPlanService.test.ts
git commit -m "feat(series): generalize TrainingPlanService.addItem from 2-exercise biseries to N-exercise series"
```

---

## Task 3: Prisma Schema Rename, Migration, Repository (Integration)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/repositories/TrainingPlanRepository.ts`
- Modify: `tests/integration/repositories/TrainingPlanRepository.test.ts`

- [ ] **Step 1: Rename the schema field**

In `prisma/schema.prisma`, in `model TrainingPlanItemExercise`:

```prisma
model TrainingPlanItemExercise {
  id         String           @id @default(cuid())
  itemId     String
  item       TrainingPlanItem @relation(fields: [itemId], references: [id])
  exerciseId String
  exercise   Exercise         @relation(fields: [exerciseId], references: [id])
  sets       Int
  reps       Int
  order      Int

  @@unique([itemId, order])
}
```

- [ ] **Step 2: Generate the migration**

```bash
cd /home/ccastro/Projects/training-assistant
~/.nvm/versions/node/v24.1.0/bin/npx prisma migrate dev --name rename_slot_to_order
```

Expected: Prisma detects the column rename (may prompt to confirm rename vs drop+add — confirm **rename** to preserve existing data). Verify the generated SQL in `prisma/migrations/<timestamp>_rename_slot_to_order/migration.sql` uses `RENAME COLUMN "slot" TO "order"` and renames the unique index, not a drop/recreate.

- [ ] **Step 3: Update the repository**

In `src/lib/repositories/TrainingPlanRepository.ts`:

- `findWithItems` (line 30): `orderBy: { slot: 'asc' }` → `orderBy: { order: 'asc' }`
- `findForSession` (line 45): same change
- `addItem` signature (line 73): `slot: number` → `order: number`
- `findItemSlot` (lines 104–108) → rename to `findItemAtOrder`:

```typescript
findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null> {
  return this.prisma.trainingPlanItemExercise.findUnique({
    where: { itemId_order: { itemId, order } },
  })
}
```

- [ ] **Step 4: Update integration tests**

In `tests/integration/repositories/TrainingPlanRepository.test.ts`:

- Replace all `slot: 1` / `slot: 2` literals with `order: 1` / `order: 2`.
- Replace `full?.items![0].exercises![0].slot` → `.order` (line 64).
- Rename `'addItem creates biseries item with two exercises'` (line 67) → `'addItem creates series item with two exercises'`.
- Add a new test after it:

```typescript
it('addItem creates series item with five exercises', async () => {
  const others = await Promise.all(
    [2, 3, 4, 5].map((n) => db.prisma.exercise.create({ data: { name: `Ex${n}`, trackingType: 'WEIGHT' } })),
  )
  const plan = await repo.create({ name: 'P' })
  await repo.addItem(plan.id, 1, [
    { exerciseId, sets: 3, reps: 10, order: 1 },
    ...others.map((ex, i) => ({ exerciseId: ex.id, sets: 3, reps: 10, order: i + 2 })),
  ])
  const full = await repo.findWithItems(plan.id)
  expect(full?.items![0].exercises).toHaveLength(5)
})
```

- Rename `'findItemSlot returns exercise for matching slot'` (line 111) → `'findItemAtOrder returns exercise for matching order'`, update body to call `repo.findItemAtOrder(itemId, 1)` and assert `.order` instead of `.slot`.
- Rename `'findItemSlot returns null for missing slot'` (line 121) → `'findItemAtOrder returns null for missing order'`, update body to call `repo.findItemAtOrder(itemId, 2)`.

- [ ] **Step 5: Run integration tests**

```bash
~/.nvm/versions/node/v24.1.0/bin/npm run test:integration
```

Expected: all green (Testcontainers spins up Postgres 17, runs migrations including the new rename migration).

- [ ] **Step 6: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Note: this will still show errors in files not yet updated (`TrainingPlanService` callers, components) — expected until later tasks land. Confirm no errors specifically in `prisma/schema.prisma`-generated types or `TrainingPlanRepository.ts`.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/repositories/TrainingPlanRepository.ts tests/integration/repositories/TrainingPlanRepository.test.ts
git commit -m "feat(series): rename TrainingPlanItemExercise.slot to order, generalize repository"
```

---

## Task 4: `SeriesSetLogger` Component — Rename + Generalize (TDD)

**Files:**
- Rename: `src/components/BiSeriesSetLogger.tsx` → `src/components/SeriesSetLogger.tsx`
- Rename: `tests/unit/components/BiSeriesSetLogger.test.tsx` → `tests/unit/components/SeriesSetLogger.test.tsx`
- Modify: `src/i18n/en.json` (`session.biSeriesBadge` → `session.seriesBadge`)

- [ ] **Step 1: Rename files**

```bash
git mv src/components/BiSeriesSetLogger.tsx src/components/SeriesSetLogger.tsx
git mv tests/unit/components/BiSeriesSetLogger.test.tsx tests/unit/components/SeriesSetLogger.test.tsx
```

- [ ] **Step 2: Write the failing tests**

Replace the full contents of `tests/unit/components/SeriesSetLogger.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SeriesSetLogger } from '@/components/SeriesSetLogger'
import type { SeriesExercise } from '@/components/SeriesSetLogger'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

const exerciseA: SeriesExercise = { id: 'a1', name: 'Bench Press', targetReps: 10, trackingType: 'WEIGHT' }
const exerciseB: SeriesExercise = { id: 'b1', name: 'Barbell Row', targetReps: 10, trackingType: 'WEIGHT' }
const exerciseC: SeriesExercise = { id: 'c1', name: 'Lat Pulldown', targetReps: 12, trackingType: 'WEIGHT' }

describe('SeriesSetLogger', () => {
  it('renders all exercise cards with names for a 2-exercise series', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB]} onMarkDone={jest.fn()} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('renders all exercise cards with names for a 3-exercise series', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB, exerciseC]} onMarkDone={jest.fn()} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
    expect(screen.getByText('Lat Pulldown')).toBeInTheDocument()
  })

  it('button is disabled when any WEIGHT exercise has no weight filled', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB, exerciseC]} onMarkDone={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeDisabled()
  })

  it('button is enabled when all required inputs filled across all exercises', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB, exerciseC]} onMarkDone={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Lat Pulldown weight kg'), { target: { value: '40' } })
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })

  it('calls onMarkDone with an array of data matching exercise order', async () => {
    const onMarkDone = jest.fn().mockResolvedValue(undefined)
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB]} onMarkDone={onMarkDone} />)
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Bench Press reps done'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Barbell Row reps done'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'markSetDone' }))
    await waitFor(() => {
      expect(onMarkDone).toHaveBeenCalledWith([
        { weightKg: 80, repsDone: 10 },
        { weightKg: 60, repsDone: 10 },
      ])
    })
  })

  it('renders duration input for TIME tracking type mixed with WEIGHT', () => {
    const timeExA: SeriesExercise = { ...exerciseA, trackingType: 'TIME' }
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[timeExA, exerciseB]} onMarkDone={jest.fn()} />)
    expect(screen.getByLabelText('Bench Press duration seconds')).toBeInTheDocument()
  })

  it('NONE tracking type: button enabled with only reps pre-filled', () => {
    const noneExA: SeriesExercise = { ...exerciseA, trackingType: 'NONE' }
    const noneExB: SeriesExercise = { ...exerciseB, trackingType: 'NONE' }
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[noneExA, noneExB]} onMarkDone={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })
})
```

- [ ] **Step 3: Run to confirm FAIL**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/SeriesSetLogger.test.tsx
```

Expected: FAIL — `SeriesSetLogger` doesn't exist yet (file still exports `BiSeriesSetLogger`).

- [ ] **Step 4: Rewrite `SeriesSetLogger.tsx`**

Replace the full contents of `src/components/SeriesSetLogger.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export type SetLogData = {
  weightKg?: number | null
  repsDone?: number | null
  durationSecs?: number | null
}

export interface SeriesExercise {
  id: string
  name: string
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
}

interface ExerciseInputState {
  weight: string
  reps: string
  duration: string
}

function initialState(targetReps: number): ExerciseInputState {
  return { weight: '', reps: targetReps.toString(), duration: '' }
}

function isValid(state: ExerciseInputState, trackingType: 'WEIGHT' | 'TIME' | 'NONE'): boolean {
  if (trackingType === 'TIME') return state.duration.trim() !== ''
  if (trackingType === 'WEIGHT') return state.weight.trim() !== '' && state.reps.trim() !== ''
  return state.reps.trim() !== ''
}

function toLogData(state: ExerciseInputState, trackingType: 'WEIGHT' | 'TIME' | 'NONE'): SetLogData {
  if (trackingType === 'TIME') return { durationSecs: parseInt(state.duration) }
  return {
    weightKg: trackingType === 'WEIGHT' ? parseFloat(state.weight) : null,
    repsDone: parseInt(state.reps),
  }
}

interface SeriesSetLoggerProps {
  setNumber: number
  totalSets: number
  exercises: SeriesExercise[]
  onMarkDone: (data: SetLogData[]) => Promise<void>
}

function ExerciseCard({
  exercise,
  state,
  onChange,
}: {
  exercise: SeriesExercise
  state: ExerciseInputState
  onChange: (updater: (s: ExerciseInputState) => ExerciseInputState) => void
}) {
  const t = useTranslations('session')
  return (
    <div className="border-l-2 border-[#E85D26] bg-[#111111] p-4">
      <h2 className="font-display text-lg font-bold">{exercise.name}</h2>
      <p className="mb-3 text-sm text-[rgba(255,255,255,0.6)]">
        {exercise.trackingType === 'TIME'
          ? t('targetDuration', { secs: exercise.targetReps })
          : t('targetReps', { reps: exercise.targetReps })}
      </p>
      <div className="flex gap-3">
        {exercise.trackingType === 'WEIGHT' && (
          <Input
            name="weightKg"
            aria-label={`${exercise.name} weight kg`}
            label={t('weightLabel')}
            type="number"
            step="0.5"
            min="0"
            value={state.weight}
            onChange={(e) => onChange((s) => ({ ...s, weight: e.target.value }))}
            className="w-24 text-2xl font-bold"
          />
        )}
        {exercise.trackingType === 'TIME' ? (
          <Input
            name="durationSecs"
            aria-label={`${exercise.name} duration seconds`}
            label={t('durationLabel')}
            type="number"
            min="1"
            value={state.duration}
            onChange={(e) => onChange((s) => ({ ...s, duration: e.target.value }))}
            className="w-24 text-2xl font-bold"
          />
        ) : (
          <Input
            name="repsDone"
            aria-label={`${exercise.name} reps done`}
            label={t('repsLabel')}
            type="number"
            min="1"
            value={state.reps}
            onChange={(e) => onChange((s) => ({ ...s, reps: e.target.value }))}
            className="w-20 text-2xl font-bold"
          />
        )}
      </div>
    </div>
  )
}

export function SeriesSetLogger({ setNumber, totalSets, exercises, onMarkDone }: SeriesSetLoggerProps) {
  const t = useTranslations('session')
  const [state, setState] = useState<ExerciseInputState[]>(() => exercises.map((e) => initialState(e.targetReps)))
  const [loading, setLoading] = useState(false)

  const canSubmit = state.every((s, i) => isValid(s, exercises[i].trackingType))

  const handleDone = async () => {
    setLoading(true)
    try {
      await onMarkDone(state.map((s, i) => toLogData(s, exercises[i].trackingType)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-[#E85D26] px-2 py-0.5 text-xs font-bold uppercase text-white">
          {t('seriesBadge')}
        </span>
        <span className="font-display text-xl font-bold">
          {t('currentSet', { current: setNumber, total: totalSets })}
        </span>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.08)]">
        {exercises.map((ex, i) => (
          <div key={ex.id}>
            {i > 0 && <div className="h-px bg-[rgba(255,255,255,0.08)]" />}
            <ExerciseCard
              exercise={ex}
              state={state[i]}
              onChange={(updater) => setState((prev) => prev.map((s, j) => (j === i ? updater(s) : s)))}
            />
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleDone}
        disabled={!canSubmit || loading}
      >
        {t('markSetDone')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Rename the i18n key**

In `src/i18n/en.json`, in the `"session"` object, rename `"biSeriesBadge": "BISERIES"` → `"seriesBadge": "SERIES"`.

- [ ] **Step 6: Run to confirm PASS**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/SeriesSetLogger.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/SeriesSetLogger.tsx tests/unit/components/SeriesSetLogger.test.tsx src/i18n/en.json
git commit -m "feat(series): rename BiSeriesSetLogger to SeriesSetLogger, generalize to N exercises"
```

---

## Task 5: `PlanSessionRunner` — Generalize Series Detection

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

- [ ] **Step 1: Update imports**

Replace lines 10–12:

```typescript
import { SeriesSetLogger } from '@/components/SeriesSetLogger'
import { RestTimerScreen } from '@/components/RestTimerScreen'
import type { SetLogData } from '@/components/SeriesSetLogger'
```

- [ ] **Step 2: Rename state**

Replace line 32:

```typescript
const [seriesRoundProgress, setSeriesRoundProgress] = useState<Record<string, number>>({})
```

- [ ] **Step 3: Replace `handleBiSeriesSetDone` with `handleSeriesSetDone`**

Replace the entire function (lines 113–175):

```typescript
async function handleSeriesSetDone(data: SetLogData[]) {
  if (!sessionId || logging.current) return
  logging.current = true
  setLogError(null)

  const sorted = currentItem!.exercises.slice().sort((a, b) => a.order - b.order)
  const setNumber = (seriesRoundProgress[currentItem!.id] ?? 0) + 1

  try {
    const responses = await Promise.all(
      sorted.map((ex, i) =>
        fetch(`/api/sessions/${sessionId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseId: ex.exerciseId,
            planItemId: currentItem!.id,
            setNumber,
            weightKg: data[i].weightKg ?? null,
            repsDone: data[i].repsDone ?? null,
            durationSecs: data[i].durationSecs ?? undefined,
          }),
        }),
      ),
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
```

- [ ] **Step 4: Replace the running-phase branch**

Replace the IIFE body (lines 247–286 in the original, the `isBiseries` block) with:

```typescript
const isSeries = currentItem.exercises.length > 1

if (showRestTimer) {
  return <RestTimerScreen onComplete={() => setShowRestTimer(false)} />
}

if (isSeries) {
  const sorted = currentItem.exercises.slice().sort((a, b) => a.order - b.order)
  const currentSet = seriesRoundProgress[currentItem.id] ?? 0
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{plan.name}</h1>
        <span className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
        </span>
      </div>
      <SeriesSetLogger
        setNumber={currentSet + 1}
        totalSets={sorted[0].sets}
        exercises={sorted.map((ex) => ({
          id: ex.id,
          name: ex.exercise.name,
          targetReps: ex.reps,
          trackingType: ex.exercise.trackingType,
        }))}
        onMarkDone={handleSeriesSetDone}
      />
      {logError && <p className="text-sm text-red-400">{logError}</p>}
    </>
  )
}
```

(The single-exercise branch below it — `currentItem.exercises.map(...)` — is unchanged; it only ever renders when `isSeries` is false, i.e. exactly 1 exercise.)

- [ ] **Step 5: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors in `PlanSessionRunner.tsx` (other files may still error until later tasks land).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx"
git commit -m "feat(series): generalize PlanSessionRunner from fixed biseries pair to N-exercise series"
```

---

## Task 6: `AddItemModal` — Dynamic Exercise Rows

**Files:**
- Modify: `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`
- Modify: `src/i18n/en.json` (`planBuilder` namespace)

- [ ] **Step 1: Update i18n keys**

In `src/i18n/en.json`, in the `"planBuilder"` object, replace:

```json
"single": "Single",
"biseries": "Biseries",
```

with:

```json
"single": "Single",
"series": "Series ×{count}",
```

Replace:

```json
"slot1Label": "Slot 1",
"slot2Label": "Slot 2",
```

with:

```json
"exerciseNLabel": "Exercise {n}",
```

Replace:

```json
"slot1Required": "Slot 1 exercise is required",
"slot2Required": "Slot 2 exercise is required for biseries",
```

with:

```json
"exerciseRequired": "Exercise {n} is required",
```

Also remove the now-unused `"exercise1Placeholder"` / `"exercise2Placeholder"` pair in favor of a single interpolated `"exerciseNPlaceholder": "Exercise {n}"` (replaces both).

- [ ] **Step 2: Rewrite `AddItemModal.tsx`**

Replace the full contents of `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`:

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
}

const EMPTY_ROW: Row = { exerciseId: '', sets: '3', reps: '10' }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const missingIndex = rows.findIndex((r) => !r.exerciseId)
    if (missingIndex !== -1) {
      setError(t('exerciseRequired', { n: missingIndex + 1 }))
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
      <div className="w-full max-w-lg rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('addItem')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {rows.map((row, i) => {
            const selectedEx = allExercises.find((e) => e.id === row.exerciseId) ?? null
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

Add the new `"addExercise": "+ Add Exercise"` key to the `"planBuilder"` namespace in `src/i18n/en.json` alongside the other Step 1 edits.

- [ ] **Step 3: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx" src/i18n/en.json
git commit -m "feat(series): replace Single/Biseries toggle with dynamic 1-5 exercise rows in AddItemModal"
```

---

## Task 7: `PlanBuilder` Badge + Remaining i18n Cleanup

**Files:**
- Modify: `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx`
- Modify: `src/i18n/en.json` (drop orphaned `"plan"` namespace biseries keys)

- [ ] **Step 1: Update `PlanItemExercise` interface and `SortablePlanItem`**

In `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx`:

Replace the `PlanItemExercise` interface (lines 26–33):

```typescript
interface PlanItemExercise {
  id: string
  itemId: string
  exerciseId: string
  sets: number
  reps: number
  order: number
}
```

Replace the body of `SortablePlanItem` (lines 67–112) — the `isBiseries`/`slot1`/`slot2` block and its render — with:

```typescript
const exercises = (item.exercises ?? []).slice().sort((a, b) => a.order - b.order)
const isSeries = exercises.length > 1

function lookupName(exerciseId: string): string {
  return allExercises.find((e) => e.id === exerciseId)?.name ?? exerciseId
}

return (
  <div
    ref={setNodeRef}
    style={style}
    className="flex items-start gap-3 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4"
  >
    <span {...attributes} {...listeners} className="mt-1 cursor-grab select-none text-[rgba(255,255,255,0.4)]">
      ⠿
    </span>
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[rgba(255,255,255,0.4)]">#{item.position}</span>
        <Badge variant={isSeries ? 'accent' : 'default'}>
          {isSeries ? t('series', { count: exercises.length }) : t('single')}
        </Badge>
      </div>
      {exercises.map((ex) => (
        <p key={ex.id} className="text-sm">
          <span className="font-semibold">{lookupName(ex.exerciseId)}</span>
          <span className="ml-2 text-[rgba(255,255,255,0.6)]">{ex.sets} × {ex.reps}</span>
        </p>
      ))}
    </div>
    <button onClick={() => onDelete(item.id)} className="text-sm text-red-400 hover:text-red-300">
      {t('removeItem')}
    </button>
  </div>
)
```

- [ ] **Step 2: Remove orphaned biseries keys from the `"plan"` namespace**

In `src/i18n/en.json`, in the `"plan"` object, remove these unused keys (confirmed via `grep -rn` that nothing in `src/` references them — they predate the `planBuilder` namespace and were never cleaned up):

```json
"addBiseries": "Add Biseries",
"itemSingle": "Single",
"itemBiseries": "Biseries",
"slot1": "Exercise A",
"slot2": "Exercise B",
"biseriesMissingSlot1": "Biseries requires a slot 1 exercise."
```

- [ ] **Step 3: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors anywhere now — this is the last source file in the rename chain.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx" src/i18n/en.json
git commit -m "feat(series): generalize PlanBuilder badge to N-exercise series, drop orphaned biseries i18n keys"
```

---

## Task 8: E2E Tests — Rename + Limit Coverage

**Files:**
- Modify: `tests/e2e/helpers/setup.ts`
- Modify: `tests/e2e/trainer.spec.ts`
- Modify: `tests/e2e/failure-paths.spec.ts`
- Modify: `tests/e2e/trainee.spec.ts`

- [ ] **Step 1: Generalize the seed helper**

In `tests/e2e/helpers/setup.ts`, replace `seedPlan`'s hardcoded `slot: 1` (line 57) with `order: 1`.

Replace `seedBiseriePlan` (lines 64–95) with a generalized `seedSeriesPlan`:

```typescript
export async function seedSeriesPlan(data: {
  name: string
  exercises: Array<{ exerciseId: string; reps: number }>
  sets: number
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  const item = await prisma.trainingPlanItem.create({
    data: { planId: plan.id, position: 1 },
  })
  for (let i = 0; i < data.exercises.length; i++) {
    await prisma.trainingPlanItemExercise.create({
      data: {
        itemId: item.id,
        exerciseId: data.exercises[i].exerciseId,
        sets: data.sets,
        reps: data.exercises[i].reps,
        order: i + 1,
      },
    })
  }
  return plan
}
```

- [ ] **Step 2: Update `trainer.spec.ts`**

Replace the `'creates training plan with biseries'` test (lines 86–111) with:

```typescript
test('creates training plan with series', async ({ page }) => {
  await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
  await seedExercise({ name: 'Lunge', trackingType: 'WEIGHT' })
  await seedExercise({ name: 'Leg Press', trackingType: 'WEIGHT' })

  await page.goto('/trainer/plans')
  await page.click('text=New Plan')
  await page.fill('[name=name]', 'Leg Day')
  await page.click('text=Save')
  await page.click('text=Leg Day')

  await page.click('text=Add Item')
  await page.fill('[placeholder="Exercise 1"]', 'Squat')
  await page.click('text=Squat')
  await page.fill('[name=sets1]', '3')
  await page.fill('[name=reps1]', '10')

  await page.click('text=+ Add Exercise')
  await page.fill('[placeholder="Exercise 2"]', 'Lunge')
  await page.click('text=Lunge')
  await page.fill('[name=reps2]', '12')

  await page.click('text=+ Add Exercise')
  await page.fill('[placeholder="Exercise 3"]', 'Leg Press')
  await page.click('text=Leg Press')
  await page.fill('[name=reps3]', '15')

  await page.getByRole('dialog').getByRole('button', { name: 'Add Item' }).click()

  await expect(page.locator('text=Squat')).toBeVisible()
  await expect(page.locator('text=Lunge')).toBeVisible()
  await expect(page.locator('text=Leg Press')).toBeVisible()
  await expect(page.locator('text=Series ×3')).toBeVisible()
})
```

(Placeholders are now `"Exercise N"` per the generalized `exerciseNPlaceholder` i18n key from Task 6.)

- [ ] **Step 3: Update `failure-paths.spec.ts`**

Replace the `'biseries item requires slot 1 before slot 2'` test (lines 47–59) with:

```typescript
test('series item requires exercise 1 before exercise 2', async ({ page }) => {
  const plan = await seedPlan({ name: 'Test Plan', items: [] })
  await seedExercise({ name: 'Exercise A', trackingType: 'WEIGHT' })

  await page.goto(`/trainer/plans/${plan.id}`)
  await page.click('text=Add Item')
  await page.click('text=+ Add Exercise')
  await page.fill('[placeholder="Exercise 2"]', 'Exercise A')
  await page.click('text=Exercise A')
  await page.getByRole('dialog').getByRole('button', { name: 'Add Item' }).click()

  await expect(page.locator('text=Exercise 1 is required')).toBeVisible()
})
```

Add a new test after it for the limit:

```typescript
test('cannot add a 6th exercise to a series', async ({ page }) => {
  const plan = await seedPlan({ name: 'Test Plan', items: [] })
  for (let i = 1; i <= 5; i++) {
    await seedExercise({ name: `Exercise ${i}`, trackingType: 'WEIGHT' })
  }

  await page.goto(`/trainer/plans/${plan.id}`)
  await page.click('text=Add Item')
  for (let i = 0; i < 4; i++) {
    await page.click('text=+ Add Exercise')
  }

  await expect(page.locator('text=+ Add Exercise')).not.toBeVisible()
})
```

- [ ] **Step 4: Update `trainee.spec.ts`**

Update the import (line 2):

```typescript
import { seedTrainee, seedExercise, seedPlan, seedSeriesPlan, cleanDatabase } from './helpers/setup'
```

Replace the `'runs biseries plan — interleaved sets with rest timer'` test (lines 62–109) with:

```typescript
test('runs series plan — interleaved sets with rest timer', async ({ page }) => {
  await seedTrainee({ name: 'Super User' })
  const exerciseA = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
  const exerciseB = await seedExercise({ name: 'Barbell Row', trackingType: 'WEIGHT' })
  const exerciseC = await seedExercise({ name: 'Lat Pulldown', trackingType: 'WEIGHT' })
  await seedSeriesPlan({
    name: 'Superset Day',
    exercises: [
      { exerciseId: exerciseA.id, reps: 10 },
      { exerciseId: exerciseB.id, reps: 10 },
      { exerciseId: exerciseC.id, reps: 12 },
    ],
    sets: 2,
  })

  await page.goto('/')
  await expect(page.locator('text=Super User')).toBeVisible()
  await page.click('text=Super User')
  await page.click('text=Superset Day')
  await page.click("text=LET'S GO")

  await expect(page.locator('text=SERIES')).toBeVisible()
  await expect(page.locator('text=Bench Press')).toBeVisible()
  await expect(page.locator('text=Barbell Row')).toBeVisible()
  await expect(page.locator('text=Lat Pulldown')).toBeVisible()
  await expect(page.locator('text=Set 1 of 2')).toBeVisible()

  await page.fill('[aria-label="Bench Press weight kg"]', '80')
  await page.fill('[aria-label="Bench Press reps done"]', '10')
  await page.fill('[aria-label="Barbell Row weight kg"]', '60')
  await page.fill('[aria-label="Barbell Row reps done"]', '10')
  await page.fill('[aria-label="Lat Pulldown weight kg"]', '40')
  await page.fill('[aria-label="Lat Pulldown reps done"]', '12')
  await page.click('text=Mark Set Done')

  await expect(page.getByRole('heading', { name: 'REST' })).toBeVisible()
  await page.click('text=Skip → Next Set')

  await expect(page.locator('text=Set 2 of 2')).toBeVisible()
  await page.fill('[aria-label="Bench Press weight kg"]', '80')
  await page.fill('[aria-label="Bench Press reps done"]', '10')
  await page.fill('[aria-label="Barbell Row weight kg"]', '60')
  await page.fill('[aria-label="Barbell Row reps done"]', '10')
  await page.fill('[aria-label="Lat Pulldown weight kg"]', '40')
  await page.fill('[aria-label="Lat Pulldown reps done"]', '12')
  await page.click('text=Mark Set Done')

  await expect(page.getByRole('heading', { name: 'REST' })).not.toBeVisible()
  await expect(page.locator('text=Session Complete')).toBeVisible()
})
```

- [ ] **Step 5: Run E2E tests**

```bash
~/.nvm/versions/node/v24.1.0/bin/npm run test:e2e
```

Expected: all green, including the renamed and new tests.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/helpers/setup.ts tests/e2e/trainer.spec.ts tests/e2e/failure-paths.spec.ts tests/e2e/trainee.spec.ts
git commit -m "test(e2e): rename biseries flows to series, add 6-exercise limit failure path"
```

---

## Task 9: Docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the business rule bullet**

In `CLAUDE.md`, under "## Business Rules (enforce in services)", replace:

```
- `TrainingPlanItem` with `slot=2` requires `slot=1` to exist (biseries pair).
```

with:

```
- `TrainingPlanItem` series exercises must have contiguous `order` starting at 1, up to `MAX_SERIES_EXERCISES` (5), with equal `sets` across all exercises in the series.
```

- [ ] **Step 2: Run the full verification suite**

```bash
cd /home/ccastro/Projects/training-assistant
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
~/.nvm/versions/node/v24.1.0/bin/npm run lint
~/.nvm/versions/node/v24.1.0/bin/npm run test:unit
~/.nvm/versions/node/v24.1.0/bin/npm run test:integration
~/.nvm/versions/node/v24.1.0/bin/npm run test:e2e
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update business rule for series generalization"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `slot`→`order` rename, DB + Zod + repo | Tasks 1, 3 |
| `MAX_SERIES_EXERCISES = 5` cap | Task 1 |
| Contiguous-order + equal-sets validation (N-aware) | Task 2 |
| Prisma migration (rename, no backfill) | Task 3 |
| `SeriesSetLogger` array-based component | Task 4 |
| `PlanSessionRunner` N-exercise series branch | Task 5 |
| `AddItemModal` dynamic 1-5 rows, no mode toggle | Task 6 |
| `PlanBuilder` badge generalization | Task 7 |
| i18n key renames (`session`, `planBuilder`) + orphaned key cleanup | Tasks 4, 6, 7 |
| Unit tests: schema, service, component | Tasks 1, 2, 4 |
| Integration test: 5-exercise persistence | Task 3 |
| E2E: golden path (3-exercise series, create + run), failure paths (missing exercise 1, 6th exercise blocked) | Task 8 |
| `CLAUDE.md` business rule update | Task 9 |

**Placeholder scan:** None found.

**Type consistency:** `SetLogData`/`SeriesExercise` exported from `SeriesSetLogger.tsx`, imported in `PlanSessionRunner.tsx`. `PlanItemExerciseInput.order` flows consistently from Zod schema → service → repository → Prisma. `handleSeriesSetDone` signature (`data: SetLogData[]`) matches `SeriesSetLoggerProps.onMarkDone`.

**Known follow-up (out of scope for this plan):** `docs/superpowers/specs/2026-06-16-plan-review-overlay-design.md`, `docs/superpowers/plans/2026-06-16-plan-review-overlay.md`, and `docs/superpowers/specs/2026-06-16-session-navigation-design.md` are unexecuted and still reference the old biseries model (`BiSeriesSetLogger`, `slot`, `biSeriesSet`). They'll need a rename/generalization pass before implementation — see the "Follow-up: Stale Pending Plans" section of the design spec.
