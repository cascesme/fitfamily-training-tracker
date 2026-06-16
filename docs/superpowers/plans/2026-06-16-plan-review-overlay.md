# Training Plan Review Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a low-emphasis "Review plan" button to `PlanSessionRunner` that opens a read-only, full-screen overlay listing every exercise in the plan (sets × reps, media), visible both before and during a session.

**Architecture:** New presentational component `PlanReviewOverlay` renders the already-loaded `plan` prop as a full-screen overlay (same pattern as the existing `MediaViewer`), reusing `Card`/`Badge`/`Button`/`MediaStrip`. `PlanSessionRunner` gains one `reviewOpen` boolean and three trigger buttons (ready screen, running-biseries header, running-single header); the overlay is rendered once, outside the existing `AnimatePresence`, so it never interferes with phase-transition animations or in-memory session state (`sessionId`, `itemIndex`, `setProgress`, `biSeriesSet`).

**Tech Stack:** Next.js 15 / React, TypeScript, Tailwind, next-intl, Jest + React Testing Library (unit), Playwright (E2E). No new dependencies, no schema/service/repository changes.

Spec: `docs/superpowers/specs/2026-06-16-plan-review-overlay-design.md`

---

### Task 1: `PlanReviewOverlay` component (TDD)

**Files:**
- Create: `src/components/PlanReviewOverlay.tsx`
- Test: `tests/unit/components/PlanReviewOverlay.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/PlanReviewOverlay.test.tsx`:

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { PlanReviewOverlay } from '@/components/PlanReviewOverlay'
import type { TrainingPlanWithDetails } from '@/lib/domain/plan'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

function buildPlan(): TrainingPlanWithDetails {
  return {
    id: 'plan1',
    name: 'Push Day',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item1',
        planId: 'plan1',
        position: 1,
        exercises: [
          {
            id: 'tpe1',
            itemId: 'item1',
            exerciseId: 'e1',
            sets: 3,
            reps: 10,
            slot: 1,
            exercise: {
              id: 'e1',
              name: 'Bench Press',
              description: 'Chest exercise',
              trackingType: 'WEIGHT',
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [
                {
                  id: 'm1',
                  exerciseId: 'e1',
                  type: 'PHOTO',
                  filePath: 'bench/1.jpg',
                  url: null,
                  originalFilename: null,
                  position: 1,
                  createdAt: new Date(),
                },
              ],
            },
          },
        ],
      },
      {
        id: 'item2',
        planId: 'plan1',
        position: 2,
        exercises: [
          {
            id: 'tpe2',
            itemId: 'item2',
            exerciseId: 'e2',
            sets: 4,
            reps: 8,
            slot: 1,
            exercise: {
              id: 'e2',
              name: 'Incline Press',
              description: null,
              trackingType: 'WEIGHT',
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [],
            },
          },
          {
            id: 'tpe3',
            itemId: 'item2',
            exerciseId: 'e3',
            sets: 4,
            reps: 8,
            slot: 2,
            exercise: {
              id: 'e3',
              name: 'Cable Fly',
              description: null,
              trackingType: 'WEIGHT',
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [],
            },
          },
        ],
      },
    ],
  }
}

