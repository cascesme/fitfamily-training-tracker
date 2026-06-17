# Tabata Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tabata mode to series plan items (2+ exercises) where a work/rest chrono auto-cycles through all exercises for a configured number of rounds.

**Architecture:** `TrainingPlanItem` gains three new columns (`isTabata`, `workTimeSecs`, `restTimeSecs`). The API route + service + repository are extended to persist and pass tabata config. A new `TabataRunner` client component owns the work→rest→next state machine; `PlanSessionRunner` renders it in place of `SeriesSetLogger` when the current item has `isTabata=true`. Trainer creates tabata items via a toggle in `AddItemModal`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma + PostgreSQL, Zod, Tailwind CSS, next-intl, Jest + Testing Library, Playwright.

## Global Constraints

- All user-facing text via `next-intl` translation keys — zero hardcoded UI strings.
- API routes call one service method and return. No business logic in routes.
- Services depend on repository interfaces. Repositories are the only Prisma importers.
- `src/lib/api/handleError.ts` handles all API error paths.
- Tests: write failing test first, run it to confirm fail, implement, run to confirm pass.
- Node at `~/.nvm/versions/node/v24.1.0/bin/` — prefix npx/npm in non-interactive shells or source nvm.

---

### Task 1: DB Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Auto-generated: `prisma/migrations/*/migration.sql`

**Interfaces:**
- Produces: `TrainingPlanItem` type gains `isTabata: boolean`, `workTimeSecs: number | null`, `restTimeSecs: number | null` in Prisma's generated client — all downstream tasks depend on this.

- [ ] **Step 1: Add columns to `TrainingPlanItem` in schema**

In `prisma/schema.prisma`, replace the `TrainingPlanItem` model with:

```prisma
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
```

- [ ] **Step 2: Run migration**

```bash
npm run prisma:migrate
```

Enter migration name when prompted: `add_tabata_to_training_plan_item`

Expected: migration runs clean, Prisma client regenerated with new fields.

- [ ] **Step 3: Verify**

```bash
npx jest --selectProjects integration -- tests/integration/repositories/TrainingPlanRepository.test.ts
```

