# Biseries Screen Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the biseries (superset) session screen so each biseries is treated as a single compound unit — both exercises on one screen, one shared set counter, one "Mark Set Done" button, with a rest timer between sets.

**Architecture:** New `BiSeriesSetLogger` component renders both exercise input cards grouped visually; new `RestTimerScreen` handles the inter-set rest period. `PlanSessionRunner` detects biseries items (exercises.length === 2) and renders the new flow instead of the existing sequential single-exercise flow. Service layer gains equal-sets validation to enforce the shared counter invariant.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript · next-intl · Tailwind CSS 4 · Jest + @testing-library/react · Playwright

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/BiSeriesSetLogger.tsx` | Both exercise input cards + single "Mark Set Done" button |
| `src/components/RestTimerScreen.tsx` | Editable countdown ring + skip button between sets |
| `tests/unit/components/BiSeriesSetLogger.test.tsx` | Unit tests for BiSeriesSetLogger |
| `tests/unit/components/RestTimerScreen.test.tsx` | Unit tests for RestTimerScreen |
| `tests/unit/helpers/jest-dom-setup.ts` | Extends Jest with @testing-library/jest-dom matchers |

## Files to Modify

| File | Change |
|------|--------|
| `jest.config.ts` | Add `unit-components` project (jsdom env); narrow `unit` to `.test.ts` only |
| `src/lib/services/TrainingPlanService.ts` | Add equal-sets guard in `addItem()` |
| `src/i18n/en.json` | Add 8 new keys under `"session"` namespace |
| `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` | Biseries detect/branch + rest timer state |
| `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx` | Auto-sync sets2 when sets1 changes in biseries mode |
| `tests/unit/services/TrainingPlanService.test.ts` | Add equal-sets validation test |
| `tests/e2e/helpers/setup.ts` | Add `seedBiseriePlan` helper |
| `tests/e2e/trainee.spec.ts` | Add biseries E2E test |

---

## Task 1: Component Testing Infrastructure

**Files:**
- Modify: `jest.config.ts`
- Create: `tests/unit/helpers/jest-dom-setup.ts`

- [ ] **Step 1: Install packages**

```bash
cd /home/ccastro/Projects/training-assistant
~/.nvm/versions/node/v24.1.0/bin/npm install --save-dev jest-environment-jsdom @testing-library/react @testing-library/jest-dom
```

Expected: packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create the jest-dom setup file**

Create `tests/unit/helpers/jest-dom-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Update `jest.config.ts`**

Replace the entire file with:

```typescript
import type { Config } from 'jest'

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'unit-components',
      testMatch: ['<rootDir>/tests/unit/**/*.test.tsx'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/unit/helpers/jest-dom-setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'node',
      testTimeout: 60000,
      setupFilesAfterEnv: ['<rootDir>/tests/integration/helpers/jest-setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
}

export default config
```

- [ ] **Step 4: Verify existing unit tests still pass**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit
```

Expected: all green, no regressions.

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts tests/unit/helpers/jest-dom-setup.ts package.json package-lock.json
git commit -m "chore(test): add component testing infrastructure (jsdom + RTL)"
```

---

## Task 2: Service Validation — Equal Sets for Biseries

**Files:**
- Modify: `tests/unit/services/TrainingPlanService.test.ts`
- Modify: `src/lib/services/TrainingPlanService.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/services/TrainingPlanService.test.ts`, inside `describe('addItem', ...)` after the existing `'allows biseries when slot 1 exists'` test (around line 87), add:

