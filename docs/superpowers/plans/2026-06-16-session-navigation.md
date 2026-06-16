# Session Navigation: Back/Forth Between Exercises — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a trainee navigate backward to completed exercises/sets (seeing media + exactly what was logged) and forward to preview locked ones, in both `PlanSessionRunner` and `ExerciseSessionRunner`, without ever allowing out-of-order logging.

**Architecture:** A new `viewIndex` (managed by a shared `useSessionStepper` hook) is tracked alongside each runner's existing "active" pointer (`itemIndex` / `currentSet`). The active pointer keeps its current behavior untouched — it's what gates "finish current to advance." Three new presentation components (`StepperNav`, `CompletedItemSummary`, `LockedItemPreview`) render whatever `viewIndex` points at; the existing interactive logging UI renders only when `viewIndex === activeIndex`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, next-intl, Jest 30 + ts-jest + @testing-library/react 16, Playwright.

Spec: [docs/superpowers/specs/2026-06-16-session-navigation-design.md](../specs/2026-06-16-session-navigation-design.md)

---

### Task 1: `useSessionStepper` hook

**Files:**
- Create: `src/lib/hooks/useSessionStepper.ts`
- Test: `tests/unit/hooks/useSessionStepper.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook, act } from '@testing-library/react'
import { useSessionStepper } from '@/lib/hooks/useSessionStepper'

describe('useSessionStepper', () => {
  it('defaults viewIndex to activeIndex with status current', () => {
    const { result } = renderHook(() => useSessionStepper(2, 5))
    expect(result.current.viewIndex).toBe(2)
    expect(result.current.status).toBe('current')
  })

  it('goPrev decrements viewIndex and reports completed status', () => {
    const { result } = renderHook(() => useSessionStepper(2, 5))
    act(() => result.current.goPrev())
    expect(result.current.viewIndex).toBe(1)
    expect(result.current.status).toBe('completed')
  })

  it('goPrev clamps at 0', () => {
    const { result } = renderHook(() => useSessionStepper(0, 5))
    act(() => result.current.goPrev())
    expect(result.current.viewIndex).toBe(0)
    expect(result.current.canGoPrev).toBe(false)
  })

  it('goNext increments viewIndex and reports locked status', () => {
    const { result } = renderHook(() => useSessionStepper(0, 5))
    act(() => result.current.goNext())
    expect(result.current.viewIndex).toBe(1)
    expect(result.current.status).toBe('locked')
  })

  it('goNext clamps at maxIndex', () => {
    const { result } = renderHook(() => useSessionStepper(5, 5))
    act(() => result.current.goNext())
    expect(result.current.viewIndex).toBe(5)
    expect(result.current.canGoNext).toBe(false)
  })

  it('viewIndex follows activeIndex forward when activeIndex advances', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSessionStepper(active, 5),
      { initialProps: { active: 0 } },
    )
    rerender({ active: 1 })
    expect(result.current.viewIndex).toBe(1)
    expect(result.current.status).toBe('current')
  })

  it('does not move viewIndex backward when activeIndex stays the same across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSessionStepper(active, 5),
      { initialProps: { active: 2 } },
    )
    act(() => result.current.goPrev())
    rerender({ active: 2 })
    expect(result.current.viewIndex).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --selectProjects unit-components -- tests/unit/hooks/useSessionStepper.test.tsx`
Expected: FAIL with `Cannot find module '@/lib/hooks/useSessionStepper'`

- [ ] **Step 3: Write minimal implementation**

```ts
'use client'
import { useEffect, useRef, useState } from 'react'

export type StepperStatus = 'completed' | 'current' | 'locked'

interface UseSessionStepperResult {
  viewIndex: number
  goPrev: () => void
  goNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  status: StepperStatus
}

export function useSessionStepper(activeIndex: number, maxIndex: number): UseSessionStepperResult {
  const [viewIndex, setViewIndex] = useState(activeIndex)
  const prevActiveIndex = useRef(activeIndex)

  useEffect(() => {
    if (activeIndex > prevActiveIndex.current) {
      setViewIndex(activeIndex)
    }
    prevActiveIndex.current = activeIndex
  }, [activeIndex])

  const goPrev = () => setViewIndex((i) => Math.max(0, i - 1))
  const goNext = () => setViewIndex((i) => Math.min(maxIndex, i + 1))

  const status: StepperStatus =
    viewIndex < activeIndex ? 'completed' : viewIndex > activeIndex ? 'locked' : 'current'

  return {
    viewIndex,
    goPrev,
    goNext,
    canGoPrev: viewIndex > 0,
    canGoNext: viewIndex < maxIndex,
    status,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --selectProjects unit-components -- tests/unit/hooks/useSessionStepper.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useSessionStepper.ts tests/unit/hooks/useSessionStepper.test.tsx
git commit -m "feat(session): add useSessionStepper hook for view/active index navigation"
```