Expected: all existing tests still pass (new columns have defaults, no breakage).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add isTabata, workTimeSecs, restTimeSecs to TrainingPlanItem"
```

---

### Task 2: Domain Schema + Interface Update (TDD)

**Files:**
- Modify: `src/lib/domain/plan.ts`
- Modify: `tests/unit/domain/plan.test.ts`

**Interfaces:**
- Consumes: Prisma `TrainingPlanItem` with new columns (Task 1).
- Produces:
  - `AddPlanItemSchema` — Zod schema with `isTabata?: boolean`, `workTimeSecs?: number`, `restTimeSecs?: number`, `reps: nonnegative` + `superRefine` for tabata validation.
  - `AddPlanItemInput` — inferred type, consumed by service and API route.
  - `ITrainingPlanRepository.addItem` — updated signature with optional `tabataConfig` param.

- [ ] **Step 1: Write failing tests**

Append to `tests/unit/domain/plan.test.ts` inside the existing `describe('AddPlanItemSchema', ...)` block:

```typescript
  it('accepts tabata item with 2 exercises and both times', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      isTabata: true,
      workTimeSecs: 20,
      restTimeSecs: 10,
      exercises: [
        { exerciseId: 'ex1', sets: 8, reps: 0, order: 1 },
        { exerciseId: 'ex2', sets: 8, reps: 0, order: 2 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects tabata with only 1 exercise', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      isTabata: true,
      workTimeSecs: 20,
      restTimeSecs: 10,
      exercises: [{ exerciseId: 'ex1', sets: 8, reps: 0, order: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects tabata missing workTimeSecs', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      isTabata: true,
      restTimeSecs: 10,
      exercises: [
        { exerciseId: 'ex1', sets: 8, reps: 0, order: 1 },
        { exerciseId: 'ex2', sets: 8, reps: 0, order: 2 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects tabata missing restTimeSecs', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      isTabata: true,
      workTimeSecs: 20,
      exercises: [
        { exerciseId: 'ex1', sets: 8, reps: 0, order: 1 },
        { exerciseId: 'ex2', sets: 8, reps: 0, order: 2 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects reps:0 for non-tabata exercise', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 0, order: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts reps:0 for tabata exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      isTabata: true,
      workTimeSecs: 20,
      restTimeSecs: 10,
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: 0, order: 1 },
        { exerciseId: 'ex2', sets: 3, reps: 0, order: 2 },
      ],
    })
    expect(result.success).toBe(true)
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest --selectProjects unit -- tests/unit/domain/plan.test.ts
```

Expected: new tests FAIL (schema not yet updated).

- [ ] **Step 3: Update `src/lib/domain/plan.ts`**

Replace `AddPlanItemSchema` and update the `ITrainingPlanRepository.addItem` signature:

```typescript
export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  isTabata: z.boolean().optional().default(false),
  workTimeSecs: z.number().int().positive().optional(),
  restTimeSecs: z.number().int().positive().optional(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().nonnegative(),
    order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
  })).min(1).max(MAX_SERIES_EXERCISES),
}).superRefine((val, ctx) => {
  if (!val.isTabata) {
    val.exercises.forEach((ex, i) => {
      if (ex.reps === 0) {
        ctx.addIssue({ code: 'custom', path: ['exercises', i, 'reps'], message: 'reps must be positive for non-tabata exercises' })
      }
    })
    return
  }
  if (val.exercises.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['exercises'], message: 'tabata requires at least 2 exercises' })
  }
  if (!val.workTimeSecs) {
    ctx.addIssue({ code: 'custom', path: ['workTimeSecs'], message: 'workTimeSecs required for tabata' })
  }
  if (!val.restTimeSecs) {
    ctx.addIssue({ code: 'custom', path: ['restTimeSecs'], message: 'restTimeSecs required for tabata' })
  }
})
export type AddPlanItemInput = z.infer<typeof AddPlanItemSchema>
```

Also update `ITrainingPlanRepository.addItem` signature (in the interface at the bottom of the file):

```typescript
addItem(
  planId: string,
  position: number,
  exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>,
  tabataConfig?: { workTimeSecs: number; restTimeSecs: number },
): Promise<TrainingPlanItem>
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest --selectProjects unit -- tests/unit/domain/plan.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/plan.ts tests/unit/domain/plan.test.ts
git commit -m "feat(domain): extend AddPlanItemSchema and ITrainingPlanRepository for tabata"
```

---

### Task 3: Repository + Integration Test (TDD)

**Files:**
- Modify: `src/lib/repositories/TrainingPlanRepository.ts`
- Modify: `tests/integration/repositories/TrainingPlanRepository.test.ts`

**Interfaces:**
- Consumes: Updated `ITrainingPlanRepository.addItem` signature (Task 2), Prisma `TrainingPlanItem` with tabata columns (Task 1).
- Produces: `TrainingPlanRepository.addItem` persists `isTabata`, `workTimeSecs`, `restTimeSecs` correctly.

- [ ] **Step 1: Write failing integration tests**

Append to `tests/integration/repositories/TrainingPlanRepository.test.ts` inside the existing `describe('TrainingPlanRepository', ...)` block:

```typescript
  it('addItem persists tabata config on item', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Pull Ups', trackingType: 'NONE' } })
    const plan = await repo.create({ name: 'Tabata Plan' })
    await repo.addItem(
      plan.id, 1,
      [
        { exerciseId, sets: 8, reps: 0, order: 1 },
        { exerciseId: ex2.id, sets: 8, reps: 0, order: 2 },
      ],
      { workTimeSecs: 20, restTimeSecs: 10 },
    )
    const full = await repo.findWithItems(plan.id)
    const item = full?.items![0]
    expect(item?.isTabata).toBe(true)
    expect(item?.workTimeSecs).toBe(20)
    expect(item?.restTimeSecs).toBe(10)
    expect(item?.exercises).toHaveLength(2)
  })

  it('addItem stores isTabata=false and nulls for non-tabata item', async () => {
    const plan = await repo.create({ name: 'Normal Plan' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const item = full?.items![0]
    expect(item?.isTabata).toBe(false)
    expect(item?.workTimeSecs).toBeNull()
    expect(item?.restTimeSecs).toBeNull()
  })

  it('findForSession returns tabata fields on items', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Burpees', trackingType: 'NONE' } })
    const plan = await repo.create({ name: 'Tabata Session Plan' })
    await repo.addItem(
      plan.id, 1,
      [
        { exerciseId, sets: 4, reps: 0, order: 1 },
        { exerciseId: ex2.id, sets: 4, reps: 0, order: 2 },
      ],
      { workTimeSecs: 30, restTimeSecs: 15 },
    )
    const result = await repo.findForSession(plan.id)
    expect(result?.items[0].isTabata).toBe(true)
    expect(result?.items[0].workTimeSecs).toBe(30)
    expect(result?.items[0].restTimeSecs).toBe(15)
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest --selectProjects integration -- tests/integration/repositories/TrainingPlanRepository.test.ts
```

Expected: new tests FAIL (repo doesn't pass tabata config yet).

- [ ] **Step 3: Update `src/lib/repositories/TrainingPlanRepository.ts`**

Replace the `addItem` method:

```typescript
async addItem(
  planId: string,
  position: number,
  exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>,
  tabataConfig?: { workTimeSecs: number; restTimeSecs: number },
): Promise<TrainingPlanItem> {
  return this.prisma.trainingPlanItem.create({
    data: {
      planId,
      position,
      isTabata: tabataConfig != null,
      workTimeSecs: tabataConfig?.workTimeSecs ?? null,
      restTimeSecs: tabataConfig?.restTimeSecs ?? null,
      exercises: { create: exercises },
    },
    include: { exercises: true },
  })
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest --selectProjects integration -- tests/integration/repositories/TrainingPlanRepository.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/TrainingPlanRepository.ts tests/integration/repositories/TrainingPlanRepository.test.ts
git commit -m "feat(repo): persist tabata config fields in addItem"
```

---

### Task 4: Service + API Route Update (TDD)

**Files:**
- Modify: `src/lib/services/TrainingPlanService.ts`
- Modify: `src/app/api/plans/[id]/items/route.ts`
- Modify: `tests/unit/services/TrainingPlanService.test.ts`

**Interfaces:**
- Consumes: `ITrainingPlanRepository.addItem` with `tabataConfig?` param (Task 2).
- Produces: `TrainingPlanService.addItem` accepts and passes through tabata config; API route extracts tabata fields from parsed body.

- [ ] **Step 1: Write failing tests**

Append to `tests/unit/services/TrainingPlanService.test.ts` inside the existing `describe('addItem', ...)` block:

```typescript
    it('passes tabataConfig to repo when isTabata is true', async () => {
      mockRepo.addItem.mockResolvedValue(mockPlanItem)
      await service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 8, reps: 0, order: 1 },
        { exerciseId: 'e2', sets: 8, reps: 0, order: 2 },
      ], { workTimeSecs: 20, restTimeSecs: 10 })
      expect(mockRepo.addItem).toHaveBeenCalledWith(
        'p1', 1,
        [
          { exerciseId: 'e1', sets: 8, reps: 0, order: 1 },
          { exerciseId: 'e2', sets: 8, reps: 0, order: 2 },
        ],
        { workTimeSecs: 20, restTimeSecs: 10 },
      )
    })

    it('passes undefined tabataConfig to repo for non-tabata item', async () => {
      mockRepo.addItem.mockResolvedValue(mockPlanItem)
      await service.addItem('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }])
      expect(mockRepo.addItem).toHaveBeenCalledWith(
        'p1', 1,
        [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }],
        undefined,
      )
    })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: new tests FAIL (service doesn't accept/pass tabata config yet).

- [ ] **Step 3: Update `src/lib/services/TrainingPlanService.ts`**

Add `tabataConfig?` param to `addItem` and update the repo call:

```typescript
async addItem(
  planId: string,
  position: number,
  exercises: PlanItemExerciseInput[],
  tabataConfig?: { workTimeSecs: number; restTimeSecs: number },
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

  const item = await this.repo.addItem(planId, position, exercises, tabataConfig)
  logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: item.id, outcome: 'created', isTabata: tabataConfig != null }, 'Plan item added')
  return item
}
```

- [ ] **Step 4: Update `src/app/api/plans/[id]/items/route.ts`**

Update the POST handler to extract and pass tabata config:

```typescript
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = AddPlanItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const tabataConfig = parsed.data.isTabata
      ? { workTimeSecs: parsed.data.workTimeSecs!, restTimeSecs: parsed.data.restTimeSecs! }
      : undefined
    const item = await trainingPlanService.addItem(id, parsed.data.position, parsed.data.exercises, tabataConfig)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/plans/${id}/items`)
  }
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/TrainingPlanService.ts src/app/api/plans/[id]/items/route.ts tests/unit/services/TrainingPlanService.test.ts
git commit -m "feat(service): pass tabata config through addItem chain to repository"
```

---

### Task 5: i18n Keys

**Files:**
- Modify: `src/i18n/en.json`

**Interfaces:**
- Produces: translation keys consumed by `AddItemModal` (Task 6), `PlanBuilder` (Task 7), `TabataRunner` (Task 8).

- [ ] **Step 1: Add `planBuilder` keys**

In `src/i18n/en.json`, inside the `"planBuilder"` object, add after `"addItemError"`:

```json
    "tabataMode": "Tabata mode",
    "workTime": "Work time (sec)",
    "restTime": "Rest time (sec)",
    "rounds": "Rounds",
    "tabataBadge": "TABATA · {count} ex · {sets} rounds · {work}s/{rest}s"