```typescript
it('throws ValidationError when biseries exercises have unequal set counts', async () => {
  await expect(
    service.addItem('p1', 1, [
      { exerciseId: 'e1', sets: 3, reps: 10, slot: 1 },
      { exerciseId: 'e2', sets: 4, reps: 10, slot: 2 },
    ])
  ).rejects.toThrow(ValidationError)
  expect(mockRepo.addItem).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: FAIL — `"throws ValidationError when biseries exercises have unequal set counts"` fails because the guard doesn't exist yet.

- [ ] **Step 3: Add the equal-sets guard**

In `src/lib/services/TrainingPlanService.ts`, inside `addItem()` after the existing slot 2 guard (line 66, after the `if (hasSlot2 && !hasSlot1)` block), add:

```typescript
if (exercises.length === 2 && exercises[0].sets !== exercises[1].sets) {
  logger.warn(
    { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'biseries-equal-sets' },
    'Biseries rejected — unequal set counts',
  )
  throw new ValidationError('biseries exercises must have equal set counts')
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit -- tests/unit/services/TrainingPlanService.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/TrainingPlanService.ts tests/unit/services/TrainingPlanService.test.ts
git commit -m "feat(biseries): enforce equal set counts for biseries items"
```

---

## Task 3: i18n Keys

**Files:**
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add 8 new keys under `"session"`**

In `src/i18n/en.json`, inside the `"session"` object (after the existing `"tapDone": "Done"` line), add:

```json
"biSeriesBadge": "BISERIES",
"markSetDone": "Mark Set Done",
"targetReps": "Target: {reps} reps",
"targetDuration": "Target: {secs}s",
"restTitle": "REST",
"restSeconds": "SECONDS",
"startRest": "Start Rest",
"skipRest": "Skip → Next Set"
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat(biseries): add i18n keys for biseries logger and rest timer"
```

---

## Task 4: `BiSeriesSetLogger` Component (TDD)

**Files:**
- Create: `tests/unit/components/BiSeriesSetLogger.test.tsx`
- Create: `src/components/BiSeriesSetLogger.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/BiSeriesSetLogger.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BiSeriesSetLogger } from '@/components/BiSeriesSetLogger'
import type { BiSeriesExercise } from '@/components/BiSeriesSetLogger'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

const exerciseA: BiSeriesExercise = {
  id: 'a1',
  name: 'Bench Press',
  targetReps: 10,
  trackingType: 'WEIGHT',
}
const exerciseB: BiSeriesExercise = {
  id: 'b1',
  name: 'Barbell Row',
  targetReps: 10,
  trackingType: 'WEIGHT',
}

