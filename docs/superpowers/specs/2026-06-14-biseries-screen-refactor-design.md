# Biseries Screen Refactor — Design Spec

**Date:** 2026-06-14
**Status:** Approved

---

## Problem

The current biseries (superset) implementation renders two exercises sequentially: Exercise A (all sets) → Exercise B (all sets). This defeats the purpose of a superset, which requires **interleaved** execution without rest between the two exercises within each round:

```
A-set1 → B-set1 → REST → A-set2 → B-set2 → REST → A-set3 → B-set3
```

A superset increases training intensity by targeting different muscle groups back-to-back. The current UI allows trainees to complete all of A before touching B, which loses this benefit entirely.

---

## Goal

Treat a biseries as a single compound unit. Each "biseries set" = perform both exercises back-to-back, then rest. One shared set counter, one "Mark Set Done" button per round.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Execution model | Interleaved (true superset) | Matches the physical training concept |
| Set counts | Both exercises must have equal sets | Shared counter requires equal rounds |
| Mark done | Single button logs both simultaneously | One atomic action per set round |
| Rest timer | Between non-final sets; trainee sets duration | Intensity-appropriate; not persisted |

---

## Screen Flow

```
Biseries plan item starts
        │
        ▼
┌─────────────────────────────┐
│ BISERIES          Set 1 of 3│
│─────────────────────────────│
│ ▌ BENCH PRESS               │  ← orange left-border accent
│   Target: 10 reps           │    groups both exercises visually
│   Weight [___] Reps [___]   │
│─────────────────────────────│
│ ▌ BARBELL ROW               │
│   Target: 10 reps           │
│   Weight [___] Reps [___]   │
│─────────────────────────────│
│     [ MARK SET DONE ]       │
└─────────────────────────────┘
        │
        ▼ (not last set)
┌─────────────────────────────┐
│           REST              │
│     60    SECONDS           │
│   ○────────────────         │  ← animated SVG ring
│       [ START REST ]        │
│    [ SKIP → NEXT SET ]      │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ BISERIES          Set 2 of 3│
│  ...                        │
└─────────────────────────────┘
        │
        ▼ (after last set — no rest timer)
   Advance to next plan item
```

---

## Architecture

### New Components

#### `src/components/BiSeriesSetLogger.tsx`

Renders both exercise input cards grouped by an orange left-border accent. Manages local state for both exercises' inputs. One "MARK SET DONE" button — disabled until both exercises have valid inputs.

```typescript
interface SetLogData {
  weightKg?: number | null
  repsDone?: number | null
  durationSecs?: number | null
}

interface BiSeriesExercise {
  name: string
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
}

interface BiSeriesSetLoggerProps {
  setNumber: number
  totalSets: number
  exerciseA: BiSeriesExercise
  exerciseB: BiSeriesExercise
  onMarkDone: (dataA: SetLogData, dataB: SetLogData) => void
}
```

- Does **not** compose `WeightSetLogger`/`TimeSetLogger` as children — avoids button coupling. Reuses their input field patterns inline.
- For TIME tracking type: shows duration input (seconds) instead of weight+reps.

#### `src/components/RestTimerScreen.tsx`

Interstitial screen between biseries sets.

```typescript
interface RestTimerScreenProps {
  onComplete: () => void
}
```

- Number input for duration (default 60s), editable before starting
- Circular SVG countdown ring (orange `#E85D26` stroke) — matches `TimeSetLogger` ring style
- "START REST" begins countdown; ring drains clockwise
- "SKIP → NEXT SET" fires `onComplete` immediately
- Countdown reaching 0 auto-fires `onComplete`

### Modified: `PlanSessionRunner.tsx`

`src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

**State additions:**
```typescript
const [biSeriesSetCount, setBiSeriesSetCount] = useState<Record<string, number>>({}) // keyed by item.id
const [showRestTimer, setShowRestTimer] = useState(false)
```

**Render logic:**
```typescript
const isBiseries = currentItem.exercises.length === 2