```

- [ ] **Step 2: Add `session` keys**

In `src/i18n/en.json`, inside the `"session"` object, add after `"skipRest"`:

```json
    "tabataBadge": "TABATA",
    "tabataRound": "Round {current} of {total}",
    "tabataExercise": "Exercise {current} of {total}",
    "stopAndNext": "Stop & Next Exercise"
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat(i18n): add tabata translation keys to planBuilder and session"
```

---

### Task 6: AddItemModal — Tabata Toggle

**Files:**
- Modify: `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

**Interfaces:**
- Consumes: i18n keys `planBuilder.tabataMode`, `planBuilder.workTime`, `planBuilder.restTime`, `planBuilder.rounds` (Task 5). API body shape with `isTabata`, `workTimeSecs`, `restTimeSecs` (Task 2 + 4).
- Produces: `AddItemModal` sends tabata fields to API when toggled on.

- [ ] **Step 1: Add tabata state**

At the top of the `AddItemModal` function body, after the existing `const [saving, setSaving]` line, add:

```typescript
const [isTabata, setIsTabata] = useState(false)
const [workTimeSecs, setWorkTimeSecs] = useState('20')
const [restTimeSecs, setRestTimeSecs] = useState('10')
```

Also add this effect to force-disable tabata when rows drop to 1, right after the state declarations:

```typescript
useEffect(() => {
  if (rows.length < 2) setIsTabata(false)
}, [rows.length])
```

- [ ] **Step 2: Update `handleSubmit` to include tabata fields in body**