describe('BiSeriesSetLogger', () => {
  it('renders both exercise cards with names', () => {
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('button is disabled when WEIGHT exercise has no weight filled', () => {
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeDisabled()
  })

  it('button is enabled when all required inputs filled', () => {
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })

  it('calls onMarkDone with correct data for both exercises', async () => {
    const onMarkDone = jest.fn().mockResolvedValue(undefined)
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={onMarkDone}
      />,
    )
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Bench Press reps done'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Barbell Row reps done'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'markSetDone' }))
    await waitFor(() => {
      expect(onMarkDone).toHaveBeenCalledWith(
        { weightKg: 80, repsDone: 10 },
        { weightKg: 60, repsDone: 10 },
      )
    })
  })

  it('renders duration input for TIME tracking type', () => {
    const timeExA: BiSeriesExercise = { ...exerciseA, trackingType: 'TIME' }
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={timeExA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByLabelText('Bench Press duration seconds')).toBeInTheDocument()
  })

  it('NONE tracking type: button enabled with only reps pre-filled', () => {
    const noneExA: BiSeriesExercise = { ...exerciseA, trackingType: 'NONE' }
    const noneExB: BiSeriesExercise = { ...exerciseB, trackingType: 'NONE' }
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={noneExA}
        exerciseB={noneExB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/BiSeriesSetLogger.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/BiSeriesSetLogger'`.

- [ ] **Step 3: Implement `BiSeriesSetLogger`**

Create `src/components/BiSeriesSetLogger.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export type SetLogData = {
  weightKg?: number | null
  repsDone?: number | null
  durationSecs?: number | null
}

export interface BiSeriesExercise {
  id: string
  name: string
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
}

interface ExerciseInputState {
  weight: string
  reps: string
  duration: string
}

function initialState(targetReps: number): ExerciseInputState {
  return { weight: '', reps: targetReps.toString(), duration: '' }
}

function isValid(state: ExerciseInputState, trackingType: 'WEIGHT' | 'TIME' | 'NONE'): boolean {
  if (trackingType === 'TIME') return state.duration.trim() !== ''
  if (trackingType === 'WEIGHT') return state.weight.trim() !== '' && state.reps.trim() !== ''
  return state.reps.trim() !== ''
}

function toLogData(state: ExerciseInputState, trackingType: 'WEIGHT' | 'TIME' | 'NONE'): SetLogData {
  if (trackingType === 'TIME') return { durationSecs: parseInt(state.duration) }
  return {
    weightKg: trackingType === 'WEIGHT' ? parseFloat(state.weight) : null,
    repsDone: parseInt(state.reps),
  }
}

interface BiSeriesSetLoggerProps {
  setNumber: number
  totalSets: number
  exerciseA: BiSeriesExercise
  exerciseB: BiSeriesExercise
  onMarkDone: (dataA: SetLogData, dataB: SetLogData) => Promise<void>
}

function ExerciseCard({
  exercise,
  state,
  onChange,
  t,
}: {
  exercise: BiSeriesExercise
  state: ExerciseInputState
  onChange: (updater: (s: ExerciseInputState) => ExerciseInputState) => void
  t: (key: string, params?: Record<string, unknown>) => string
}) {
  return (
    <div className="border-l-2 border-[#E85D26] bg-[#111111] p-4">
      <h2 className="font-display text-lg font-bold">{exercise.name}</h2>
      <p className="mb-3 text-sm text-[rgba(255,255,255,0.6)]">
        {exercise.trackingType === 'TIME'
          ? t('targetDuration', { secs: exercise.targetReps })
          : t('targetReps', { reps: exercise.targetReps })}
      </p>
      <div className="flex gap-3">
        {exercise.trackingType === 'WEIGHT' && (
          <Input
            name="weightKg"
            aria-label={`${exercise.name} weight kg`}
            label={t('weightLabel')}
            type="number"
            step="0.5"
            min="0"
            value={state.weight}
            onChange={(e) => onChange((s) => ({ ...s, weight: e.target.value }))}
            className="w-24 text-2xl font-bold"
          />
        )}
        {exercise.trackingType === 'TIME' ? (
          <Input
            name="durationSecs"
            aria-label={`${exercise.name} duration seconds`}
            label={t('durationLabel')}
            type="number"
            min="1"
            value={state.duration}
            onChange={(e) => onChange((s) => ({ ...s, duration: e.target.value }))}
            className="w-24 text-2xl font-bold"
          />
        ) : (
          <Input
            name="repsDone"
            aria-label={`${exercise.name} reps done`}
            label={t('repsLabel')}
            type="number"
            min="1"
            value={state.reps}
            onChange={(e) => onChange((s) => ({ ...s, reps: e.target.value }))}
            className="w-20 text-2xl font-bold"
          />
        )}
      </div>
    </div>
  )
}

export function BiSeriesSetLogger({
  setNumber,
  totalSets,
  exerciseA,
  exerciseB,
  onMarkDone,
}: BiSeriesSetLoggerProps) {
  const t = useTranslations('session')
  const [stateA, setStateA] = useState<ExerciseInputState>(() => initialState(exerciseA.targetReps))
  const [stateB, setStateB] = useState<ExerciseInputState>(() => initialState(exerciseB.targetReps))
  const [loading, setLoading] = useState(false)

  const canSubmit = isValid(stateA, exerciseA.trackingType) && isValid(stateB, exerciseB.trackingType)

  const handleDone = async () => {
    setLoading(true)
    await onMarkDone(toLogData(stateA, exerciseA.trackingType), toLogData(stateB, exerciseB.trackingType))
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-[#E85D26] px-2 py-0.5 text-xs font-bold uppercase text-white">
          {t('biSeriesBadge')}
        </span>
        <span className="font-display text-xl font-bold">
          {t('currentSet', { current: setNumber, total: totalSets })}
        </span>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.08)]">
        <ExerciseCard exercise={exerciseA} state={stateA} onChange={setStateA} t={t} />
        <div className="h-px bg-[rgba(255,255,255,0.08)]" />
        <ExerciseCard exercise={exerciseB} state={stateB} onChange={setStateB} t={t} />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleDone}
        disabled={!canSubmit || loading}
      >
        {t('markSetDone')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/BiSeriesSetLogger.test.tsx
```

Expected: 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/BiSeriesSetLogger.tsx tests/unit/components/BiSeriesSetLogger.test.tsx
git commit -m "feat(biseries): add BiSeriesSetLogger component"
```

---

## Task 5: `RestTimerScreen` Component (TDD)

**Files:**
- Create: `tests/unit/components/RestTimerScreen.test.tsx`
- Create: `src/components/RestTimerScreen.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/RestTimerScreen.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RestTimerScreen } from '@/components/RestTimerScreen'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate: jest.fn() },
  writable: true,
})