---

### Task 2: `StepperNav` component

**Files:**
- Create: `src/components/StepperNav.tsx`
- Test: `tests/unit/components/StepperNav.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepperNav } from '@/components/StepperNav'

describe('StepperNav', () => {
  it('fires onPrev and onNext when clicked', () => {
    const onPrev = jest.fn()
    const onNext = jest.fn()
    render(
      <StepperNav
        canGoPrev
        canGoNext
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Previous exercise"
        nextLabel="Next exercise"
      />,
    )
    fireEvent.click(screen.getByLabelText('Previous exercise'))
    fireEvent.click(screen.getByLabelText('Next exercise'))
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('disables prev button when canGoPrev is false', () => {
    render(
      <StepperNav
        canGoPrev={false}
        canGoNext
        onPrev={jest.fn()}
        onNext={jest.fn()}
        prevLabel="Previous exercise"
        nextLabel="Next exercise"
      />,
    )
    expect(screen.getByLabelText('Previous exercise')).toBeDisabled()
    expect(screen.getByLabelText('Next exercise')).not.toBeDisabled()
  })

  it('disables next button when canGoNext is false', () => {
    render(
      <StepperNav
        canGoPrev
        canGoNext={false}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        prevLabel="Previous exercise"
        nextLabel="Next exercise"
      />,
    )
    expect(screen.getByLabelText('Next exercise')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/StepperNav.test.tsx`
Expected: FAIL with `Cannot find module '@/components/StepperNav'`

- [ ] **Step 3: Write minimal implementation**

```tsx
'use client'

interface StepperNavProps {
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
  prevLabel: string
  nextLabel: string
}

export function StepperNav({ canGoPrev, canGoNext, onPrev, onNext, prevLabel, nextLabel }: StepperNavProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label={prevLabel}
        className="rounded-full p-1 text-[rgba(255,255,255,0.6)] hover:text-white disabled:opacity-30 disabled:hover:text-[rgba(255,255,255,0.6)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={nextLabel}
        className="rounded-full p-1 text-[rgba(255,255,255,0.6)] hover:text-white disabled:opacity-30 disabled:hover:text-[rgba(255,255,255,0.6)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/StepperNav.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/StepperNav.tsx tests/unit/components/StepperNav.test.tsx
git commit -m "feat(session): add StepperNav prev/next control"
```

---

### Task 3: `CompletedItemSummary` component

**Files:**
- Create: `src/components/CompletedItemSummary.tsx`
- Test: `tests/unit/components/CompletedItemSummary.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompletedItemSummary } from '@/components/CompletedItemSummary'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), key)
  },
}))

describe('CompletedItemSummary', () => {
  it('renders exercise name and one row per logged set for a WEIGHT exercise', () => {
    render(
      <CompletedItemSummary
        exercises={[
          {
            id: 'ex1',
            name: 'Bench Press',
            trackingType: 'WEIGHT',
            media: [],
            loggedSets: [
              { setNumber: 1, weightKg: 80, repsDone: 10 },
              { setNumber: 2, weightKg: 82.5, repsDone: 8 },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText(/loggedSetLabel/)).toBeInTheDocument()
    expect(screen.getByText(/80 kg × 10 reps|loggedSetWeight/)).toBeInTheDocument()
  })

  it('renders both exercises for a biseries pair', () => {
    render(
      <CompletedItemSummary
        exercises={[
          { id: 'a1', name: 'Bench Press', trackingType: 'WEIGHT', media: [], loggedSets: [{ setNumber: 1, weightKg: 80, repsDone: 10 }] },
          { id: 'b1', name: 'Barbell Row', trackingType: 'WEIGHT', media: [], loggedSets: [{ setNumber: 1, weightKg: 60, repsDone: 10 }] },
        ]}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('renders a media button and opens the viewer when media exists', () => {
    render(
      <CompletedItemSummary
        exercises={[
          {
            id: 'ex1',
            name: 'Bench Press',
            trackingType: 'WEIGHT',
            media: [{ id: 'm1', type: 'PHOTO', filePath: 'a.jpg', url: null, originalFilename: null, position: 1, exerciseId: 'ex1', createdAt: new Date() } as never],
            loggedSets: [{ setNumber: 1, weightKg: 80, repsDone: 10 }],
          },
        ]}
      />,
    )
    fireEvent.click(screen.getByText(/viewMedia/))
    expect(screen.getByText(/mediaCount/)).toBeInTheDocument()
  })

  it('does not render a media button when there is no media', () => {
    render(
      <CompletedItemSummary
        exercises={[{ id: 'ex1', name: 'Pull-up', trackingType: 'NONE', media: [], loggedSets: [{ setNumber: 1, repsDone: 12 }] }]}
      />,
    )
    expect(screen.queryByText(/viewMedia/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/CompletedItemSummary.test.tsx`