Replace the `body` construction inside `handleSubmit`:

```typescript
const body = isTabata
  ? {
      position: nextPosition,
      isTabata: true,
      workTimeSecs: Number(workTimeSecs),
      restTimeSecs: Number(restTimeSecs),
      exercises: rows.map((r, i) => ({
        exerciseId: r.exerciseId,
        sets: Number(r.sets),
        reps: 0,
        order: i + 1,
      })),
    }
  : {
      position: nextPosition,
      exercises: rows.map((r, i) => ({
        exerciseId: r.exerciseId,
        sets: Number(r.sets),
        reps: Number(r.reps),
        order: i + 1,
      })),
    }
```

- [ ] **Step 3: Update the form render to show tabata controls and hide/show reps**

Below the last exercise row and the `[+ Add Exercise]` button, but above the error display and submit buttons, add the following section (replacing the existing `sets` field block and adding tabata controls):

Find the section where `sets` and `reps` inputs are rendered inside `rows.map`. Currently each row has a `flex gap-3` div with sets + reps inputs. Update `updateRow` in the render to conditionally show reps:

Inside the `rows.map` render, replace the `<div className="flex gap-3">` section:

```tsx
<div className="flex gap-3">
  <div className="min-w-0 flex-1">
    <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">
      {isTabata ? t('rounds') : t('sets')}
    </label>
    <Input
      name={`sets${i + 1}`}
      type="number"
      min="1"
      value={row.sets}
      onChange={(e) => updateRow(i, { sets: e.target.value })}
      required
    />
  </div>
  {!isTabata && (
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
  )}
</div>
```

After the `[+ Add Exercise]` button and before the error display, add the tabata toggle + shared time inputs:

```tsx
{rows.length >= 2 && (
  <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isTabata}
        onChange={(e) => setIsTabata(e.target.checked)}
        className="h-4 w-4 accent-[#E85D26]"
      />
      <span className="text-sm">{t('tabataMode')}</span>
    </label>
    {isTabata && (
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('workTime')}</label>
          <Input
            name="workTimeSecs"
            type="number"
            min="5"
            value={workTimeSecs}
            onChange={(e) => setWorkTimeSecs(e.target.value)}
            required
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('restTime')}</label>
          <Input
            name="restTimeSecs"
            type="number"
            min="5"
            value={restTimeSecs}
            onChange={(e) => setRestTimeSecs(e.target.value)}
            required
          />
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Add `useEffect` import if not already present**

`useEffect` is already imported in this file (added in step 1 usage). Confirm the import line at the top already has `useEffect`:

```typescript
import { useState, useEffect } from 'react'
```

If only `useState` is imported, add `useEffect`.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx
git commit -m "feat(trainer): add tabata mode toggle to AddItemModal"
```

---

### Task 7: PlanBuilder — Tabata Badge

**Files:**
- Modify: `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx`

**Interfaces:**
- Consumes: i18n keys `planBuilder.tabataBadge`, `planBuilder.rounds` (Task 5). Prisma `TrainingPlanItem` with `isTabata`, `workTimeSecs`, `restTimeSecs` (Task 1).
- Produces: Plan items display a TABATA badge with config details when `isTabata` is true.

- [ ] **Step 1: Update the `PlanItem` local interface**

In `PlanBuilder.tsx`, update the local `PlanItem` interface to include tabata fields:

```typescript
interface PlanItem {
  id: string
  planId: string
  position: number
  isTabata?: boolean
  workTimeSecs?: number | null
  restTimeSecs?: number | null
  exercises?: PlanItemExercise[]
}
```

- [ ] **Step 2: Update `SortablePlanItem` badge logic**

In `SortablePlanItem`, replace the `<Badge>` render (currently checking `isSeries`):

```tsx
const isTabata = item.isTabata ?? false
const badge = isTabata
  ? t('tabataBadge', { count: exercises.length, sets: exercises[0]?.sets ?? 0, work: item.workTimeSecs ?? 0, rest: item.restTimeSecs ?? 0 })
  : isSeries
    ? t('series', { count: exercises.length })
    : t('single')

// In JSX:
<Badge variant={isSeries || isTabata ? 'accent' : 'default'}>
  {badge}
</Badge>
```

Also update the per-exercise info line to skip `reps` display for tabata items:

```tsx
{exercises.map((ex) => (
  <p key={ex.id} className="text-sm">
    <span className="font-semibold">{lookupName(ex.exerciseId)}</span>
    {!isTabata && (
      <span className="ml-2 text-[rgba(255,255,255,0.6)]">{ex.sets} × {ex.reps}</span>
    )}
  </p>
))}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx
git commit -m "feat(trainer): show TABATA badge in PlanBuilder for tabata items"
```

---

### Task 8: TabataRunner Component (TDD)

**Files:**
- Create: `src/components/TabataRunner.tsx`
- Create: `tests/unit/components/TabataRunner.test.tsx`