describe('RestTimerScreen', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('renders with default 60s duration', () => {
    render(<RestTimerScreen onComplete={jest.fn()} />)
    expect(screen.getByLabelText('rest duration seconds')).toHaveValue(60)
    expect(screen.getByText('60s')).toBeInTheDocument()
  })

  it('skip button fires onComplete immediately', () => {
    const onComplete = jest.fn()
    render(<RestTimerScreen onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'skipRest' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('custom duration updates displayed time', () => {
    render(<RestTimerScreen onComplete={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('rest duration seconds'), { target: { value: '90' } })
    expect(screen.getByText('90s')).toBeInTheDocument()
  })

  it('start button begins countdown', () => {
    render(<RestTimerScreen onComplete={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('rest duration seconds'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'startRest' }))
    act(() => { jest.advanceTimersByTime(2000) })
    expect(screen.getByText('3s')).toBeInTheDocument()
  })

  it('fires onComplete after countdown ends', () => {
    const onComplete = jest.fn()
    render(<RestTimerScreen onComplete={onComplete} />)
    fireEvent.change(screen.getByLabelText('rest duration seconds'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'startRest' }))
    act(() => { jest.advanceTimersByTime(2000) })
    act(() => { jest.advanceTimersByTime(1000) }) // flush setTimeout(800)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/RestTimerScreen.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/RestTimerScreen'`.

- [ ] **Step 3: Implement `RestTimerScreen`**

Create `src/components/RestTimerScreen.tsx`:

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

const RING_RADIUS = 45
const RING_CX = 60
const RING_CY = 60
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const DEFAULT_DURATION = 60

type TimerState = 'idle' | 'running' | 'done'

interface RestTimerScreenProps {
  onComplete: () => void
}

export function RestTimerScreen({ onComplete }: RestTimerScreenProps) {
  const t = useTranslations('session')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const progress = duration > 0 ? timeLeft / duration : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  useEffect(() => {
    if (timerState !== 'running') return
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(intervalRef.current!)
          setTimerState('done')
          navigator.vibrate?.(200)
          setTimeout(() => onCompleteRef.current(), 800)
          return 0
        }
        return next
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState])

  const handleStart = () => {
    setTimeLeft(duration)
    setTimerState('running')
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <h1 className="font-display text-3xl font-bold">{t('restTitle')}</h1>

      {timerState === 'idle' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="5"
            max="300"
            value={duration}
            aria-label="rest duration seconds"
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (!isNaN(v) && v > 0) {
                setDuration(v)
                setTimeLeft(v)
              }
            }}
            className="w-16 rounded border border-[rgba(255,255,255,0.08)] bg-[#111111] py-2 text-center text-2xl font-bold text-white"
          />
          <span className="text-sm uppercase tracking-widest text-[rgba(255,255,255,0.6)]">
            {t('restSeconds')}
          </span>
        </div>
      )}

      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx={RING_CX} cy={RING_CY} r={RING_RADIUS} fill="none" stroke="#333" strokeWidth="8" />
          <circle
            cx={RING_CX}
            cy={RING_CY}
            r={RING_RADIUS}
            fill="none"
            stroke="#E85D26"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display text-2xl font-bold"
            style={{ color: timerState === 'idle' ? 'rgba(255,255,255,0.4)' : '#E85D26' }}
          >
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {timerState === 'idle' && (
          <Button variant="primary" size="lg" className="w-full" onClick={handleStart}>
            {t('startRest')}
          </Button>
        )}
        <Button variant="secondary" size="lg" className="w-full" onClick={onComplete}>
          {t('skipRest')}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/RestTimerScreen.test.tsx
```

Expected: 5 tests green.

- [ ] **Step 5: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/RestTimerScreen.tsx tests/unit/components/RestTimerScreen.test.tsx
git commit -m "feat(biseries): add RestTimerScreen component"
```

---

## Task 6: `PlanSessionRunner` — Biseries Detection & Rest Timer

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

- [ ] **Step 1: Add imports at top of file**

In `PlanSessionRunner.tsx`, after line 9 (`import { SetLogger } from '@/components/SetLogger'`), add:

```typescript
import { BiSeriesSetLogger } from '@/components/BiSeriesSetLogger'
import { RestTimerScreen } from '@/components/RestTimerScreen'
import type { SetLogData } from '@/components/BiSeriesSetLogger'
```

- [ ] **Step 2: Add biseries state variables**

After line 26 (`const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)`), add:

```typescript
const [biSeriesSet, setBiSeriesSet] = useState<Record<string, number>>({})
const [showRestTimer, setShowRestTimer] = useState(false)
```

- [ ] **Step 3: Add `handleBiSeriesSetDone` handler**

After the closing brace of `handleMarkDone` (after line 104), add:

```typescript
async function handleBiSeriesSetDone(dataA: SetLogData, dataB: SetLogData) {
  if (!sessionId || logging.current) return
  logging.current = true
  setLogError(null)

  const slotA = currentItem!.exercises.find((e) => e.slot === 1)!
  const slotB = currentItem!.exercises.find((e) => e.slot === 2)!
  const setNumber = (biSeriesSet[currentItem!.id] ?? 0) + 1

  try {
    const [resA, resB] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: slotA.exerciseId,
          planItemId: currentItem!.id,
          setNumber,
          weightKg: dataA.weightKg ?? null,
          repsDone: dataA.repsDone ?? null,
          durationSecs: dataA.durationSecs ?? undefined,
        }),
      }),
      fetch(`/api/sessions/${sessionId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: slotB.exerciseId,
          planItemId: currentItem!.id,
          setNumber,
          weightKg: dataB.weightKg ?? null,
          repsDone: dataB.repsDone ?? null,
          durationSecs: dataB.durationSecs ?? undefined,
        }),
      }),
    ])
    if (!resA.ok || !resB.ok) {
      setLogError(t('logError'))
      return
    }
  } catch {
    setLogError(t('logError'))
    return
  } finally {
    logging.current = false
  }

  const totalSets = currentItem!.exercises[0].sets
  setBiSeriesSet((prev) => ({ ...prev, [currentItem!.id]: setNumber }))

  if (setNumber < totalSets) {
    setShowRestTimer(true)
    return
  }

  setShowRestTimer(false)
  if (itemIndex + 1 >= plan.items.length) {
    router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}&planId=${plan.id}`)
    return
  }
  setItemIndex((prev) => prev + 1)
}
```

