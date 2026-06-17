# Tabata Mode — Design Spec

**Date:** 2026-06-17
**Status:** Approved

---

## Problem

Series items only support rep-based tracking. Tabata — a time-driven circuit protocol where each exercise is performed for a fixed work duration, separated by fixed rest periods, for a set number of rounds — cannot be expressed in the current model. Trainers who program tabata circuits have no way to encode work/rest timing or automate the chrono in the trainee session runner.

---

## Goal

Add a tabata mode to series plan items (2+ exercises). When enabled:
- Trainer specifies **work time** (seconds per exercise), **rest time** (seconds between exercises), and **rounds** (number of full circuits).
- Trainee session auto-cycles through exercises: work timer → rest timer → next exercise, for each round.
- Trainee can stop the current work timer early; rest fires normally before advancing.

Tabata mode is series-only (requires 2+ exercises). Single-exercise items are unaffected.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Config location | `TrainingPlanItem` (3 new columns) | Tabata is a series-level mode; config is shared across all exercises in the circuit |
| `reps` in tabata | Stored as `0` | Avoids making `reps` nullable everywhere; ignored at runtime |
| `sets` in tabata | Reused as round count | Same semantics — "how many times you do this block" |
| Rest trigger | After every exercise (including between rounds) | User-confirmed: rest fires between every exercise without exception |
| Trailing rest | No rest after last exercise of last round | Series completes immediately |
| Stop & Next | Work timer stops → rest fires → next exercise | Exception: last exercise of last round completes immediately (no rest) |
| Session logging | One `TrainingSessionLog` per exercise per round (`durationSecs = actual elapsed`) | Same shape as TIME-tracked exercise; honest tracking of actual time spent |
| Tabata in single-exercise | Not supported | User decision: tabata is a series concept |

---

## Screen Flow

```
Tabata item starts (3 exercises, 8 rounds, 20s work, 10s rest)
        │
        ▼
┌─────────────────────────────┐
│ TABATA         Round 1 of 8 │
│ Exercise 1 of 3             │
│─────────────────────────────│
│ BENCH PRESS                 │
│                             │
│         ◯ 00:20 ◯           │  ← orange ring countdown
│                             │
│   [Stop & Next Exercise]    │  ← secondary button
└─────────────────────────────┘
        │ (timer hits 0 OR stop pressed)
        ▼
┌─────────────────────────────┐
│           REST              │
│         00:10               │  ← orange ring, no stop button
└─────────────────────────────┘
        │ (rest done)
        ▼
┌─────────────────────────────┐
│ TABATA         Round 1 of 8 │
│ Exercise 2 of 3             │
│─────────────────────────────│
│ BARBELL ROW                 │  ...
└─────────────────────────────┘
        │
        ▼  (after exercise 3 of round 1 → rest → exercise 1 of round 2 …)
        │
        ▼  (after exercise 3 of round 8)
   No rest — advance to next plan item immediately
```

---

## Architecture

### `prisma/schema.prisma`

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

One migration adds the three columns. Existing rows default to `isTabata=false`, `workTimeSecs=null`, `restTimeSecs=null`.

### `src/lib/domain/constants.ts`

No new constants required. `MAX_SERIES_EXERCISES` (5) already caps circuit size.

### `src/lib/domain/plan.ts`

```typescript
export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  isTabata: z.boolean().optional().default(false),
  workTimeSecs: z.number().int().positive().optional(),
  restTimeSecs: z.number().int().positive().optional(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().nonnegative(),  // 0 for tabata exercises
    order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
  })).min(1).max(MAX_SERIES_EXERCISES),
}).superRefine((val, ctx) => {
  if (val.isTabata) {
    if (val.exercises.length < 2)
      ctx.addIssue({ code: 'custom', path: ['exercises'], message: 'tabata requires at least 2 exercises' })
    if (!val.workTimeSecs)
      ctx.addIssue({ code: 'custom', path: ['workTimeSecs'], message: 'workTimeSecs required for tabata' })
    if (!val.restTimeSecs)
      ctx.addIssue({ code: 'custom', path: ['restTimeSecs'], message: 'restTimeSecs required for tabata' })
  }
})

// ITrainingPlanRepository.addItem signature update:
addItem(
  planId: string,
  position: number,
  exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>,
  tabata?: { workTimeSecs: number; restTimeSecs: number },
): Promise<TrainingPlanItem>
```

### `src/lib/services/TrainingPlanService.ts` — `addItem()`

Passes `tabata` config through to the repository. No new business rules beyond what `AddPlanItemSchema` enforces (tabata requires 2+ exercises, `workTimeSecs`, `restTimeSecs`). The existing contiguous-order and equal-sets checks still apply.