**Interfaces:**
- Consumes: i18n keys `session.tabataBadge`, `session.tabataRound`, `session.tabataExercise`, `session.stopAndNext`, `session.restTitle` (Task 5). `playTick`, `playTimeUp` from `@/lib/audio`. `MediaViewer` from `@/components/MediaViewer`.
- Produces:
  ```typescript
  export interface TabataExercise {
    id: string
    exerciseId: string
    name: string
    media: ExerciseMedia[]
  }
  export function TabataRunner(props: TabataRunnerProps): JSX.Element
  // where:
  interface TabataRunnerProps {
    exercises: TabataExercise[]
    totalRounds: number
    workTimeSecs: number
    restTimeSecs: number
    onExerciseDone: (exerciseId: string, round: number, durationSecs: number) => Promise<void>
    onComplete: () => void
  }
  ```

- [ ] **Step 1: Write failing tests**

Create `tests/unit/components/TabataRunner.test.tsx`:

```typescript
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TabataRunner } from '@/components/TabataRunner'
import type { TabataExercise } from '@/components/TabataRunner'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

jest.mock('@/lib/audio', () => ({
  playTick: jest.fn(),
  playTimeUp: jest.fn(),
}))

jest.mock('@/components/MediaViewer', () => ({
  MediaViewer: () => null,
}))

Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate: jest.fn() },
  writable: true,
})

const exercises: TabataExercise[] = [
  { id: 'item-1', exerciseId: 'ex-1', name: 'Push Ups', media: [] },
  { id: 'item-2', exerciseId: 'ex-2', name: 'Pull Ups', media: [] },
]

function makeProps(overrides?: Partial<Parameters<typeof TabataRunner>[0]>) {
  return {
    exercises,
    totalRounds: 2,
    workTimeSecs: 20,
    restTimeSecs: 10,
    onExerciseDone: jest.fn().mockResolvedValue(undefined),
    onComplete: jest.fn(),
    ...overrides,
  }
}

describe('TabataRunner', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('shows first exercise, round 1, exercise 1 of 2 on mount', () => {
    render(<TabataRunner {...makeProps()} />)
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Round 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'stopAndNext' })).toBeInTheDocument()
  })

  it('work timer counts down from workTimeSecs', () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 10 })} />)
    act(() => { jest.advanceTimersByTime(3000) })
    expect(screen.getByText('0:07')).toBeInTheDocument()
  })

  it('calls onExerciseDone with full workTimeSecs when work timer expires', async () => {
    const onExerciseDone = jest.fn().mockResolvedValue(undefined)
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, onExerciseDone })} />)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(onExerciseDone).toHaveBeenCalledWith('ex-1', 1, 5)
  })

  it('shows REST phase after work timer expires', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5 })} />)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(screen.getByText('restTitle')).toBeInTheDocument()
  })

  it('advances to next exercise after rest timer expires', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, restTimeSecs: 3 })} />)
    await act(async () => { jest.advanceTimersByTime(5000) }) // work done
    await act(async () => { jest.advanceTimersByTime(3000) }) // rest done
    expect(screen.getByText('Pull Ups')).toBeInTheDocument()
    expect(screen.getByText('Exercise 2 of 2')).toBeInTheDocument()
  })

  it('increments round after all exercises complete', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, restTimeSecs: 3 })} />)
    // exercise 1 work + rest
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // exercise 2 work + rest (end of round 1)
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // should now be on exercise 1 of round 2
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Round 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument()
  })

  it('calls onComplete directly after last exercise of last round — no rest', async () => {
    const onComplete = jest.fn()
    render(<TabataRunner {...makeProps({ totalRounds: 1, workTimeSecs: 5, restTimeSecs: 3, onComplete })} />)
    // exercise 1 work + rest
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // exercise 2 work (last of last round)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(onComplete).toHaveBeenCalled()
    expect(screen.queryByText('restTitle')).not.toBeInTheDocument()
  })

  it('Stop & Next calls onExerciseDone with elapsed time and shows REST', async () => {
    const onExerciseDone = jest.fn().mockResolvedValue(undefined)
    render(<TabataRunner {...makeProps({ workTimeSecs: 20, onExerciseDone })} />)
    act(() => { jest.advanceTimersByTime(8000) }) // 8 seconds elapsed
    fireEvent.click(screen.getByRole('button', { name: 'stopAndNext' }))
    await act(async () => {})
    expect(onExerciseDone).toHaveBeenCalledWith('ex-1', 1, 8)
    expect(screen.getByText('restTitle')).toBeInTheDocument()
  })

  it('Stop & Next on last exercise of last round calls onComplete immediately', async () => {
    const onComplete = jest.fn()
    render(<TabataRunner {...makeProps({ totalRounds: 1, workTimeSecs: 20, restTimeSecs: 10, onComplete })} />)
    // complete exercise 1 naturally (work + rest)
    await act(async () => { jest.advanceTimersByTime(20000) })
    await act(async () => { jest.advanceTimersByTime(10000) })
    // now on exercise 2 (last of last round) — stop early
    act(() => { jest.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: 'stopAndNext' }))
    await act(async () => {})
    expect(onComplete).toHaveBeenCalled()
  })

  it('Stop button is disabled while onExerciseDone is in-flight', async () => {
    let resolve!: () => void
    const onExerciseDone = jest.fn().mockReturnValue(new Promise<void>((r) => { resolve = r }))
    render(<TabataRunner {...makeProps({ workTimeSecs: 20, onExerciseDone })} />)
    act(() => { jest.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: 'stopAndNext' }))
    expect(screen.getByRole('button', { name: 'stopAndNext' })).toBeDisabled()
    resolve()
    await act(async () => {})
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest --selectProjects unit -- tests/unit/components/TabataRunner.test.tsx
```

