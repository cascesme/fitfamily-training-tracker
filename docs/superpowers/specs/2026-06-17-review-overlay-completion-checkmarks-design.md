# Review Overlay Completion Checkmarks

**Date:** 2026-06-17
**Branch:** feat/session-navigation

## Problem

`PlanReviewOverlay` has no awareness of session progress. When opened mid-session, it shows all plan items identically — completed items look the same as upcoming ones.

## Goal

When the overlay is opened during a running session, plan item cards that have been fully completed show a checkmark. Items not yet reached show no indicator.

## Scope

Two file changes:

- `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`
- `src/components/PlanReviewOverlay.tsx`

No new components, no new i18n keys.

## Data Flow

`PlanSessionRunner` derives completion state before rendering the overlay:

```ts
const completedItemIds = new Set(
  plan.items
    .filter((_, idx) => idx < itemIndex)
    .map((item) => item.id)
)
```

This set is only non-empty when `phase === 'running'`. When `phase === 'ready'`, no items have been completed, so the set is empty.

The set is passed to `PlanReviewOverlay` as an optional prop:

```ts
<PlanReviewOverlay
  plan={plan}
  onClose={() => setReviewOpen(false)}
  completedItemIds={phase === 'running' ? completedItemIds : undefined}
/>
```

## PlanReviewOverlay Changes

New optional prop added to the component interface:

```ts
interface Props {
  plan: TrainingPlanWithDetails
  onClose: () => void
  completedItemIds?: Set<string>
}
```

Defaults to an empty set when absent (pre-session use case, no regression).

Each `Card` gains `relative` positioning. When `completedItemIds.has(item.id)` is true, a checkmark SVG is rendered `absolute top-3 right-3` inside the card:

- White SVG checkmark, 20×20, `rgba(255,255,255,0.8)` stroke
- `aria-label` provided for accessibility
- Positioned to the right of the series badge (badge is top-left, checkmark is top-right)

## Completion Semantics

An item is "completed" when `itemIndex` has advanced past it. This is already guaranteed by `PlanSessionRunner` — `itemIndex` only increments once all exercises in the current item have logged all their sets. No additional completion logic is needed in the overlay.

## Visual Treatment

- Checkmark color: `rgba(255,255,255,0.8)` — white, slightly muted
- Orange (`#E85D26`) is reserved for CTAs only — not used here
- No background, border, or badge wrapping the checkmark — keep it minimal

## Testing

- Unit: no business logic to test (pure prop passthrough)
- Manual: open overlay from ready phase → no checkmarks; start session, complete first item, open overlay → first item shows checkmark, rest do not
