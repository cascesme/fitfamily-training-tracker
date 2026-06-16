# Training Plan Review Overlay — Design Spec

**Date:** 2026-06-16
**Status:** Approved

---

## Problem

`PlanSessionRunner` shows the trainee one exercise (or one biseries pair) at a time. There is no way to see the full plan — every exercise, its sets/reps, and its media — before starting, or to check it again mid-session without losing progress. Trainees have no "first glance" at what a session contains.

---

## Goal

Add a single, low-emphasis "Review plan" button, visible in `PlanSessionRunner` both before the session starts (ready screen) and while it is running, that opens a read-only preview of the entire plan: every exercise in order, its sets × reps, and its media (photo/video/YouTube/PDF), with biseries pairs grouped together.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Presentation | Full-screen overlay rendered inside `PlanSessionRunner`, not a separate route | `sessionId`, `itemIndex`, `setProgress`, `biSeriesSet` are in-memory React state with no DB/URL persistence — navigating away would lose them. An overlay needs no navigation and no extra fetch (reuses the `plan` prop already loaded). |
| Interaction | Read-only — tapping an exercise does nothing beyond display | Avoids any risk of corrupting `setProgress`/`biSeriesSet` state; review is for orientation, not control. |
| Visibility | Same button + same overlay component before and after "Start" | Satisfies "view the plan even once training has started" without a second code path. |
| Visual weight | `Button variant="ghost" size="sm"` | Visible but clearly secondary to the primary "Start"/set-logging actions. |
| Media rendering | Reuse `MediaStrip` (already inline-playable for video/YouTube, direct link for PDF, thumbnail for photo) | No new media-rendering code; no nested `MediaViewer` modal needed for a read-only first glance. |
| Biseries grouping | One `Card` per plan item; both slots rendered together under a "Biseries" badge when `exercises.length === 2` | Matches the existing convention in `PlanBuilder.tsx`. |

---

## Architecture

### New Component: `src/components/PlanReviewOverlay.tsx`

```typescript
interface Props {
  plan: TrainingPlanWithDetails  // src/lib/domain/plan.ts — already the type PlanSessionRunner receives
  onClose: () => void
}
```

- `fixed inset-0 z-[100] overflow-y-auto bg-[#0A0A0A]` — same full-screen overlay convention as `MediaViewer.tsx`.
- Header: plan name, total exercise count (`planReview.exerciseCount`), close button (ghost, top-right).
- Body: `plan.items` sorted by `position`. Per item:
  - `isBiseries = item.exercises.length === 2`
  - Biseries → `Card` with `Badge variant="accent"` (`planReview.biseries`), then slot-1 row, then slot-2 row.
  - Single → `Card` with one row.
  - Each row: exercise name, `Badge` with `{sets} × {reps}` (format matches `PlanBuilder.tsx:100`), optional description, `<MediaStrip media={exercise.media} />`.
- Reused, unmodified: `Card`, `Badge`, `Button` (`src/components/ui/`), `MediaStrip` (`src/components/MediaStrip.tsx`).

### Modified: `PlanSessionRunner.tsx`

`src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

**State addition:**
```typescript
const [reviewOpen, setReviewOpen] = useState(false)
```

**Three trigger call sites**, all `<Button variant="ghost" size="sm" onClick={() => setReviewOpen(true)}>{t('reviewButton')}</Button>`:
1. Ready phase (~line 188) — absolute-positioned top-right, mirroring the existing back-arrow button's top-left placement.
2. Running phase, biseries header row (~lines 260–265) — placed next to the `itemProgress` text.
3. Running phase, single-exercise header row (~lines 290–295) — same placement.

Both running-phase header rows are edited identically rather than extracted into a shared helper, consistent with how the codebase already duplicates this row across the two branches.

**Overlay render** — added once, as a sibling **outside** the `AnimatePresence` phase-conditional block, so it is available identically regardless of `phase` and unaffected by phase-transition animations:
```typescript
{reviewOpen && <PlanReviewOverlay plan={plan} onClose={() => setReviewOpen(false)} />}
```

No change to `sessionId`, `itemIndex`, `setProgress`, `biSeriesSet`, `showRestTimer`, or any handler — opening/closing the overlay is fully orthogonal to session state. A rest timer in progress keeps counting underneath.

---

## i18n Additions (`src/i18n/en.json`)

- `sessionRunner.reviewButton`: `"Review plan"` — shared by all three trigger buttons.
- New `planReview` namespace:
  - `exerciseCount`: `"{count} exercises"`
  - `biseries`: `"Biseries"`
  - `close`: `"Close"`

---

## Tests

### Unit

- `tests/unit/components/PlanReviewOverlay.test.tsx`
  - Renders every exercise across multiple plan items.
  - Groups a biseries pair (slot 1 + slot 2) under one card with the "Biseries" badge.
  - Renders a single-exercise item without the badge.
  - Renders `MediaStrip` for an exercise that has media; renders nothing media-related for one that doesn't.
  - Calls `onClose` when the close button is clicked.

- `tests/unit/components/PlanSessionRunner.test.tsx` (new or extended)
  - Review button is present and clickable in the ready phase.
  - Review button is present and clickable in the running phase (both single and biseries items).
  - Opening then closing the overlay leaves `phase`, `itemIndex`, and `setProgress` unchanged (assert via continued ability to log a set / unchanged progress text).

### Integration / E2E

- No repository or service changes — no integration test changes required.
- If `tests/e2e/trainee.spec.ts` covers the session flow, add one scenario: open review before starting (media visible), start the session, open review again mid-session, close it, confirm the in-progress set/timer state is unaffected.

---

## Out of Scope

- Tapping an exercise in the review to jump the session to it.
- A dedicated route/page for the review (would require persisting session state to survive navigation).
- Full-screen swipeable media viewing inside the review (`MediaStrip`'s inline playback is sufficient for a first glance).
- Pausing the rest timer while the review is open.