- [ ] **Step 4: Replace the running-phase render body**

Replace the entire contents of the `{phase === 'running' && currentItem && (` block (lines 167–232 in the original) with:

```tsx
{phase === 'running' && currentItem && (
  <motion.div
    key="running"
    initial={fadeSlideUp.initial}
    animate={fadeSlideUp.animate}
    exit={fadeSlideUp.exit}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="flex flex-col gap-6"
  >
    {(() => {
      const isBiseries = currentItem.exercises.length === 2

      if (showRestTimer) {
        return <RestTimerScreen onComplete={() => setShowRestTimer(false)} />
      }

      if (isBiseries) {
        const slotA = currentItem.exercises.find((e) => e.slot === 1)!
        const slotB = currentItem.exercises.find((e) => e.slot === 2)!
        const currentSet = biSeriesSet[currentItem.id] ?? 0
        return (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-display text-xl font-bold">{plan.name}</h1>
              <span className="text-sm text-[rgba(255,255,255,0.4)]">
                {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
              </span>
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
            <span className="text-sm text-[rgba(255,255,255,0.4)]">
              {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
            </span>
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
  </motion.div>
)}
```

- [ ] **Step 5: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(trainee\)/trainee/\[traineeId\]/session/\[planId\]/PlanSessionRunner.tsx
git commit -m "feat(biseries): integrate BiSeriesSetLogger and RestTimerScreen into PlanSessionRunner"
```

---

## Task 7: `AddItemModal` — Auto-Sync Sets for Biseries

**Files:**
- Modify: `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