Expected: FAIL with "Cannot find module '@/components/TabataRunner'".

- [ ] **Step 3: Create `src/components/TabataRunner.tsx`**

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import { playTick, playTimeUp } from '@/lib/audio'
import type { ExerciseMedia } from '@prisma/client'

const RING_RADIUS = 45
const RING_CX = 60
const RING_CY = 60
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const CRITICAL_THRESHOLD = 10

export interface TabataExercise {
  id: string
  exerciseId: string
  name: string
  media: ExerciseMedia[]
}

interface TabataRunnerProps {
  exercises: TabataExercise[]
  totalRounds: number
  workTimeSecs: number
  restTimeSecs: number
  onExerciseDone: (exerciseId: string, round: number, durationSecs: number) => Promise<void>
  onComplete: () => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TabataRunner({
  exercises,
  totalRounds,
  workTimeSecs,
  restTimeSecs,
  onExerciseDone,
  onComplete,
}: TabataRunnerProps) {
  const t = useTranslations('session')
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(workTimeSecs)
  const [loading, setLoading] = useState(false)
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeLeftRef = useRef(workTimeSecs)
  const loadingRef = useRef(false)

  const currentDuration = phase === 'work' ? workTimeSecs : restTimeSecs
  const progress = currentDuration > 0 ? timeLeft / currentDuration : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)
  const isCritical = phase === 'work' && timeLeft <= CRITICAL_THRESHOLD
  const ringColor = isCritical ? '#EF4444' : '#E85D26'

  // Effect 1: start countdown whenever circuit position (phase/exerciseIdx/round) changes
  useEffect(() => {
    const duration = phase === 'work' ? workTimeSecs : restTimeSecs
    setTimeLeft(duration)
    timeLeftRef.current = duration

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        timeLeftRef.current = next
        if (phase === 'work' && next > 0 && next <= CRITICAL_THRESHOLD) playTick()
        return Math.max(next, 0)
      })
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, exerciseIdx, round]) // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: handle timer expiry — runs with fresh closure on each render,
  // so phase/exerciseIdx/round are always current when timeLeft hits 0
  useEffect(() => {
    if (timeLeft > 0) return
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }

    if (phase === 'rest') {
      playTimeUp()
      navigator.vibrate?.(200)
      if (exerciseIdx === exercises.length - 1) {
        setExerciseIdx(0)
        setRound((r) => r + 1)
      } else {
        setExerciseIdx((i) => i + 1)
      }
      setPhase('work')
    } else if (!loadingRef.current) {
      playTimeUp()
      navigator.vibrate?.(200)
      void completeCurrentExercise(workTimeSecs)
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  async function completeCurrentExercise(elapsed: number) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }

    await onExerciseDone(exercises[exerciseIdx].exerciseId, round, elapsed)

    loadingRef.current = false
    setLoading(false)

    const isLastExercise = exerciseIdx === exercises.length - 1
    const isLastRound = round === totalRounds

    if (isLastExercise && isLastRound) {
      onComplete()
      return
    }

    if (isLastExercise) {
      setExerciseIdx(0)
      setRound((r) => r + 1)
    } else {
      setExerciseIdx((i) => i + 1)
    }
    setPhase('rest')
  }

  const handleStop = () => {
    const elapsed = Math.max(1, workTimeSecs - timeLeftRef.current)
    void completeCurrentExercise(elapsed)
  }

  const currentExercise = exercises[exerciseIdx]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="rounded bg-[#E85D26] px-2 py-0.5 text-xs font-bold uppercase text-white">
          {t('tabataBadge')}
        </span>
        <div className="text-right text-sm text-[rgba(255,255,255,0.6)]">
          <div>{t('tabataRound', { current: round, total: totalRounds })}</div>
          <div>{t('tabataExercise', { current: exerciseIdx + 1, total: exercises.length })}</div>
        </div>
      </div>

      {phase === 'work' ? (
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
          <h2 className="mb-2 font-display text-2xl font-bold">{currentExercise.name}</h2>
          {currentExercise.media.length > 0 && (
            <>
              <Button
                type="button"
                variant="secondary"
                className="mb-4"
                onClick={() => setViewerOpenFor(currentExercise.id)}
              >
                View Media ({currentExercise.media.length})
              </Button>
              {viewerOpenFor === currentExercise.id && (
                <MediaViewer media={currentExercise.media} onClose={() => setViewerOpenFor(null)} />
              )}
            </>
          )}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90">
                <circle cx={RING_CX} cy={RING_CY} r={RING_RADIUS} fill="none" stroke="#333" strokeWidth="8" />
                <circle
                  cx={RING_CX} cy={RING_CY} r={RING_RADIUS}
                  fill="none" stroke={ringColor} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-2xl font-bold tabular-nums" style={{ color: ringColor }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleStop}
              disabled={loading}
            >
              {t('stopAndNext')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 py-8">
          <h1 className="font-display text-3xl font-bold">{t('restTitle')}</h1>
          <div className="relative">
            <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx={RING_CX} cy={RING_CY} r={RING_RADIUS} fill="none" stroke="#333" strokeWidth="8" />
              <circle
                cx={RING_CX} cy={RING_CY} r={RING_RADIUS}
                fill="none" stroke="#E85D26" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl font-bold tabular-nums" style={{ color: '#E85D26' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest --selectProjects unit -- tests/unit/components/TabataRunner.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TabataRunner.tsx tests/unit/components/TabataRunner.test.tsx
git commit -m "feat(session): add TabataRunner component with work/rest cycle"
```

---

### Task 9: PlanSessionRunner Integration + E2E Tests

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`
- Modify: `tests/e2e/helpers/setup.ts`
- Modify: `tests/e2e/trainer.spec.ts`
- Modify: `tests/e2e/trainee.spec.ts`
- Modify: `tests/e2e/failure-paths.spec.ts`

**Interfaces:**
- Consumes: `TabataRunner` + `TabataExercise` (Task 8). `TrainingPlanWithDetails` with `isTabata`/`workTimeSecs`/`restTimeSecs` on items (Task 1). i18n key `sessionRunner.logError` (already exists).
- Produces: Full end-to-end tabata session flow.

- [ ] **Step 1: Update `PlanSessionRunner.tsx` — add tabata handler and render branch**

Add `handleTabataDone` after the existing `handleSeriesSetDone` function:

```typescript
async function handleTabataDone(exerciseId: string, round: number, durationSecs: number) {
  if (!sessionId) return
  setLogError(null)
  try {
    const res = await fetch(`/api/sessions/${sessionId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        planItemId: currentItem!.id,
        setNumber: round,
        durationSecs,
      }),
    })
    if (!res.ok) setLogError(t('logError'))
  } catch {
    setLogError(t('logError'))
  }
}
```

Add the `TabataRunner` import at the top of the file:

```typescript
import { TabataRunner } from '@/components/TabataRunner'
import type { TabataExercise } from '@/components/TabataRunner'
```

In the `phase === 'running' && currentItem` render block, add a new branch **before** the `isSeries` check:

```typescript
const isTabata = currentItem.isTabata ?? false

