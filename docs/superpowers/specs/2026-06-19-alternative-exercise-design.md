# Alternative Exercise in Training Plans — Design Spec

**Date:** 2026-06-19  
**Status:** Approved  
**Feature:** Swap a planned exercise for an alternative during a session

---

## 1. Overview

Trainers can attach an optional alternative exercise to any slot in a training plan item (single or series). During a session, the trainee can permanently switch to the alternative for that slot. The switch is one-way per session — no toggling back. The alternative has its own sets and reps, independent of the primary.

### Goals

- Let trainers pre-configure substitutions (e.g., injury accommodations, equipment constraints).
- Zero new models, zero new repositories, zero new API routes — extend existing payloads.
- Works for both single-exercise items and multi-exercise series.

---

## 2. Schema Changes

### 2.1 `TrainingPlanItemExercise` — 3 new nullable columns

```prisma
model TrainingPlanItemExercise {
  id         String           @id @default(cuid())
  itemId     String
  item       TrainingPlanItem @relation(fields: [itemId], references: [id])
  exerciseId String
  exercise   Exercise         @relation(fields: [exerciseId], references: [id], name: "PrimaryExercise")
  sets       Int
  reps       Int
  order      Int

  // Alternative exercise (optional)
  alternativeExerciseId String?
  alternativeExercise   Exercise? @relation(fields: [alternativeExerciseId], references: [id], name: "AlternativeExercise", onDelete: SetNull)
  alternativeSets       Int?
  alternativeReps       Int?

  @@unique([itemId, order])
}
```

### 2.2 `Exercise` — back-relations for named relations

```prisma
model Exercise {
  // ... existing fields ...
  planItems            TrainingPlanItemExercise[] @relation("PrimaryExercise")
  alternativePlanItems TrainingPlanItemExercise[] @relation("AlternativeExercise")
}
```

### Migration notes

- `alternativeExerciseId`, `alternativeSets`, `alternativeReps` all nullable — no data migration required.
- `alternativeExercise` FK uses `onDelete: SetNull` (Prisma default for nullable FK). If the alternative exercise is deleted, `alternativeExerciseId` is automatically set to NULL — the plan item remains valid, the slot just loses its alternative. No block on the delete; no new `ExerciseService` guard needed.

### 2.3 Business rules (service layer)

- `alternativeSets` and `alternativeReps` must both be set or both be null (co-presence rule).
- If `alternativeExerciseId` is set, then `alternativeSets` and `alternativeReps` must be set.
- `alternativeExerciseId` must differ from `exerciseId` (no self-alternative).
- `alternativeExerciseId` must reference an existing exercise — `TrainingPlanService.addPlanItem` calls `exerciseRepo.findById(alternativeExerciseId)` and throws `ValidationError` if null (same pattern as primary exercise validation). This surfaces as HTTP 422, not an opaque DB error.

---

## 3. Domain Layer Changes

### 3.1 `AddPlanItemSchema` (`src/lib/domain/plan.ts`)

Add optional alternative fields to the per-exercise object in the schema, with `superRefine` co-validation:

```ts
export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
    alternativeExerciseId: z.string().min(1).optional(),
    alternativeSets: z.number().int().positive().optional(),
    alternativeReps: z.number().int().positive().optional(),
  }).superRefine((ex, ctx) => {
    const hasAlt = !!ex.alternativeExerciseId
    const hasSets = ex.alternativeSets !== undefined
    const hasReps = ex.alternativeReps !== undefined

    if (hasAlt && !hasSets) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeSets required when alternativeExerciseId is set', path: ['alternativeSets'] })
    }
    if (hasAlt && !hasReps) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeReps required when alternativeExerciseId is set', path: ['alternativeReps'] })
    }
    if (!hasAlt && (hasSets || hasReps)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeExerciseId required when alternativeSets or alternativeReps is set', path: ['alternativeExerciseId'] })
    }
    if (hasAlt && ex.alternativeExerciseId === ex.exerciseId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeExerciseId must differ from exerciseId', path: ['alternativeExerciseId'] })
    }
  })).min(1).max(MAX_SERIES_EXERCISES),
})
```

### 3.2 `TrainingPlanItemExerciseWithDetails` — extend with alternative

```ts
export type TrainingPlanItemExerciseWithDetails = PrismaTrainingPlanItemExercise & {
  exercise: PrismaExercise & { media: ExerciseMedia[] }
  alternativeExercise: (PrismaExercise & { media: ExerciseMedia[] }) | null
}
```

### 3.3 `ITrainingPlanRepository` — update `addItem` signature

```ts
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
  }>
): Promise<TrainingPlanItem>
```

---

## 4. Repository Changes

### `TrainingPlanRepository`

- `addItem`: include the three alternative fields in the `create` payload (pass `undefined` when absent — Prisma treats undefined as omit, setting column to NULL).
- `findForSession`: include `alternativeExercise` in the nested `include` on `TrainingPlanItemExercise`:
  ```ts
  alternativeExercise: { include: { media: true } }
  ```

---

## 5. Service Changes

### `TrainingPlanService`

- `addPlanItem`: if `alternativeExerciseId` is present, call `exerciseRepo.findById(alternativeExerciseId)` and throw `ValidationError` if not found. Then pass all alternative fields through to repository.
- No new service methods required.

---

## 6. API Changes

All changes are to existing routes — no new routes.

### `POST /api/plans/[id]/items`

- Body already parsed via `AddPlanItemSchema`. Schema change propagates automatically.
- Swagger JSDoc annotation updated to document the three optional alternative fields and the co-presence constraint.