```typescript
async addItem(planId: string, position: number, input: AddPlanItemInput): Promise<TrainingPlanItem> {
  logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId }, 'Adding item to plan')

  const orders = input.exercises.map((e) => e.order).sort((a, b) => a - b)
  const isContiguous = orders.every((o, i) => o === i + 1)
  if (!isContiguous) {
    logger.warn({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'series-order-contiguous' }, 'Series rejected — non-contiguous order')
    throw new ValidationError('series exercises must have contiguous order starting at 1')
  }

  if (input.exercises.length > 1) {
    const allEqualSets = input.exercises.every((e) => e.sets === input.exercises[0].sets)
    if (!allEqualSets) {
      logger.warn({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'series-equal-sets' }, 'Series rejected — unequal set counts')
      throw new ValidationError('series exercises must have equal set counts')
    }
  }

  const tabata = input.isTabata
    ? { workTimeSecs: input.workTimeSecs!, restTimeSecs: input.restTimeSecs! }
    : undefined

  const item = await this.repo.addItem(planId, position, input.exercises, tabata)
  logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: item.id, outcome: 'created', isTabata: input.isTabata ?? false }, 'Plan item added')
  return item
}
```

### `src/lib/repositories/TrainingPlanRepository.ts`

`addItem` Prisma call gains `isTabata`, `workTimeSecs`, `restTimeSecs` fields:

```typescript
async addItem(planId, position, exercises, tabata) {
  return this.prisma.trainingPlanItem.create({
    data: {
      planId,
      position,
      isTabata: tabata ? true : false,
      workTimeSecs: tabata?.workTimeSecs ?? null,
      restTimeSecs: tabata?.restTimeSecs ?? null,
      exercises: { create: exercises.map((e) => ({ ...e })) },
    },
  })
}
```

`TrainingPlanWithDetails` picks up the new fields automatically via Prisma's generated types.

---

## Trainer UI — `AddItemModal.tsx`

New state:
```typescript
const [isTabata, setIsTabata] = useState(false)
const [workTimeSecs, setWorkTimeSecs] = useState('20')
const [restTimeSecs, setRestTimeSecs] = useState('10')
```

- Tabata toggle visible only when `rows.length >= 2`.
- When rows drop to 1, force `isTabata = false`.
- When tabata on: per-row `reps` inputs hidden; two shared fields appear below `sets`.
- `sets` label: `t('rounds')` when tabata, `t('sets')` otherwise.

```
┌─────────────────────────────────────────┐
│ Add Exercise                            │
│─────────────────────────────────────────│
│ Exercise 1                   [Remove]   │
│ [_____ search _____]                    │
│─────────────────────────────────────────│
│ Exercise 2                   [Remove]   │
│ [_____ search _____]                    │
│─────────────────────────────────────────│
│ [+ Add Exercise]                        │
│─────────────────────────────────────────│
│ Rounds   [8]                            │
│                                         │
│ ☑ Tabata mode                           │
│   Work time (sec)  [20]                 │
│   Rest time (sec)  [10]                 │
│─────────────────────────────────────────│
│ [Add]                [Cancel]           │
└─────────────────────────────────────────┘
```

Submit body (tabata):
```typescript
{
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
```

---

## Trainer UI — `PlanBuilder.tsx`

Badge for tabata items:

```
TABATA · 3 exercises · 8 rounds · 20s work / 10s rest
```

i18n key: `planBuilder.tabataBadge` with interpolations `{ count, rounds, work, rest }`.

---

## Trainee UI — `src/components/TabataRunner.tsx`

New component. Owns the full work→rest→next cycle.

```typescript
interface TabataRunnerProps {
  exercises: Array<{
    id: string
    exerciseId: string
    name: string
    media: ExerciseMedia[]
  }>
  totalRounds: number
  workTimeSecs: number
  restTimeSecs: number
  onExerciseDone: (exerciseId: string, round: number, durationSecs: number) => Promise<void>
  onComplete: () => void
}
```

Internal state:
```typescript
type TabataPhase = 'work' | 'rest'

const [phase, setPhase] = useState<TabataPhase>('work')
const [exerciseIdx, setExerciseIdx] = useState(0)   // 0-based
const [round, setRound] = useState(1)               // 1-based
```

**Transition logic (shared by natural completion and Stop & Next):**

```typescript
async function handleWorkDone(elapsed: number) {
  const ex = exercises[exerciseIdx]
  await onExerciseDone(ex.exerciseId, round, elapsed)

  const isLastExercise = exerciseIdx === exercises.length - 1
  const isLastRound = round === totalRounds

  if (isLastExercise && isLastRound) {
    onComplete()
    return
  }

  // Always fire rest (between every exercise, including round boundaries)
  setPhase('rest')
  // nextExerciseIdx / nextRound computed in handleRestDone
}

function handleRestDone() {
  const isLastExercise = exerciseIdx === exercises.length - 1
  if (isLastExercise) {
    setExerciseIdx(0)
    setRound((r) => r + 1)
  } else {
    setExerciseIdx((i) => i + 1)
  }
  setPhase('work')
}
```

