# Session Navigation: Back/Forth Between Exercises — Design Spec

**Date:** 2026-06-16
**Status:** Approved

---

## Problem

Trainee session runners (`PlanSessionRunner.tsx`, `ExerciseSessionRunner.tsx`) only move forward. Once an exercise/set is marked done there is no way to look back at it, and there is no way to preview what's coming next. The trainee is stuck looking only at "the current thing."

This is distinct from the [Plan Review Overlay](2026-06-16-plan-review-overlay-design.md) (not yet implemented): that feature is a read-only, structural "glance at the whole plan" (names, targets, media) with no relationship to logged data or session progress. This feature is in-session, stateful navigation — stepping between exercises/sets that are actually `completed` (showing exactly what was logged), `current` (the one the trainee must finish to proceed), or `locked` (future, preview-only, no logging).

---

## Goal

Let a trainee move backward to see completed exercises/sets — with their media and exactly what was logged — and forward to preview upcoming exercises/sets, without ever being able to log data out of order. The active exercise/set still gates forward progress exactly as it does today.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Scope | Both `PlanSessionRunner` (between plan items) and `ExerciseSessionRunner` (between sets of one exercise) | User explicitly wants both; the same shape of problem exists at two granularities. |
| Active vs. viewed position | Two separate indices: existing "active" pointer (unchanged semantics) + new `viewIndex` | Keeps "must finish current to advance" logic untouched; navigation is purely a view concern. |
| Nav control | Prev/Next chevrons only, next to the existing "X of N" label | Simpler than a dot stepper; consistent with the existing arrow style in `MediaViewer.tsx`. |
| Locked item media | Visible | Satisfies "see what's coming next" literally — full preview, just no input/logging. |
| Recap data source | Client-side echo of the payload already POSTed when marking a set done | No schema change, no extra fetch; matches the app's existing no-reload-resilience posture. |
| Rest timer + navigation | Navigating away from the active item while `RestTimerScreen` is showing unmounts it; returning re-shows a fresh timer if the round isn't done | Rest timer state isn't persisted anywhere today; not worth solving for this edge case. |

---

## Architecture

### State model

`viewIndex` state in both runners, separate from the existing active pointer (`itemIndex` in `PlanSessionRunner`, `currentSet` in `ExerciseSessionRunner`):

- Defaults to the active index.
- Prev/Next chevrons move `viewIndex` only, clamped to `[0, maxIndex]`.
- Whenever the active index auto-advances (existing behavior, unchanged), `viewIndex` follows it — default forward flow is visually identical to today.
- Status derived from the two indices:
  - `completed` — `viewIndex < activeIndex`
  - `current` — `viewIndex === activeIndex`
  - `locked` — `viewIndex > activeIndex`

### New hook: `src/lib/hooks/useSessionStepper.ts`

```typescript
function useSessionStepper(activeIndex: number, maxIndex: number): {
  viewIndex: number
  goPrev: () => void
  goNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  status: 'completed' | 'current' | 'locked'  // status of viewIndex relative to activeIndex
}
```

Encapsulates clamping, the "follow active index forward" effect, and status derivation so both runners share one implementation instead of duplicating it.

### Logged-set recap data

New state in both runners: `loggedSets: Record<string, LoggedSet[]>` keyed by `exerciseId`.

```typescript
interface LoggedSet {
  setNumber: number
  weightKg?: number
  repsDone?: number
  durationSecs?: number
}
```

Populated inside the existing `handleMarkDone` (both runners) and `handleBiSeriesSetDone` (`PlanSessionRunner`) — append the same payload already sent to `/api/sessions/{id}/logs`. Purely additive; no new network calls, no DB schema change.

### New components (`src/components/`)

**`CompletedItemSummary`**
```typescript
interface Props {
  exercises: Array<{ id: string; exercise: { name: string; media: ExerciseMedia[]; trackingType: TrackingType }; sets: number }>
  loggedSets: Record<string, LoggedSet[]>
}
```
- Exercise name(s) + "View Media" button (reuses `MediaViewer`).
- List of logged sets per exercise: weight×reps (WEIGHT), duration (TIME), or just a checkmark (NONE).
- Handles both a single exercise and a biseries pair (2 exercises, same `setNumber` per round) — biseries rounds rendered together, matching the visual grouping convention from the biseries refactor (orange left-border accent).

