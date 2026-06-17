# Review Overlay Completion Checkmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a checkmark on completed plan item cards in `PlanReviewOverlay` when opened mid-session.

**Architecture:** `PlanSessionRunner` derives a `Set<string>` of completed item IDs from `itemIndex` and passes it as an optional prop to `PlanReviewOverlay`. The overlay renders a white SVG checkmark (absolute top-right) on any card whose ID is in the set. No new components or i18n keys needed.

**Tech Stack:** Next.js 15 App Router · TypeScript 5 · Tailwind CSS 4 · React

## Global Constraints

- Dark theme only — background `#0A0A0A` / `#111111` / `#1A1A1A`
- Orange `#E85D26` reserved for CTAs only — do not use for checkmark
- All user-facing strings via `next-intl` — zero hardcoded UI text (checkmark is visual-only; `aria-label` is acceptable as a static string since it is not displayed text)
- No comments unless WHY is non-obvious
- No backwards-compat shims

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/components/PlanReviewOverlay.tsx` | Add `completedItemIds` prop; render checkmark SVG on completed cards |
| Modify | `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` | Derive `completedItemIds` Set; pass to overlay |

---

### Task 1: Add `completedItemIds` prop and checkmark to `PlanReviewOverlay`

**Files:**
- Modify: `src/components/PlanReviewOverlay.tsx`

**Interfaces:**
- Produces: `PlanReviewOverlay` accepts `completedItemIds?: Set<string>` — consumed by Task 2

- [ ] **Step 1: Replace the full contents of `PlanReviewOverlay.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MediaStrip } from '@/components/MediaStrip'
import type { TrainingPlanWithDetails, TrainingPlanItemExerciseWithDetails } from '@/lib/domain/plan'

interface Props {
  plan: TrainingPlanWithDetails
  onClose: () => void
  completedItemIds?: Set<string>
}

export function PlanReviewOverlay({ plan, onClose, completedItemIds = new Set() }: Props) {
  const t = useTranslations('planReview')
  const totalExercises = plan.items.reduce((sum, item) => sum + item.exercises.length, 0)
  const sortedItems = [...plan.items].sort((a, b) => a.position - b.position)

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0A0A0A] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{plan.name}</h1>
            <p className="text-sm text-[rgba(255,255,255,0.6)]">
              {t('exerciseCount', { count: totalExercises })}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label={t('close')} onClick={onClose}>
            {t('close')}
          </Button>
        </div>

        {sortedItems.map((item) => {
          const exercises = [...item.exercises].sort((a, b) => a.order - b.order)
          const isSeries = exercises.length > 1
          const isDone = completedItemIds.has(item.id)

          return (
            <Card key={item.id} className="relative flex flex-col gap-4">
              {isSeries && <Badge variant="accent">{t('series', { count: exercises.length })}</Badge>}
              {isDone && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute right-3 top-3"
                  aria-label="Completed"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {exercises.map((ex) => (
                <ReviewExerciseRow key={ex.id} item={ex} />
              ))}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ReviewExerciseRow({ item }: { item: TrainingPlanItemExerciseWithDetails }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">{item.exercise.name}</h2>
        <Badge>
          {item.sets} × {item.reps}
        </Badge>
      </div>
      {item.exercise.description && (
        <p className="text-sm text-[rgba(255,255,255,0.6)]">{item.exercise.description}</p>
      )}
      <MediaStrip media={item.exercise.media} />
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanReviewOverlay.tsx
git commit -m "feat(session): add completedItemIds prop and checkmark to PlanReviewOverlay"
```

---

### Task 2: Derive `completedItemIds` in `PlanSessionRunner` and pass to overlay

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

**Interfaces:**
- Consumes: `PlanReviewOverlay` prop `completedItemIds?: Set<string>` — defined in Task 1

- [ ] **Step 1: Add `completedItemIds` derivation after the existing `totalSets` line**

In `PlanSessionRunner`, locate this block (around line 39–43):

```ts
const totalExercises = plan.items.reduce((sum, item) => sum + item.exercises.length, 0)
const totalSets = plan.items.reduce(
  (sum, item) => item.exercises.reduce((s, ex) => s + ex.sets, sum),
  0,
)
```

Add one line immediately after:

```ts
const totalExercises = plan.items.reduce((sum, item) => sum + item.exercises.length, 0)
const totalSets = plan.items.reduce(
  (sum, item) => item.exercises.reduce((s, ex) => s + ex.sets, sum),
  0,
)
const completedItemIds = new Set(
  plan.items.filter((_, idx) => idx < itemIndex).map((item) => item.id),
)
```

- [ ] **Step 2: Pass `completedItemIds` to `PlanReviewOverlay`**

Locate the overlay render at the bottom of the component (around line 364):

```tsx
{reviewOpen && <PlanReviewOverlay plan={plan} onClose={() => setReviewOpen(false)} />}
```

Replace with:

```tsx
{reviewOpen && (
  <PlanReviewOverlay
    plan={plan}
    onClose={() => setReviewOpen(false)}
    completedItemIds={phase === 'running' ? completedItemIds : undefined}
  />
)}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`, navigate to a trainee's session for a multi-item plan.

Verify:
1. **Ready phase:** tap "Review" before starting — overlay opens, no checkmarks on any card.
2. **After completing item 1:** start session, complete all sets for item 1 (session auto-advances to item 2), tap "Review" — first card has white checkmark top-right, second card does not.
3. **Series card:** if item 1 is a series, the checkmark appears on the card as a whole (not per-exercise row).
4. **Single-item plan:** complete the only item — session navigates to finish screen, not back to review; this path needs no special handling.

- [ ] **Step 5: Commit**

```bash
git add src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx
git commit -m "feat(session): pass completedItemIds to PlanReviewOverlay in PlanSessionRunner"
```