Work phase renders: exercise name, media button, ring countdown (same SVG ring as `TimeSetLogger`), "Stop & Next Exercise" secondary button. Stop button is disabled while `onExerciseDone` is in-flight (same `loading` guard pattern as `TimeSetLogger`).

Rest phase renders: "REST" heading, ring countdown, no stop button.

Reuses: `playTick()`, `playTimeUp()`, `navigator.vibrate(200)` at same thresholds as `TimeSetLogger`. Reuses `MediaViewer` for media button.

---

## Trainee UI — `PlanSessionRunner.tsx` changes

New handler:
```typescript
async function handleTabataDone(exerciseId: string, round: number, durationSecs: number) {
  if (!sessionId || logging.current) return
  logging.current = true
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
  } finally {
    logging.current = false
  }
}
```

Render branch — new tabata case, checked before `isSeries`:
```typescript
if (currentItem.isTabata) {
  const sorted = currentItem.exercises.slice().sort((a, b) => a.order - b.order)
  return (
    <TabataRunner
      exercises={sorted.map((ex) => ({
        id: ex.id,
        exerciseId: ex.exerciseId,
        name: ex.exercise.name,
        media: ex.exercise.media,
      }))}
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
  )
}
```

No changes to `SeriesSetLogger`, `SetLogger`, or `RestTimerScreen`.

---

## Session Logging

Each exercise completion logs one `TrainingSessionLog`:

| Field | Value |
|---|---|
| `exerciseId` | the exercise |
| `planItemId` | `currentItem.id` |
| `setNumber` | round number (1-based) |
| `durationSecs` | actual elapsed seconds |
| `weightKg` | null |
| `repsDone` | null |

N exercises × R rounds = N×R log rows. Same shape as a TIME-tracked set — no schema change.

---

## i18n — `src/i18n/en.json` additions

| Namespace | Key | Value |
|---|---|---|
| `planBuilder` | `tabataMode` | `"Tabata mode"` |
| `planBuilder` | `workTime` | `"Work time (sec)"` |
| `planBuilder` | `restTime` | `"Rest time (sec)"` |
| `planBuilder` | `rounds` | `"Rounds"` |
| `planBuilder` | `tabataBadge` | `"TABATA · {count} exercises · {sets} rounds · {work}s / {rest}s"` |
| `session` | `tabataBadge` | `"TABATA"` |
| `session` | `tabataRound` | `"Round {current} of {total}"` |
| `session` | `tabataExercise` | `"Exercise {current} of {total}"` |
| `session` | `stopAndNext` | `"Stop & Next Exercise"` |

---

## Tests

### Unit

- `tests/unit/domain/plan.test.ts`
  - Tabata with 1 exercise rejected (superRefine)
  - Tabata missing `workTimeSecs` rejected
  - Tabata missing `restTimeSecs` rejected
  - Valid tabata (2+ exercises, both times present) accepted
  - `reps: 0` passes nonnegative check
  - Non-tabata with `reps: 0` also valid (nonnegative)

- `tests/unit/services/TrainingPlanService.test.ts`
  - `addItem` with `isTabata: true` passes `{ workTimeSecs, restTimeSecs }` to repo
  - `addItem` with `isTabata: false` passes `undefined` tabata to repo

- `tests/unit/components/TabataRunner.test.tsx`
  - Work timer counts down and fires `onExerciseDone` with elapsed time
  - After `onExerciseDone`, rest phase renders
  - After rest phase, next exercise shown
  - Round increments after last exercise in circuit
  - Stop & Next mid-circuit → `onExerciseDone` called with elapsed → rest fires
  - Stop & Next on last exercise of last round → `onComplete` called, no rest

### Integration

- `tests/integration/repositories/TrainingPlanRepository.test.ts`
  - Tabata item persists `isTabata=true`, `workTimeSecs`, `restTimeSecs`
  - Non-tabata item has `isTabata=false`, `workTimeSecs=null`, `restTimeSecs=null`
  - `findForSession` returns tabata fields on items

### E2E

- `tests/e2e/trainer.spec.ts`
  - Trainer creates 2-exercise tabata series; plan builder badge shows "TABATA"
- `tests/e2e/trainee.spec.ts`
  - Trainee runs tabata plan: work timer counts down, rest fires between exercises, rounds increment, session completes at end of last round
- `tests/e2e/failure-paths.spec.ts`
  - Tabata toggle enabled with 1 exercise → API returns 422
  - Tabata submit without `workTimeSecs` → API returns 422

---

## Out of Scope

- Tabata on single-exercise items.
- Per-exercise work/rest times (all exercises share the same timing).
- Rest between rounds distinct from rest between exercises.
- Persisting tabata phase state across page reload.
- Editing an existing plan item to add/remove tabata mode (edit flow not yet built).
- Calorie estimation from tabata duration.