if (isBiseries) {
  const currentSet = biSeriesSetCount[currentItem.id] ?? 0
  const totalSets = currentItem.exercises[0].sets

  if (showRestTimer) return <RestTimerScreen onComplete={handleRestComplete} />

  return (
    <BiSeriesSetLogger
      setNumber={currentSet + 1}
      totalSets={totalSets}
      exerciseA={...slotA}
      exerciseB={...slotB}
      onMarkDone={handleBiSeriesSetDone}
    />
  )
}
// else: existing single-exercise SetLogger flow unchanged
```

**`handleBiSeriesSetDone`:**
```typescript
async function handleBiSeriesSetDone(dataA: SetLogData, dataB: SetLogData) {
  const setNumber = (biSeriesSetCount[currentItem.id] ?? 0) + 1
  await Promise.all([
    logSet({ exerciseId: slotA.exerciseId, planItemId: currentItem.id, setNumber, ...dataA }),
    logSet({ exerciseId: slotB.exerciseId, planItemId: currentItem.id, setNumber, ...dataB }),
  ])
  const newCount = setNumber
  setBiSeriesSetCount(prev => ({ ...prev, [currentItem.id]: newCount }))
  if (newCount < totalSets) {
    setShowRestTimer(true)   // show rest timer between sets
  } else {
    advanceToNextItem()      // last set done — no rest timer
  }
}
```

### Modified: `TrainingPlanService.ts`

`src/lib/services/TrainingPlanService.ts` — `addItem()` method:

```typescript
if (exercises.length === 2 && exercises[0].sets !== exercises[1].sets) {
  throw new ValidationError('biseries exercises must have equal set counts')
}
```

Logged as:
```typescript
logger.warn({ service: 'TrainingPlanService', operation: 'addItem', outcome: 'blocked', rule: 'biseries-equal-sets' }, 'Biseries rejected — unequal set counts')
```

### Modified: `AddItemModal.tsx`

`src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

When `type === 'biseries'`, slot 2 sets input auto-mirrors slot 1 value via `useEffect`. Add helper text: "Biseries exercises must have the same number of sets."

---

## Data Flow: Logging

Schema unchanged. Per biseries set done: 2 `TrainingSessionLog` rows created simultaneously via `Promise.all`.

```
BiSeriesSet 1 done:
  TrainingSessionLog { exerciseId: slotA.exerciseId, planItemId, setNumber: 1, weightKg: 80, repsDone: 10 }
  TrainingSessionLog { exerciseId: slotB.exerciseId, planItemId, setNumber: 1, weightKg: 60, repsDone: 10 }

BiSeriesSet 2 done:
  TrainingSessionLog { exerciseId: slotA.exerciseId, planItemId, setNumber: 2, ... }
  TrainingSessionLog { exerciseId: slotB.exerciseId, planItemId, setNumber: 2, ... }
```

Both rows share the same `planItemId` and `setNumber`, allowing them to be grouped as one biseries round.

---

## Tests

### Unit

- `tests/unit/components/BiSeriesSetLogger.test.tsx`
  - Renders both exercise cards with correct names and targets
  - "MARK SET DONE" disabled until both exercises have valid inputs
  - `onMarkDone` called with correct data for both exercises
  - WEIGHT card: renders weight + reps inputs
  - TIME card: renders duration input only

- `tests/unit/components/RestTimerScreen.test.tsx`
  - Default duration is 60s
  - Duration input editable before start
  - "SKIP → NEXT SET" fires `onComplete` immediately
  - Countdown fires `onComplete` at 0

- `tests/unit/services/TrainingPlanService.test.ts` (addition)
  - `addItem` throws `ValidationError` when biseries exercises have unequal set counts

### Integration

- `tests/integration/services/SessionService.test.ts` (addition)
  - Biseries set done → exactly 2 `TrainingSessionLog` rows with matching `planItemId` and `setNumber`

### E2E

- `tests/e2e/trainee.spec.ts` (addition)
  - Trainee opens biseries plan → both exercises visible on one screen
  - Fills both inputs → taps "MARK SET DONE"
  - Rest timer appears with 60s default
  - Taps "SKIP → NEXT SET" → set 2 shown
  - Completes all sets → advances to next item (no rest timer after final set)

---

## Out of Scope

- Rest timer persistence (not stored in DB)
- Rest timer for single-exercise items
- Trisets / giant sets (future extension via step-model refactor)
- Biseries history / analytics grouping