if (isTabata) {
  const sorted = currentItem.exercises.slice().sort((a, b) => a.order - b.order)
  const tabataExercises: TabataExercise[] = sorted.map((ex) => ({
    id: ex.id,
    exerciseId: ex.exerciseId,
    name: ex.exercise.name,
    media: ex.exercise.media,
  }))
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
      <TabataRunner
        exercises={tabataExercises}
        totalRounds={sorted[0].sets}
        workTimeSecs={currentItem.workTimeSecs!}
        restTimeSecs={currentItem.restTimeSecs!}
        onExerciseDone={handleTabataDone}
        onComplete={() => {
          playSetComplete()
          if (itemIndex + 1 >= plan.items.length) {
            router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}&planId=${plan.id}`)
          } else {
            setItemIndex((prev) => prev + 1)
          }
        }}
      />
      {logError && <p className="text-sm text-red-400">{logError}</p>}
    </>
  )
}
```

The existing `isSeries` and single-exercise branches remain unchanged below this new block.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit PlanSessionRunner change**

```bash
git add src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx
git commit -m "feat(session): render TabataRunner for tabata plan items"
```

- [ ] **Step 4: Add `seedTabataPlan` helper to `tests/e2e/helpers/setup.ts`**

Add after the existing `seedSeriesPlan` function:

```typescript
export async function seedTabataPlan(data: {
  name: string
  exercises: Array<{ exerciseId: string }>
  sets: number
  workTimeSecs: number
  restTimeSecs: number
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  const item = await prisma.trainingPlanItem.create({
    data: {
      planId: plan.id,
      position: 1,
      isTabata: true,
      workTimeSecs: data.workTimeSecs,
      restTimeSecs: data.restTimeSecs,
    },
  })
  for (let i = 0; i < data.exercises.length; i++) {
    await prisma.trainingPlanItemExercise.create({
      data: {
        itemId: item.id,
        exerciseId: data.exercises[i].exerciseId,
        sets: data.sets,
        reps: 0,
        order: i + 1,
      },
    })
  }
  return plan
}
```

- [ ] **Step 5: Add trainer E2E test for tabata badge**

In `tests/e2e/trainer.spec.ts`, add a new `test.describe` block:

```typescript
test.describe('Trainer — Tabata plan item', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
  })

  test('trainer creates tabata series — badge shows TABATA in plan builder', async ({ page }) => {
    const exA = await seedExercise({ name: 'Push Ups', trackingType: 'NONE' })
    const exB = await seedExercise({ name: 'Burpees', trackingType: 'NONE' })
    const plan = await seedPlan({ name: 'HIIT Plan', items: [] })

    await page.goto(`/trainer/plans/${plan.id}`)
    await page.click('text=Add Item')

    // Add two exercises
    await page.fill('[placeholder="Exercise 1"]', 'Push Ups')
    await page.click('text=Push Ups')
    await page.click('text=+ Add Exercise')
    await page.fill('[placeholder="Exercise 2"]', 'Burpees')
    await page.click('text=Burpees')

    // Enable tabata mode
    await page.check('input[type="checkbox"]')
    await page.fill('[name=workTimeSecs]', '20')
    await page.fill('[name=restTimeSecs]', '10')

    await page.getByRole('dialog').getByRole('button', { name: 'Add Item' }).click()

    await expect(page.locator('text=TABATA')).toBeVisible()
  })
})
```

- [ ] **Step 6: Add trainee E2E test for tabata session**

In `tests/e2e/trainee.spec.ts`, find the existing trainee test describe block and add:

```typescript
test('trainee runs tabata plan — timers fire and session completes', async ({ page }) => {
  const trainee = await seedTrainee({ name: 'Tabata Athlete' })
  const exA = await seedExercise({ name: 'Jump Squats', trackingType: 'NONE' })
  const exB = await seedExercise({ name: 'Mountain Climbers', trackingType: 'NONE' })
  const plan = await seedTabataPlan({
    name: 'Quick Tabata',
    exercises: [{ exerciseId: exA.id }, { exerciseId: exB.id }],
    sets: 1,
    workTimeSecs: 3,   // short for test speed
    restTimeSecs: 2,
  })

  await page.goto(`/trainee/${trainee.id}`)
  await page.click('text=Quick Tabata')
  await page.click("text=LET'S GO")

  // First exercise work phase
  await expect(page.locator('text=Jump Squats')).toBeVisible()
  await expect(page.locator('text=TABATA')).toBeVisible()
  await expect(page.locator('text=Round 1 of 1')).toBeVisible()

  // Wait for work timer to expire (3s + buffer)
  await page.waitForTimeout(4000)

  // Rest phase
  await expect(page.locator('text=REST')).toBeVisible()

  // Wait for rest timer to expire (2s + buffer)
  await page.waitForTimeout(3000)

  // Second exercise
  await expect(page.locator('text=Mountain Climbers')).toBeVisible()
  await expect(page.locator('text=Exercise 2 of 2')).toBeVisible()

  // Wait for second work timer
  await page.waitForTimeout(4000)

  // Session completes (last exercise of last round — no rest, goes to finish)
  await expect(page).toHaveURL(/\/finish/)
})
```

Add the import for `seedTabataPlan` at the top of `trainee.spec.ts`:

```typescript
import { seedTrainee, seedExercise, seedTabataPlan, cleanDatabase } from './helpers/setup'
```

- [ ] **Step 7: Add failure-path E2E tests**

In `tests/e2e/failure-paths.spec.ts`, append inside the existing `test.describe('Failure paths', ...)`:

```typescript
  test('tabata toggle with 1 exercise — API returns 422', async ({ page }) => {
    const plan = await seedPlan({ name: 'Tabata Test Plan', items: [] })
    await seedExercise({ name: 'Solo Exercise', trackingType: 'NONE' })

    await page.goto(`/trainer/plans/${plan.id}`)
    await page.click('text=Add Item')
    await page.fill('[placeholder="Exercise 1"]', 'Solo Exercise')
    await page.click('text=Solo Exercise')

    // Tabata toggle not visible with 1 exercise — force test via direct API call
    const res = await page.request.post(`/api/plans/${plan.id}/items`, {
      data: {
        position: 1,
        isTabata: true,
        workTimeSecs: 20,
        restTimeSecs: 10,
        exercises: [{ exerciseId: 'some-id', sets: 3, reps: 0, order: 1 }],
      },
    })
    expect(res.status()).toBe(400)
  })

  test('tabata missing workTimeSecs — API returns 400', async ({ page }) => {
    const plan = await seedPlan({ name: 'Tabata Test Plan 2', items: [] })
    const res = await page.request.post(`/api/plans/${plan.id}/items`, {
      data: {
        position: 1,
        isTabata: true,
        restTimeSecs: 10,
        exercises: [
          { exerciseId: 'id1', sets: 3, reps: 0, order: 1 },
          { exerciseId: 'id2', sets: 3, reps: 0, order: 2 },
        ],
      },
    })
    expect(res.status()).toBe(400)
  })
```

- [ ] **Step 8: Rebuild Docker image and run E2E tests**

```bash
docker compose -f docker-compose.test.yml build
npx playwright test tests/e2e/trainer.spec.ts tests/e2e/trainee.spec.ts tests/e2e/failure-paths.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 9: Final typecheck and unit test run**

```bash
npm run typecheck && npm run test:unit
```

Expected: no errors, all unit tests pass.

- [ ] **Step 10: Commit**

```bash
git add tests/e2e/helpers/setup.ts tests/e2e/trainer.spec.ts tests/e2e/trainee.spec.ts tests/e2e/failure-paths.spec.ts
git commit -m "test(e2e): add tabata trainer, trainee, and failure-path E2E tests"
```