Expected: FAIL with `Cannot find module '@/components/CompletedItemSummary'`

- [ ] **Step 3: Write minimal implementation**

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import type { ExerciseMedia } from '@prisma/client'

export interface LoggedSet {
  setNumber: number
  weightKg?: number | null
  repsDone?: number | null
  durationSecs?: number | null
}

export interface CompletedExerciseEntry {
  id: string
  name: string
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
  media: ExerciseMedia[]
  loggedSets: LoggedSet[]
}

interface CompletedItemSummaryProps {
  exercises: CompletedExerciseEntry[]
}

export function CompletedItemSummary({ exercises }: CompletedItemSummaryProps) {
  const t = useTranslations('sessionRunner')
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)

  function formatLoggedSet(set: LoggedSet, trackingType: CompletedExerciseEntry['trackingType']): string {
    if (trackingType === 'TIME') return t('loggedSetDuration', { seconds: set.durationSecs ?? 0 })
    if (trackingType === 'WEIGHT') return t('loggedSetWeight', { weight: set.weightKg ?? 0, reps: set.repsDone ?? 0 })
    return t('loggedSetReps', { reps: set.repsDone ?? 0 })
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="inline-flex w-fit items-center gap-1 rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs font-bold uppercase text-[rgba(255,255,255,0.6)]">
        {t('completedLabel')}
      </span>
      {exercises.map((ex) => (
        <div key={ex.id} className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
          <h2 className="font-display text-lg font-bold">{ex.name}</h2>
          {ex.media.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 hover:border-[#E85D26]"
              onClick={() => setViewerOpenFor(ex.id)}
            >
              {t('viewMedia')} ({ex.media.length})
            </Button>
          )}
          <ul className="mt-3 flex flex-col gap-1">
            {ex.loggedSets.map((set) => (
              <li key={set.setNumber} className="text-sm text-[rgba(255,255,255,0.6)]">
                {t('loggedSetLabel', { number: set.setNumber })}: {formatLoggedSet(set, ex.trackingType)}
              </li>
            ))}
          </ul>
          {viewerOpenFor === ex.id && (
            <MediaViewer media={ex.media} onClose={() => setViewerOpenFor(null)} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Add the new i18n keys this component needs (test mocks `useTranslations` so the app keys aren't required to pass the test, but they're needed before this renders in the app)**

Open `src/i18n/en.json`, find the `"sessionRunner"` block (currently `itemProgress`, `allSetsDone`, `logError`, `viewMedia`) and replace it with:

```json
  "sessionRunner": {
    "itemProgress": "{current} of {total}",
    "allSetsDone": "Done",
    "logError": "Failed to log set. Please try again.",
    "viewMedia": "View Media",
    "navPrev": "Previous exercise",
    "navNext": "Next exercise",
    "completedLabel": "Completed",
    "lockedLabel": "Locked",
    "lockedHint": "Finish the current exercise to unlock",
    "loggedSetLabel": "Set {number}",
    "loggedSetWeight": "{weight} kg × {reps} reps",
    "loggedSetDuration": "{seconds}s",
    "loggedSetReps": "{reps} reps"
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/CompletedItemSummary.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/CompletedItemSummary.tsx tests/unit/components/CompletedItemSummary.test.tsx src/i18n/en.json
git commit -m "feat(session): add CompletedItemSummary recap component"
```

---

### Task 4: `LockedItemPreview` component

**Files:**
- Create: `src/components/LockedItemPreview.tsx`
- Test: `tests/unit/components/LockedItemPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LockedItemPreview } from '@/components/LockedItemPreview'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), key)
  },
}))

describe('LockedItemPreview', () => {
  it('renders exercise name, target, and locked hint, with no Mark Done button', () => {
    render(
      <LockedItemPreview
        exercises={[
          { id: 'ex1', name: 'Squat', description: 'Back squat', media: [], targetReps: 8, trackingType: 'WEIGHT' },
        ]}
      />,
    )
    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText('Back squat')).toBeInTheDocument()
    expect(screen.getByText(/lockedHint/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /markDone|markSetDone/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('renders both exercises for a locked biseries pair', () => {
    render(
      <LockedItemPreview
        exercises={[
          { id: 'a1', name: 'Bench Press', media: [], targetReps: 10, trackingType: 'WEIGHT' },
          { id: 'b1', name: 'Barbell Row', media: [], targetReps: 10, trackingType: 'WEIGHT' },
        ]}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('opens the media viewer when the media button is clicked', () => {
    render(
      <LockedItemPreview
        exercises={[
          {
            id: 'ex1',
            name: 'Squat',
            media: [{ id: 'm1', type: 'PHOTO', filePath: 'a.jpg', url: null, originalFilename: null, position: 1, exerciseId: 'ex1', createdAt: new Date() } as never],
            targetReps: 8,
            trackingType: 'WEIGHT',
          },
        ]}
      />,
    )
    fireEvent.click(screen.getByText(/viewMedia/))
    expect(screen.getByText(/mediaCount/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/LockedItemPreview.test.tsx`
Expected: FAIL with `Cannot find module '@/components/LockedItemPreview'`

- [ ] **Step 3: Write minimal implementation**

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import type { ExerciseMedia } from '@prisma/client'

export interface LockedExerciseEntry {
  id: string
  name: string
  description?: string | null
  media: ExerciseMedia[]
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
}

interface LockedItemPreviewProps {
  exercises: LockedExerciseEntry[]
}

export function LockedItemPreview({ exercises }: LockedItemPreviewProps) {
  const t = useTranslations('sessionRunner')
  const tSession = useTranslations('session')
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4 opacity-60">
      <span className="inline-flex w-fit items-center gap-1 rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs font-bold uppercase text-[rgba(255,255,255,0.6)]">
        {t('lockedLabel')}
      </span>
      {exercises.map((ex) => (
        <div key={ex.id} className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
          <h2 className="font-display text-lg font-bold">{ex.name}</h2>
          {ex.description && <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{ex.description}</p>}
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">
            {ex.trackingType === 'TIME'
              ? tSession('targetDuration', { secs: ex.targetReps })
              : tSession('targetReps', { reps: ex.targetReps })}
          </p>
          {ex.media.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 hover:border-[#E85D26]"
              onClick={() => setViewerOpenFor(ex.id)}
            >
              {t('viewMedia')} ({ex.media.length})
            </Button>
          )}
          {viewerOpenFor === ex.id && (
            <MediaViewer media={ex.media} onClose={() => setViewerOpenFor(null)} />
          )}
        </div>
      ))}
      <p className="text-center text-sm italic text-[rgba(255,255,255,0.4)]">{t('lockedHint')}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --selectProjects unit-components -- tests/unit/components/LockedItemPreview.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/LockedItemPreview.tsx tests/unit/components/LockedItemPreview.test.tsx
git commit -m "feat(session): add LockedItemPreview component"
```

---

### Task 5: Add `singleSession` nav i18n keys

**Files:**
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add `navPrev`/`navNext` to the `singleSession` namespace**

Find the `"singleSession"` block (currently ending with `"durationHours": "hr"`) and add two keys:

```json
  "singleSession": {
    "setTarget": "Set your target",
    "sets": "Sets",
    "reps": "Reps",
    "start": "Start",
    "startError": "Failed to start session",
    "setLabel": "Set {current} of {total}",
    "logError": "Failed to log set. Please try again.",
    "duration": "Duration (s)",
    "viewMedia": "View Media",
    "durationSeconds": "s",
    "durationMinutes": "min",
    "durationHours": "hr",
    "navPrev": "Previous set",
    "navNext": "Next set"
  },
```

- [ ] **Step 2: Verify the JSON is still valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat(session): add single-exercise nav i18n keys"
```

---

### Task 6: Integrate navigation into `PlanSessionRunner.tsx`

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

- [ ] **Step 1: Add imports and `loggedSets` state**

In `PlanSessionRunner.tsx`, update the imports at the top of the file:

```ts
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import { SetLogger } from '@/components/SetLogger'
import { BiSeriesSetLogger } from '@/components/BiSeriesSetLogger'
import { RestTimerScreen } from '@/components/RestTimerScreen'
import { StepperNav } from '@/components/StepperNav'
import { CompletedItemSummary } from '@/components/CompletedItemSummary'
import { LockedItemPreview } from '@/components/LockedItemPreview'
import { useSessionStepper } from '@/lib/hooks/useSessionStepper'
import type { SetLogData } from '@/components/BiSeriesSetLogger'
import type { LoggedSet } from '@/components/CompletedItemSummary'
import { fadeSlideUp, springTransition } from '@/lib/animation'
import { playSetComplete } from '@/lib/audio'
import type { TrainingPlanWithDetails } from '@/lib/domain/plan'
```

Then add a new piece of state right after the existing `showRestTimer` state (`const [showRestTimer, setShowRestTimer] = useState(false)`):

```ts
  const [loggedSets, setLoggedSets] = useState<Record<string, LoggedSet[]>>({})
```

- [ ] **Step 2: Capture logged data in `handleMarkDone`**

Find this line inside `handleMarkDone` (right after the network call succeeds):

```ts
    const newProgress = { ...setProgress, [planItemExerciseId]: currentSet }
    setSetProgress(newProgress)
    playSetComplete()
```

Replace it with:

```ts
    const newProgress = { ...setProgress, [planItemExerciseId]: currentSet }
    setSetProgress(newProgress)
    setLoggedSets((prev) => ({
      ...prev,
      [planItemExerciseId]: [
        ...(prev[planItemExerciseId] ?? []),
        { setNumber: currentSet, weightKg: data.weightKg, repsDone: data.repsDone, durationSecs: data.durationSecs },
      ],
    }))
    playSetComplete()
```

- [ ] **Step 3: Capture logged data in `handleBiSeriesSetDone`**

Find this line inside `handleBiSeriesSetDone`:

```ts
    const biSeriesTotalSets = currentItem!.exercises[0].sets
    setBiSeriesSet((prev) => ({ ...prev, [currentItem!.id]: setNumber }))
    playSetComplete()
```

Replace it with:

```ts
    const biSeriesTotalSets = currentItem!.exercises[0].sets
    setBiSeriesSet((prev) => ({ ...prev, [currentItem!.id]: setNumber }))
    setLoggedSets((prev) => ({
      ...prev,
      [slotA.id]: [...(prev[slotA.id] ?? []), { setNumber, weightKg: dataA.weightKg ?? undefined, repsDone: dataA.repsDone ?? undefined, durationSecs: dataA.durationSecs ?? undefined }],
      [slotB.id]: [...(prev[slotB.id] ?? []), { setNumber, weightKg: dataB.weightKg ?? undefined, repsDone: dataB.repsDone ?? undefined, durationSecs: dataB.durationSecs ?? undefined }],
    }))
    playSetComplete()
```

- [ ] **Step 4: Wire up the stepper and read the viewed item**

Find:

```ts
  const currentItem = plan.items[itemIndex]
```

Replace it with:

```ts
  const currentItem = plan.items[itemIndex]
  const { viewIndex, goPrev, goNext, canGoPrev, canGoNext, status } = useSessionStepper(itemIndex, plan.items.length - 1)
  const viewedItem = plan.items[viewIndex]
```

- [ ] **Step 5: Replace the running-phase render branch**

Find the entire block starting at `{phase === 'running' && currentItem && (` through its matching closing `)}` (the whole IIFE that branches on `isBiseries`). Replace the **condition** and the **body of the IIFE** as follows.

Replace:

```tsx
      {phase === 'running' && currentItem && (
```

with:

```tsx
      {phase === 'running' && currentItem && viewedItem && (
```

Then replace the full IIFE body — i.e. everything between `{(() => {` and `})()}` — with:

```tsx
          {(() => {
            if (status === 'current' && showRestTimer) {
              return <RestTimerScreen onComplete={() => setShowRestTimer(false)} />
            }

            const nav = (
              <StepperNav
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={goPrev}
                onNext={goNext}
                prevLabel={t('navPrev')}
                nextLabel={t('navNext')}
              />
            )

            if (status === 'completed') {
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[rgba(255,255,255,0.4)]">
                        {t('itemProgress', { current: viewIndex + 1, total: plan.items.length })}
                      </span>
                      {nav}
                    </div>
                  </div>
                  <CompletedItemSummary
                    exercises={viewedItem.exercises.map((ex) => ({
                      id: ex.id,
                      name: ex.exercise.name,
                      trackingType: ex.exercise.trackingType,
                      media: ex.exercise.media,
                      loggedSets: loggedSets[ex.id] ?? [],
                    }))}
                  />
                </>
              )
            }

            if (status === 'locked') {
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[rgba(255,255,255,0.4)]">
                        {t('itemProgress', { current: viewIndex + 1, total: plan.items.length })}
                      </span>
                      {nav}
                    </div>
                  </div>
                  <LockedItemPreview
                    exercises={viewedItem.exercises.map((ex) => ({
                      id: ex.id,
                      name: ex.exercise.name,
                      description: ex.exercise.description,
                      media: ex.exercise.media,
                      targetReps: ex.reps,
                      trackingType: ex.exercise.trackingType,
                    }))}
                  />
                </>
              )
            }

            const isBiseries = currentItem.exercises.length === 2

            if (isBiseries) {
              const slotA = currentItem.exercises.find((e) => e.slot === 1)!
              const slotB = currentItem.exercises.find((e) => e.slot === 2)!
              const currentSet = biSeriesSet[currentItem.id] ?? 0
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[rgba(255,255,255,0.4)]">
                        {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
                      </span>
                      {nav}
                    </div>
                  </div>
                  <BiSeriesSetLogger
                    setNumber={currentSet + 1}
                    totalSets={slotA.sets}
                    exerciseA={{
                      id: slotA.id,
                      name: slotA.exercise.name,
                      targetReps: slotA.reps,
                      trackingType: slotA.exercise.trackingType,
                    }}
                    exerciseB={{
                      id: slotB.id,
                      name: slotB.exercise.name,
                      targetReps: slotB.reps,
                      trackingType: slotB.exercise.trackingType,
                    }}
                    onMarkDone={handleBiSeriesSetDone}
                  />
                  {logError && <p className="text-sm text-red-400">{logError}</p>}
                </>
              )
            }

            return (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="font-display text-xl font-bold">{plan.name}</h1>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[rgba(255,255,255,0.4)]">
                      {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
                    </span>
                    {nav}
                  </div>
                </div>
                {currentItem.exercises.map((ex) => {
                  const currentSet = setProgress[ex.id] ?? 0
                  const setsLeft = ex.sets - currentSet
                  return (
                    <div key={ex.id} className="flex flex-col gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-bold">{ex.exercise.name}</h2>
                        {ex.exercise.description && (
                          <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">
                            {ex.exercise.description}
                          </p>
                        )}
                      </div>
                      {ex.exercise.media.length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setViewerOpenFor(ex.id)}
                          className="hover:border-[#E85D26]"
                        >
                          {t('viewMedia')} ({ex.exercise.media.length})
                        </Button>
                      )}
                      {viewerOpenFor === ex.id && (
                        <MediaViewer media={ex.exercise.media} onClose={() => setViewerOpenFor(null)} />
                      )}
                      {setsLeft > 0 && (
                        <SetLogger
                          key={currentSet}
                          setNumber={currentSet + 1}
                          totalSets={ex.sets}
                          targetReps={ex.reps}
                          trackingType={ex.exercise.trackingType}
                          onMarkDone={(data) => handleMarkDone(ex.id, ex.exerciseId, ex.sets, data)}
                        />
                      )}
                      {setsLeft === 0 && (
                        <p className="font-semibold text-[rgba(255,255,255,0.4)]">{t('allSetsDone')}</p>
                      )}
                    </div>
                  )
                })}
                {logError && <p className="text-sm text-red-400">{logError}</p>}
              </>
            )
          })()}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `PlanSessionRunner.tsx`

- [ ] **Step 7: Commit**

```bash
git add "src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx"
git commit -m "feat(session): add back/forth navigation to PlanSessionRunner"
```

---

### Task 7: Integrate navigation into `ExerciseSessionRunner.tsx`

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx`

- [ ] **Step 1: Add imports and `loggedSets` state**

Update imports:

```ts
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeSlideUp } from '@/lib/animation'
import { MediaViewer } from '@/components/MediaViewer'
import { SetLogger } from '@/components/SetLogger'
import { StepperNav } from '@/components/StepperNav'
import { CompletedItemSummary } from '@/components/CompletedItemSummary'
import type { LoggedSet } from '@/components/CompletedItemSummary'
import { LockedItemPreview } from '@/components/LockedItemPreview'
import { useSessionStepper } from '@/lib/hooks/useSessionStepper'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise, ExerciseMedia } from '@prisma/client'
import { DEFAULT_TIME_TARGET_SECONDS } from '@/lib/domain/constants'
```

Add state right after `const [viewerOpen, setViewerOpen] = useState(false)`:

```ts
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const { viewIndex, goPrev, goNext, canGoPrev, canGoNext, status } = useSessionStepper(currentSet, targetSets - 1)
```

- [ ] **Step 2: Capture logged data in `handleMarkDone`**

Find:

```ts
    } finally {
      logging.current = false
    }
    if (nextSet >= targetSets) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}`)
      return
    }
    setCurrentSet(nextSet)
  }
```

Replace it with:

```ts
    } finally {
      logging.current = false
    }
    setLoggedSets((prev) => [
      ...prev,
      { setNumber: nextSet, weightKg: data.weightKg, repsDone: data.repsDone, durationSecs: data.durationSecs },
    ])
    if (nextSet >= targetSets) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}`)
      return
    }
    setCurrentSet(nextSet)
  }
```

- [ ] **Step 3: Replace the 'running' phase render**

Find the entire block:

```tsx
      {phase === 'running' && (
        <motion.div
          key="running"
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          exit={fadeSlideUp.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
          </div>

          {exercise.media.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setViewerOpen(true)}
              className="hover:border-[#E85D26]"
            >
              {t('viewMedia')} ({exercise.media.length})
            </Button>
          )}

          {viewerOpen && <MediaViewer media={exercise.media} onClose={() => setViewerOpen(false)} />}

          <SetLogger
            setNumber={currentSet + 1}
            totalSets={targetSets}
            targetReps={targetReps}
            trackingType={exercise.trackingType}
            onMarkDone={handleMarkDone}
          />

          {logError && <p className="text-sm text-red-400">{logError}</p>}
        </motion.div>
      )}
```

Replace it with:

```tsx
      {phase === 'running' && (
        <motion.div
          key="running"
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          exit={fadeSlideUp.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[rgba(255,255,255,0.4)]">
                {t('setLabel', { current: viewIndex + 1, total: targetSets })}
              </span>
              <StepperNav
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={goPrev}
                onNext={goNext}
                prevLabel={t('navPrev')}
                nextLabel={t('navNext')}
              />
            </div>
          </div>

          {status === 'completed' && (
            <CompletedItemSummary
              exercises={[
                {
                  id: exercise.id,
                  name: exercise.name,
                  trackingType: exercise.trackingType,
                  media: exercise.media,
                  loggedSets: loggedSets[viewIndex] ? [loggedSets[viewIndex]] : [],
                },
              ]}
            />
          )}

          {status === 'locked' && (
            <LockedItemPreview
              exercises={[
                {
                  id: exercise.id,
                  name: exercise.name,
                  description: exercise.description,
                  media: exercise.media,
                  targetReps,
                  trackingType: exercise.trackingType,
                },
              ]}
            />
          )}

          {status === 'current' && (
            <>
              {exercise.media.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setViewerOpen(true)}
                  className="hover:border-[#E85D26]"
                >
                  {t('viewMedia')} ({exercise.media.length})
                </Button>
              )}

              {viewerOpen && <MediaViewer media={exercise.media} onClose={() => setViewerOpen(false)} />}

              <SetLogger
                setNumber={currentSet + 1}
                totalSets={targetSets}
                targetReps={targetReps}
                trackingType={exercise.trackingType}
                onMarkDone={handleMarkDone}
              />

              {logError && <p className="text-sm text-red-400">{logError}</p>}
            </>
          )}
        </motion.div>
      )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `ExerciseSessionRunner.tsx`

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx"
git commit -m "feat(session): add back/forth navigation to ExerciseSessionRunner"
```

---

### Task 8: E2E coverage

**Files:**
- Modify: `tests/e2e/trainee.spec.ts`

- [ ] **Step 1: Add a plan-session navigation scenario**

Add this test inside the existing `test.describe('Trainee — Full plan session', ...)` block (after the `'runs full training plan and logs sets'` test):

```ts
  test('navigates back to a completed exercise and forward to a locked one', async ({ page }) => {
    await seedTrainee({ name: 'Nav User' })
    const exerciseA = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    const exerciseB = await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    const exerciseC = await seedExercise({ name: 'Deadlift', trackingType: 'WEIGHT' })
    await seedPlan({
      name: 'Nav Day',
      items: [
        { exerciseId: exerciseA.id, sets: 1, reps: 8 },
        { exerciseId: exerciseB.id, sets: 1, reps: 8 },
        { exerciseId: exerciseC.id, sets: 1, reps: 5 },
      ],
    })

    await page.goto('/')
    await page.click('text=Nav User')
    await page.click('text=Nav Day')
    await page.click("text=LET'S GO")

    // Log exercise 1 (Bench Press) — current becomes exercise 2 (Squat)
    await expect(page.locator('text=Bench Press')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.fill('[name=repsDone]', '8')
    await page.click('text=Mark Done')
    await expect(page.locator('text=Squat')).toBeVisible()

    // Go back to exercise 1 — completed, shows recap, no Mark Done
    await page.click('[aria-label="Previous exercise"]')
    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Completed')).toBeVisible()
    await expect(page.locator('text=60 kg × 8 reps')).toBeVisible()
    await expect(page.locator('text=Mark Done')).not.toBeVisible()

    // Back to current (Squat), then forward into exercise 3 — locked, no inputs
    await page.click('[aria-label="Next exercise"]')
    await expect(page.locator('text=Squat')).toBeVisible()
    await page.click('[aria-label="Next exercise"]')
    await expect(page.locator('text=Deadlift')).toBeVisible()
    await expect(page.locator('text=Locked')).toBeVisible()
    await expect(page.locator('text=Mark Done')).not.toBeVisible()
    await expect(page.locator('[name=weightKg]')).not.toBeVisible()

    // Back to current and finish the plan normally
    await page.click('[aria-label="Previous exercise"]')
    await expect(page.locator('text=Squat')).toBeVisible()
    await page.fill('[name=weightKg]', '100')
    await page.fill('[name=repsDone]', '5')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Deadlift')).toBeVisible()
    await page.fill('[name=weightKg]', '120')
    await page.fill('[name=repsDone]', '5')
    await page.click('text=Mark Done')

    await page.fill('[name=calories]', '300')
    await page.click('text=Save & Finish')
  })
```

- [ ] **Step 2: Add a single-exercise navigation scenario**

Add this test inside `test.describe('Trainee — Full plan session', ...)` after the `'trains single exercise outside a plan'` test:

```ts
  test('navigates back to a completed set in a single-exercise session', async ({ page }) => {
    await seedTrainee({ name: 'Solo Nav User' })
    await seedExercise({ name: 'Pull-up', trackingType: 'NONE' })

    await page.goto('/')
    await page.click('text=Solo Nav User')
    await page.click('text=Train Single Exercise')
    await page.click('text=Pull-up')

    await page.fill('[name=sets]', '2')
    await page.fill('[name=reps]', '8')
    await page.click('text=Start')

    await expect(page.locator('text=Set 1 of 2')).toBeVisible()
    await page.click('text=Mark Done')

    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
    await page.click('[aria-label="Previous set"]')
    await expect(page.locator('text=Completed')).toBeVisible()
    await expect(page.locator('text=Mark Done')).not.toBeVisible()

    await page.click('[aria-label="Next set"]')
    await page.click('text=Mark Done')

    await page.click('text=Save & Finish')
  })
```

- [ ] **Step 3: Run the E2E suite**

Run: `npm run test:e2e`
Expected: all tests pass, including the two new ones

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/trainee.spec.ts
git commit -m "test(e2e): cover session back/forth navigation"
```

---

### Task 9: Full verification pass

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Full unit suite**

Run: `npm run test:unit`
Expected: all pass, including the new hook/component tests

- [ ] **Step 4: Full E2E suite**

Run: `npm run test:e2e`
Expected: all pass

- [ ] **Step 5: Manual browser check**

Start the dev server (`npm run dev`), run a plan session with at least one biseries item:
1. Log exercise/round 1, confirm it auto-advances as before.
2. Tap "Previous exercise" — confirm the completed item shows its media button and the exact values just logged, and no Mark Done button is present.
3. Tap "Next exercise" back to current, confirm logging still works and the session still finishes normally.
4. If the plan has a 3rd item, tap "Next exercise" twice from a completed/current item to reach a locked item — confirm it shows name/target/media but no inputs.