describe('PlanReviewOverlay', () => {
  it('renders every exercise across all plan items', () => {
    render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Incline Press')).toBeInTheDocument()
    expect(screen.getByText('Cable Fly')).toBeInTheDocument()
  })

  it('shows sets x reps for each exercise', () => {
    render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(screen.getByText('3 × 10')).toBeInTheDocument()
    expect(screen.getAllByText('4 × 8')).toHaveLength(2)
  })

  it('groups a biseries pair under one Biseries badge', () => {
    render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(screen.getByText('biseries')).toBeInTheDocument()
  })

  it('does not show a Biseries badge for a single-exercise item', () => {
    const plan = buildPlan()
    plan.items = [plan.items[0]]
    render(<PlanReviewOverlay plan={plan} onClose={jest.fn()} />)
    expect(screen.queryByText('biseries')).not.toBeInTheDocument()
  })

  it('renders media for an exercise that has it', () => {
    const { container } = render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<PlanReviewOverlay plan={buildPlan()} onClose={onClose} />)
    screen.getByRole('button', { name: 'close' }).click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/PlanReviewOverlay.test.tsx`
Expected: FAIL — `Cannot find module '@/components/PlanReviewOverlay'`

- [ ] **Step 3: Write the implementation**

Create `src/components/PlanReviewOverlay.tsx`:

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
}

export function PlanReviewOverlay({ plan, onClose }: Props) {
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
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('close')}
          </Button>
        </div>

        {sortedItems.map((item) => {
          const isBiseries = item.exercises.length === 2
          const slot1 = item.exercises.find((e) => e.slot === 1)
          const slot2 = isBiseries ? item.exercises.find((e) => e.slot === 2) : undefined

          return (
            <Card key={item.id} className="flex flex-col gap-4">
              {isBiseries && <Badge variant="accent">{t('biseries')}</Badge>}
              {slot1 && <ReviewExerciseRow item={slot1} />}
              {slot2 && <ReviewExerciseRow item={slot2} />}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/PlanReviewOverlay.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/PlanReviewOverlay.tsx tests/unit/components/PlanReviewOverlay.test.tsx
git commit -m "feat(trainee): add PlanReviewOverlay component"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `src/i18n/en.json:281-286`

- [ ] **Step 1: Add `reviewButton` to `sessionRunner` and a new `planReview` namespace**

Current (`src/i18n/en.json:281-286`):

```json
  "sessionRunner": {
    "itemProgress": "{current} of {total}",
    "allSetsDone": "Done",
    "logError": "Failed to log set. Please try again.",
    "viewMedia": "View Media"
  },
```

Replace with:

```json
  "sessionRunner": {
    "itemProgress": "{current} of {total}",
    "allSetsDone": "Done",
    "logError": "Failed to log set. Please try again.",
    "viewMedia": "View Media",
    "reviewButton": "Review plan"
  },
  "planReview": {
    "exerciseCount": "{count} exercises",
    "biseries": "Biseries",
    "close": "Close"
  },
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/en.json'))"`
Expected: no output, exit code 0

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat(i18n): add plan review overlay translation keys"
```

---

### Task 3: Wire the button and overlay into `PlanSessionRunner`

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

No new unit test here: `PlanSessionRunner` has no existing unit-test scaffold (it would require mocking `next/navigation`, `fetch`, and audio playback — disproportionate for wiring a `useState` toggle and three buttons). Coverage comes from manual verification below and the E2E scenario in Task 4.

- [ ] **Step 1: Import `PlanReviewOverlay`**

Current (`PlanSessionRunner.tsx:8`):

```tsx
import { MediaViewer } from '@/components/MediaViewer'
```

Replace with:

```tsx
import { MediaViewer } from '@/components/MediaViewer'
import { PlanReviewOverlay } from '@/components/PlanReviewOverlay'
```

- [ ] **Step 2: Add `reviewOpen` state**

Current (`PlanSessionRunner.tsx:33`):

```tsx
  const [showRestTimer, setShowRestTimer] = useState(false)
```

Replace with:

```tsx
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
```

- [ ] **Step 3: Add the trigger button to the ready screen**

Current (`PlanSessionRunner.tsx:188-207`):

```tsx
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 top-4 text-[rgba(255,255,255,0.6)] hover:text-white"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
```

Replace with:

```tsx
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 top-4 text-[rgba(255,255,255,0.6)] hover:text-white"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setReviewOpen(true)}
            className="absolute right-4 top-4"
          >
            {t('reviewButton')}
          </Button>
```

- [ ] **Step 4: Add the trigger button to both running-phase headers**

Current (`PlanSessionRunner.tsx:260-265` and, identically, `:290-295`) — this exact block appears twice:

```tsx
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                    <span className="text-sm text-[rgba(255,255,255,0.4)]">
                      {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
                    </span>
                  </div>
```

Replace **both occurrences** with:

```tsx
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewOpen(true)}
                      >
                        {t('reviewButton')}
                      </Button>
                      <span className="text-sm text-[rgba(255,255,255,0.4)]">
                        {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
                      </span>
                    </div>
                  </div>
```

(Use a find-and-replace-all — both occurrences are character-for-character identical, and both need the identical fix.)

- [ ] **Step 5: Render the overlay outside `AnimatePresence`**

`reviewOpen` must NOT be a child of `<AnimatePresence mode="wait">` — that component assumes exactly one child is mounted at a time, and the review overlay can be open simultaneously with either phase. Split the existing single return into a `sessionContent` variable plus a `Fragment` wrapper.

Current (`PlanSessionRunner.tsx:177-178`):

```tsx
  return (
    <AnimatePresence mode="wait">
```

Replace with:

```tsx
  const sessionContent = (
    <AnimatePresence mode="wait">
```

Current (end of file, `PlanSessionRunner.tsx:344-346`):

```tsx
    </AnimatePresence>
  )
}
```

Replace with:

```tsx
    </AnimatePresence>
  )

  return (
    <>
      {sessionContent}
      {reviewOpen && <PlanReviewOverlay plan={plan} onClose={() => setReviewOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass with no errors

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```

In the browser:
1. Open a trainee, open a plan that has a biseries item and an exercise with media (photo/video/YouTube/PDF).
2. On the ready screen, confirm "Review plan" is visible top-right, subtler than the "LET'S GO" button.
3. Click it — confirm every exercise shows, biseries pair grouped under one "Biseries" card, media plays/displays inline. Click "Close" — confirm you're back on the unchanged ready screen.
4. Click "LET'S GO", log a set, then click "Review plan" again mid-session. Close it. Confirm set-logging progress (set number, exercise) is exactly where you left it.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx"
git commit -m "feat(trainee): wire plan review overlay into session runner"
```

---

### Task 4: E2E coverage

**Files:**
- Modify: `tests/e2e/trainee.spec.ts`

- [ ] **Step 1: Add the review scenario**

Append inside the existing `test.describe('Trainee — Full plan session', ...)` block in `tests/e2e/trainee.spec.ts`, after the `'runs biseries plan...'` test and before the closing `})`:

```ts
  test('opens plan review before and during a session without losing progress', async ({ page }) => {
    await seedTrainee({ name: 'Review User' })
    const exercise = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 1 })
    await seedPlan({
      name: 'Push Day',
      items: [{ exerciseId: exercise.id, sets: 2, reps: 8 }],
    })

    await page.goto('/')
    await page.click('text=Review User')
    await page.click('text=Push Day')

    // Review accessible before starting — shows exercise and its media
    await page.click('text=Review plan')
    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('img').first()).toBeVisible()
    await page.click('text=Close')

    // Start session, log the first set
    await page.click("text=LET'S GO")
    await page.fill('[name=weightKg]', '60')
    await page.fill('[name=repsDone]', '8')
    await page.click('text=Mark Done')
    await expect(page.locator('text=Set 2 of 2')).toBeVisible()

    // Review mid-session does not disturb in-progress state
    await page.click('text=Review plan')
    await expect(page.locator('text=Bench Press')).toBeVisible()
    await page.click('text=Close')
    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
  })
```

- [ ] **Step 2: Run the E2E suite**

Run: `npx playwright test tests/e2e/trainee.spec.ts`
Expected: all 4 tests in the file PASS (the 3 pre-existing + the new one)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/trainee.spec.ts
git commit -m "test(e2e): cover plan review overlay before and during a session"
```

---

## Self-Review Notes

- **Spec coverage:** overlay-not-route (Task 3 Step 5), read-only display with media+config (Task 1), biseries grouping (Task 1 tests), ghost/sm low-emphasis button in both phases (Task 3 Steps 3–4), i18n keys (Task 2), rest-timer-unaffected behavior (Task 3 Step 5 — overlay sits outside `AnimatePresence`, no interaction with `showRestTimer`) — all covered.
- **Out of scope confirmed:** no tap-to-jump, no dedicated route, no nested `MediaViewer` — none implemented above.
- **Type consistency:** `PlanReviewOverlay` props (`plan: TrainingPlanWithDetails`, `onClose: () => void`) match the call site in Task 3 Step 5 exactly. `TrainingPlanItemExerciseWithDetails` is the real exported type from `src/lib/domain/plan.ts:14-16`, not invented.
