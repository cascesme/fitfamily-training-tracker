# Series Generalization — Design Spec

**Date:** 2026-06-16
**Status:** Approved

---

## Problem

Biseries hardcodes exactly 2 exercises performed back-to-back with no rest between them, via a fixed `slot: 1 | 2` field, fixed `exerciseA`/`exerciseB` props on `BiSeriesSetLogger`, and `exercises.length === 2` checks scattered across the service, repository, and UI layers (`TrainingPlanService.addItem`, `PlanSessionRunner`, `AddItemModal`, `PlanBuilder`).

As the app scales, trainers want supersets/circuits of more than 2 exercises (up to 5) performed back-to-back. The current model can't express that without either a parallel concept (more code paths, duplicated validation) or hardcoding a new fixed-N component.

---

## Goal

Generalize biseries into **series**: 1–5 exercises sharing one contiguous `order` sequence within a `TrainingPlanItem`, performed back-to-back with one shared round counter and one rest timer between rounds. This **fully replaces** biseries — every "biseries" reference in schema, types, business rules, components, translation keys, and docs becomes "series." There is no coexistence and no legacy fallback path.

A series of 1 exercise is simply a single exercise — the trainer UI no longer needs a Single/Biseries mode toggle; one unified "add exercise rows" flow covers both.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Max exercises per series | 5 | User-specified scaling limit |
| Ordering field | `order: Int` (renamed from `slot`) | Same semantics, generalized name — no longer implies "exactly 2 slots" |
| Set counts | All exercises in a series must have equal sets | Preserves the shared round-counter invariant from biseries |
| Order validity | Sorted `order` values must be exactly `[1..N]`, no gaps/dupes | Subsumes both old biseries rules ("slot 2 requires slot 1", "must occupy 1 and 2") into one N-aware check |
| Trainer UX | Dynamic add/remove exercise rows, starting at 1, capped at 5 | One flow for both single exercises and series — no mode toggle |
| Rename scope | Full — DB field, component names, rule tags, i18n keys, docs | Avoids "series" UI text sitting on top of "biseries" internals |
| Coexistence | None — biseries is fully replaced | User decision; avoids duplicate validation/UI paths |

---

## Screen Flow (3-exercise series example — generalizes to N ≤ 5)

```
Series plan item starts
        │
        ▼
┌─────────────────────────────┐
│ SERIES             Set 1 of 3│
│─────────────────────────────│
│ ▌ BENCH PRESS               │  ← orange left-border accent
│   Target: 10 reps           │    groups all N exercises visually
│   Weight [___] Reps [___]   │
│─────────────────────────────│
│ ▌ BARBELL ROW                │
│   Target: 10 reps            │
│   Weight [___] Reps [___]    │
│─────────────────────────────│
│ ▌ LAT PULLDOWN                │
│   Target: 12 reps             │
│   Weight [___] Reps [___]     │
│─────────────────────────────│
│      [ MARK SET DONE ]       │
└─────────────────────────────┘
        │
        ▼ (not last round)
┌─────────────────────────────┐
│           REST              │
│     60    SECONDS           │
│   ○────────────────         │
│       [ START REST ]        │
│    [ SKIP → NEXT SET ]      │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ SERIES             Set 2 of 3│
│  ...                        │
└─────────────────────────────┘
        │
        ▼ (after last round — no rest timer)
   Advance to next plan item
```

---

## Architecture

### `prisma/schema.prisma`

`TrainingPlanItemExercise.slot` → `order` (same `Int` type, same 1-indexed semantics):

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

One Prisma migration renames the column and the unique constraint. No backfill — existing values (1, 2) are already valid under the new `[1..5]` range.

### `src/lib/domain/constants.ts`

```typescript
export const MAX_SERIES_EXERCISES = 5
```

### `src/lib/domain/plan.ts`

```typescript
export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
  })).min(1).max(MAX_SERIES_EXERCISES),
})

export interface ITrainingPlanRepository {
  // ...
  addItem(planId: string, position: number, exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>): Promise<TrainingPlanItem>
  findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null>
}
```

### `src/lib/services/TrainingPlanService.ts` — `addItem()`

Replaces the 3 hardcoded 2-exercise checks with 2 N-aware checks:

```typescript
async addItem(planId: string, position: number, exercises: PlanItemExerciseInput[]): Promise<TrainingPlanItem> {
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

The `MAX_SERIES_EXERCISES` cap and `.min(1)` are enforced by `AddPlanItemSchema` at the API boundary (Zod 422), so no separate service-level length check is needed.

### `src/lib/repositories/TrainingPlanRepository.ts`

- `orderBy: { slot: 'asc' }` → `orderBy: { order: 'asc' }`.
- `findItemSlot(itemId, slot)` → `findItemAtOrder(itemId, order)`, Prisma lookup key `itemId_slot` → `itemId_order`.

### `src/components/SeriesSetLogger.tsx` (renamed from `BiSeriesSetLogger.tsx`)

```typescript
export interface SeriesExercise {
  id: string
  name: string
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
}

interface SeriesSetLoggerProps {
  setNumber: number
  totalSets: number
  exercises: SeriesExercise[]
  onMarkDone: (data: SetLogData[]) => Promise<void>
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
      <Button variant="primary" size="lg" className="w-full" onClick={handleDone} disabled={!canSubmit || loading}>
        {t('markSetDone')}
      </Button>
    </div>
  )
}
```

`ExerciseCard` and `isValid`/`toLogData`/`initialState` helpers are unchanged from `BiSeriesSetLogger.tsx`.

### `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

Drops the `type: 'single' | 'biseries'` toggle. Replaced with a `rows` array:

```typescript
interface Row { exerciseId: string; sets: string; reps: string }

const [rows, setRows] = useState<Row[]>([{ exerciseId: '', sets: '3', reps: '10' }])

function addRow() {
  if (rows.length >= MAX_SERIES_EXERCISES) return
  setRows((prev) => [...prev, { exerciseId: '', sets: prev[0].sets, reps: '10' }])
}
function removeRow(index: number) {
  setRows((prev) => prev.filter((_, i) => i !== index))
}
function updateRow(index: number, patch: Partial<Row>) {
  setRows((prev) => prev.map((r, i) => {
    if (i === index) return { ...r, ...patch }
    if (index === 0 && 'sets' in patch) return { ...r, sets: patch.sets! } // propagate row 0 sets to all rows
    return r
  }))
}
```

Submit body: `exercises: rows.map((r, i) => ({ exerciseId: r.exerciseId, sets: Number(r.sets), reps: Number(r.reps), order: i + 1 }))`.

Validation: first row with empty `exerciseId` → `t('exerciseRequired', { n: index + 1 })`.

### `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx`

Badge: `exercises.length === 1 ? t('single') : t('series', { count: exercises.length })`. Item exercise list ordered by `order` instead of `slot`.

### `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

- `isBiseries = currentItem.exercises.length === 2` → `isSeries = currentItem.exercises.length > 1`.
- `const sorted = currentItem.exercises.slice().sort((a, b) => a.order - b.order)`.
- `biSeriesSet` state → `seriesRoundProgress`; `biSeriesTotalSets` → `seriesTotalSets = sorted[0].sets`.
- `handleBiSeriesSetDone(dataA, dataB)` → `handleSeriesSetDone(data: SetLogData[])`, generalizing the 2-item `Promise.all` to `Promise.all(sorted.map((ex, i) => fetch(...with data[i])))`.
- `<BiSeriesSetLogger exerciseA={...} exerciseB={...}>` → `<SeriesSetLogger exercises={sorted.map(...)} totalSets={sorted[0].sets} onMarkDone={handleSeriesSetDone} />`.

### `src/i18n/en.json`

`biseries` → `series`, `slot1Label`/`slot2Label` → interpolated `exerciseNLabel`, `slot1Required`/`slot2Required` → interpolated `exerciseRequired`, `biSeriesBadge` → `seriesBadge`.

---

## Data Flow: Logging

Schema unchanged in shape. Per series round done: N `TrainingSessionLog` rows created simultaneously via `Promise.all`, sharing `planItemId` and `setNumber`:

```
Series round 1 done (3 exercises):
  TrainingSessionLog { exerciseId: ex1.exerciseId, planItemId, setNumber: 1, ... }
  TrainingSessionLog { exerciseId: ex2.exerciseId, planItemId, setNumber: 1, ... }
  TrainingSessionLog { exerciseId: ex3.exerciseId, planItemId, setNumber: 1, ... }
```

---

## Tests

### Unit

- `tests/unit/domain/plan.test.ts` — series cases (rename from biseries): 1–5 exercises valid, 6 exercises rejected (exceeds `MAX_SERIES_EXERCISES`), non-contiguous `order` (e.g. `[1,3]`) rejected.
- `tests/unit/services/TrainingPlanService.test.ts` — rename existing cases; add unequal-sets across 3+ exercises (rejected), 5-exercise contiguous order (accepted).
- `tests/unit/components/SeriesSetLogger.test.tsx` (renamed from `BiSeriesSetLogger.test.tsx`) — renders N exercise cards, button disabled until all N have valid input, `onMarkDone` called with an array of N data objects, mixed TIME/WEIGHT tracking types across exercises in the same series.

### Integration

- `tests/integration/repositories/TrainingPlanRepository.test.ts` — rename `addItem creates biseries item` → `addItem creates series item`; add a 5-exercise persistence case.

### E2E

- `tests/e2e/trainer.spec.ts` — rename `creates training plan with biseries` → `creates training plan with series`.
- `tests/e2e/failure-paths.spec.ts` — rename + generalize message ("Slot 1 exercise is required" → "Exercise 1 is required"); **add** a new failure-path test for attempting a 6th exercise row (limit enforcement, same pattern as the existing 10-media-item-limit test).
- `tests/e2e/trainee.spec.ts` — rename `runs biseries plan` → `runs series plan`, keep shared-counter/rest-timer assertions, extend to a 3-exercise series.

---

## Out of Scope

- Relaxing the equal-sets rule (every exercise in a series must have equal sets — no per-exercise progress tracking).
- Rest timer persistence (not stored in DB) — unchanged from biseries.
- Series history / analytics grouping.
- Raising the 5-exercise cap further (revisit only if a real trainer need arises).

---

## Follow-up: Stale Pending Plans

Two **unexecuted** docs in this repo still assume the old biseries model and will need a rename/generalization pass before they're implemented:

- `docs/superpowers/specs/2026-06-16-plan-review-overlay-design.md` + `docs/superpowers/plans/2026-06-16-plan-review-overlay.md` — references `BiSeriesSetLogger`, `slot === 2`, `biSeriesSet` state, `t('biseries')`, and specific line numbers in `PlanSessionRunner.tsx` that this change renames/removes.
- `docs/superpowers/specs/2026-06-16-session-navigation-design.md` — references `handleBiSeriesSetDone` and biseries pairs.

Neither has corresponding code yet (verified via `git log` — no implementation commits past the doc commits), so there's no code conflict today. Whoever picks up either of those features next must first reconcile them with the series model (`order`, `SeriesSetLogger`, `handleSeriesSetDone`, N-exercise arrays) introduced here.