**`LockedItemPreview`**
```typescript
interface Props {
  exercises: Array<{ id: string; exercise: { name: string; description: string | null; media: ExerciseMedia[] }; sets: number; reps: number }>
}
```
- Exercise name(s), target sets × reps, "View Media" button.
- Locked hint text (e.g. "Finish current exercise to unlock").
- No input fields, no Mark Done button — this component never calls any logging handler.

**`StepperNav`**
```typescript
interface Props {
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}
```
- Two chevron buttons, visually consistent with `MediaViewer.tsx`'s prev/next arrows. Disabled (not hidden) at boundaries.

### `PlanSessionRunner.tsx` changes

- `useSessionStepper(itemIndex, plan.items.length - 1)` replaces direct `itemIndex` reads in the render branch.
- Header row (both biseries and single-exercise variants) gains `<StepperNav>` next to the `itemProgress` label.
- Render switches on `status` of `plan.items[viewIndex]`:
  - `current` → existing `SetLogger` / `BiSeriesSetLogger` / `RestTimerScreen` logic, unchanged, still keyed off `currentItem` (`itemIndex`).
  - `completed` → `<CompletedItemSummary exercises={viewedItem.exercises} loggedSets={loggedSets} />`
  - `locked` → `<LockedItemPreview exercises={viewedItem.exercises} />`
- `handleMarkDone` / `handleBiSeriesSetDone` additionally append to `loggedSets`.

### `ExerciseSessionRunner.tsx` changes

Same pattern, one level down:
- `useSessionStepper(currentSet, targetSets - 1)`.
- Header gains `<StepperNav>` next to the "Set X of N" label.
- `current` → existing `SetLogger`. `completed` → `CompletedItemSummary` (single-exercise variant, one set). `locked` → `LockedItemPreview` (same exercise/target, just locked).
- `handleMarkDone` appends to `loggedSets`.

---

## i18n Additions (`src/i18n/en.json`)

Under `sessionRunner` and `singleSession`:
- `navPrev` / `navNext` — aria-labels for `StepperNav` buttons.
- `lockedHint` — "Finish current exercise to unlock."
- `completedLabel` — "Completed" badge text.
- `loggedSetWeight` — `"{weight} kg × {reps}"` format for recap rows.
- `loggedSetDuration` — `"{seconds}s"` format for recap rows.

---

## Known Limitation (accepted, not solved here)

If a trainee types values into the active item's input fields but navigates away before pressing "Mark Done," that draft is lost — the logger component unmounts when `viewIndex` no longer points at the active index. This matches the app's existing lack of in-progress-state persistence (a page reload already loses all session UI state) and is out of scope here.

---

## Tests

### Unit

- `tests/unit/hooks/useSessionStepper.test.ts` — clamping at both ends, `viewIndex` follows `activeIndex` forward on advance, correct `status` derivation for all three cases.
- `tests/unit/components/CompletedItemSummary.test.tsx` — renders single-exercise and biseries shapes; renders correct recap format per `trackingType`.
- `tests/unit/components/LockedItemPreview.test.tsx` — renders name/target/media; asserts no button with the "Mark Done" role/text exists.
- `tests/unit/components/StepperNav.test.tsx` — disabled state at boundaries; fires `onPrev`/`onNext`.

### E2E (`tests/e2e/trainee.spec.ts` additions)

- Plan session: log exercise 1 → nav back → recap shows the exact values typed → nav forward past current into a locked exercise → no Mark Done button/inputs present → nav back to current → finish the plan normally.
- Single-exercise session: log set 1 → nav back → recap shows logged values → nav forward to a locked set → no inputs present → nav back to current → finish normally.

---

## Out of Scope

- Persisting `viewIndex`/`loggedSets`/draft input across page reload or navigation away from the session route.
- Editing/re-logging a completed set from the back-navigation view.
- Persisting the rest-timer countdown across a navigate-away-and-back during a biseries round.
- Jumping directly to an arbitrary locked item beyond simple Prev/Next stepping (no dot stepper).