### `PATCH /api/plans/[id]/items/[itemId]`

- If this route exists and the modal uses it for edits, the same `AddPlanItemSchema` (or its update partial) must accept the alternative fields. Sending `alternativeExerciseId: undefined` (absent key) clears the alternative — repository update sets `alternativeExerciseId`, `alternativeSets`, `alternativeReps` to NULL explicitly.
- If the modal deletes and re-adds the item instead of patching, this route requires no change.

### `GET /api/plans/[id]` (session hydration path)

- `findForSession` now returns `alternativeExercise` in each `TrainingPlanItemExercise`. No route code change required if the repo include is updated.

---

## 7. Trainer UI — `AddItemModal`

Location: `src/components/trainer/AddItemModal.tsx` (or equivalent plan builder component).

### Layout per exercise row

```
┌─ Exercise row (slot N) ──────────────────────────────────────┐
│  [ExercisePicker]          Sets [__]  Reps [__]              │
│                                                              │
│  ▼ Add alternative exercise                                  │
│  ┌── Alternative section (collapsed by default) ───────────┐ │
│  │  [ExercisePicker]        Sets [__]  Reps [__]           │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- "Add alternative exercise" is a ghost toggle button (not a CTA).
- Expanding the section renders the alternative ExercisePicker + alternativeSets + alternativeReps.
- Validation mirrors primary: exercise required if section expanded, sets/reps required integers.
- Collapsed by default. If editing an existing item that already has an alternative, section opens pre-populated.
- Removing the alternative (collapsing / clearing picker) sends `alternativeExerciseId: undefined` — clears the DB columns.

### i18n keys (new)

```json
"plans": {
  "addAlternativeExercise": "Add alternative exercise",
  "alternativeExercise": "Alternative exercise",
  "alternativeExercisePlaceholder": "Select alternative exercise"
}
```

---

## 8. Trainee UI — `PlanSessionRunner`

Location: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/` (session runner component).

### State

```ts
const [alternativeActive, setAlternativeActive] = useState<Record<string, boolean>>({})
// Key: TrainingPlanItemExercise.id — true = alternative active for this slot
```

### Per-slot rendering

When `alternativeExercise` is present on a slot:

1. Show a ghost button **"Do alternative exercise instead"** below the exercise name, before the media strip. Button is visible only when `setsDone === 0` for that slot (no sets logged yet). Once the first set is logged the button is hidden — switch window is closed.
2. On tap → `setAlternativeActive(prev => ({ ...prev, [slot.id]: true }))` — one-way, no undo.
3. When `alternativeActive[slot.id]` is true:
   - Replace name, description, media strip with alternative exercise data.
   - Replace sets/reps with `alternativeSets` / `alternativeReps`.
   - Log `alternativeExercise.id` (not primary `exerciseId`) to `TrainingSessionLog.exerciseId`.
   - Button disappears — no toggle back.

### Biseries (series) handling

Works identically per slot. Each `TrainingPlanItemExercise` in a series has its own `alternativeActive` entry. Slot 1 and slot 2 can independently switch.

### i18n keys (new)

```json
"session": {
  "doAlternativeInstead": "Do alternative exercise instead"
}
```

### No new API route

`TrainingSessionLog` already stores `exerciseId`. Logging the alternative's `exerciseId` requires no schema or route change.

---

## 9. Logging

Existing logging conventions apply. New log event in `TrainingPlanService`:

```ts
logger.info({
  service: 'TrainingPlanService',
  operation: 'addPlanItem',
  entityId: planId,
  hasAlternative: exercises.some(e => !!e.alternativeExerciseId),
}, 'Plan item added')
```

No new log events needed in session runner (alternative choice is captured in the `TrainingSessionLog.exerciseId` record).

---

## 10. Testing

### Unit

- `AddPlanItemSchema` — new test cases:
  - `alternativeExerciseId` set, `alternativeSets` missing → error on `alternativeSets`
  - `alternativeExerciseId` set, `alternativeReps` missing → error on `alternativeReps`
  - `alternativeExerciseId` set, both missing → errors on both `alternativeSets` and `alternativeReps`
  - `alternativeSets` set without `alternativeExerciseId` → error on `alternativeExerciseId`
  - `alternativeExerciseId === exerciseId` → error on `alternativeExerciseId`
  - All three alternative fields set and valid → passes
  - No alternative fields → passes (unchanged behavior)
- `TrainingPlanService.addPlanItem`:
  - `alternativeExerciseId` references non-existent exercise → throws `ValidationError`
  - valid alternative → fields passed through to repository
  - no alternative → `alternativeExerciseId` null in DB

### Integration

- `TrainingPlanRepository.addItem` with alternative fields → row has correct columns set
- `findForSession` → `alternativeExercise` hydrated with media
- `addItem` with no alternative → `alternativeExerciseId` is null in DB

### E2E (Playwright)

- Trainer adds plan item with alternative → saves → reopens modal → alternative pre-populated
- Trainee runs session: slot with alternative shows "Do alternative exercise instead" button
- Trainee taps button → alternative name/media/sets/reps displayed, button gone
- Session logs alternative `exerciseId` (verify via session log query or progress view)
- Slot without alternative → no button shown
- Series slot: slot 1 switches, slot 2 unchanged — independent state

---

## 11. Out of Scope

- Multiple alternatives per slot (not in v1).
- Alternative for entire item rather than per-slot (each slot is independent — by design).
- Undo / toggle back after switching (one-way by design).
- Alternative tracking type must match primary (not enforced — trainer responsibility).