- [ ] **Step 1: Add `useEffect` import if missing**

The file already imports `useState` from React. Change line 1:

```typescript
import { useState, useEffect } from 'react'
```

- [ ] **Step 2: Add useEffect to sync sets when type changes to biseries**

After the `const [sets2, setSets2] = useState('3')` line (line 76), add:

```typescript
useEffect(() => {
  if (type === 'biseries') setSets2(sets1)
}, [type])
```

- [ ] **Step 3: Sync sets2 when sets1 changes in biseries mode**

Replace the sets1 input's onChange handler. Find:

```typescript
<Input name="sets1" type="number" min="1" value={sets1} onChange={(e) => setSets1(e.target.value)} required />
```

Replace with:

```typescript
<Input
  name="sets1"
  type="number"
  min="1"
  value={sets1}
  onChange={(e) => {
    setSets1(e.target.value)
    if (type === 'biseries') setSets2(e.target.value)
  }}
  required
/>
```

- [ ] **Step 4: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(trainer\)/trainer/plans/\[id\]/AddItemModal.tsx
git commit -m "feat(biseries): auto-sync slot 2 sets when slot 1 sets change"
```

---

## Task 8: E2E Test — Biseries Flow

**Files:**
- Modify: `tests/e2e/helpers/setup.ts`
- Modify: `tests/e2e/trainee.spec.ts`

- [ ] **Step 1: Add `seedBiseriePlan` to setup.ts**

In `tests/e2e/helpers/setup.ts`, after the `seedPlan` function (after line 62), add:

```typescript
export async function seedBiseriePlan(data: {
  name: string
  exerciseAId: string
  exerciseBId: string
  sets: number
  repsA: number
  repsB: number
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  const item = await prisma.trainingPlanItem.create({
    data: { planId: plan.id, position: 1 },
  })
  await prisma.trainingPlanItemExercise.create({
    data: {
      itemId: item.id,
      exerciseId: data.exerciseAId,
      sets: data.sets,
      reps: data.repsA,
      slot: 1,
    },
  })
  await prisma.trainingPlanItemExercise.create({
    data: {
      itemId: item.id,
      exerciseId: data.exerciseBId,
      sets: data.sets,
      reps: data.repsB,
      slot: 2,
    },
  })
  return plan
}
```

- [ ] **Step 2: Add the biseries E2E test**

In `tests/e2e/trainee.spec.ts`, add a new test inside the `describe('Trainee — Full plan session', ...)` block after the last existing test:

```typescript
test('runs biseries plan — interleaved sets with rest timer', async ({ page }) => {
  const trainee = await seedTrainee({ name: 'Super User' })
  const exerciseA = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
  const exerciseB = await seedExercise({ name: 'Barbell Row', trackingType: 'WEIGHT' })
  await seedBiseriePlan({
    name: 'Superset Day',
    exerciseAId: exerciseA.id,
    exerciseBId: exerciseB.id,
    sets: 2,
    repsA: 10,
    repsB: 10,
  })

  await page.goto('/')
  await expect(page.locator('text=Super User')).toBeVisible()
  await page.click('text=Super User')
  await page.click('text=Superset Day')
  await page.click("text=LET'S GO")

  // Both exercises visible on one biseries screen
  await expect(page.locator('text=BISERIES')).toBeVisible()
  await expect(page.locator('text=Bench Press')).toBeVisible()
  await expect(page.locator('text=Barbell Row')).toBeVisible()
  await expect(page.locator('text=Set 1 of 2')).toBeVisible()

  // Fill both exercises and mark set 1 done
  await page.fill('[aria-label="Bench Press weight kg"]', '80')
  await page.fill('[aria-label="Bench Press reps done"]', '10')
  await page.fill('[aria-label="Barbell Row weight kg"]', '60')
  await page.fill('[aria-label="Barbell Row reps done"]', '10')
  await page.click('text=Mark Set Done')

  // Rest timer appears after set 1
  await expect(page.locator('text=REST')).toBeVisible()
  await page.click('text=Skip → Next Set')

  // Set 2 shown
  await expect(page.locator('text=Set 2 of 2')).toBeVisible()
  await page.fill('[aria-label="Bench Press weight kg"]', '80')
  await page.fill('[aria-label="Bench Press reps done"]', '10')
  await page.fill('[aria-label="Barbell Row weight kg"]', '60')
  await page.fill('[aria-label="Barbell Row reps done"]', '10')
  await page.click('text=Mark Set Done')

  // No rest timer after final set — goes directly to finish
  await expect(page.locator('text=REST')).not.toBeVisible()
  await expect(page.locator('text=Session Complete')).toBeVisible()
})
```

- [ ] **Step 3: Update import in trainee.spec.ts**

At the top of `tests/e2e/trainee.spec.ts`, update the import to include `seedBiseriePlan`:

```typescript
import { seedTrainee, seedExercise, seedPlan, seedBiseriePlan, cleanDatabase } from './helpers/setup'
```

- [ ] **Step 4: Run the E2E test**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx playwright test tests/e2e/trainee.spec.ts --project=chromium
```

Expected: all 3 tests green including the new biseries test.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/helpers/setup.ts tests/e2e/trainee.spec.ts
git commit -m "test(e2e): add biseries superset flow — interleaved sets with rest timer"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Interleaved execution model | Task 6 — PlanSessionRunner biseries branch |
| Both exercises on one screen | Task 4 — BiSeriesSetLogger |
| Single "Mark Set Done" button | Task 4 — BiSeriesSetLogger |
| Rest timer between non-final sets | Task 5 + 6 |
| Trainee sets rest duration | Task 5 — RestTimerScreen editable input |
| Equal sets enforced | Task 2 — TrainingPlanService guard |
| 2 logs per biseries set done | Task 6 — Promise.all in handleBiSeriesSetDone |
| Trainer UI syncs sets | Task 7 — AddItemModal |
| Unit tests for components | Tasks 4, 5 |
| Unit test for service guard | Task 2 |
| E2E test for biseries flow | Task 8 |

**Placeholder scan:** None found.

**Type consistency:** `SetLogData` exported from `BiSeriesSetLogger.tsx` and imported in `PlanSessionRunner.tsx`. `BiSeriesExercise` interface used consistently in component and tests. `handleBiSeriesSetDone` signature matches `BiSeriesSetLoggerProps.onMarkDone`.
