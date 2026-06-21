# Tabata Preview Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a preview screen before every tabata block that lists exercises with their media and requires an explicit "Start Tabata" tap before the timer begins.

**Architecture:** `TabataRunner` gains an internal `started: boolean` state. When `!started`, it renders a new `TabataPreviewScreen` component. When `started`, it renders the existing timer UI unchanged. Effect 1 (the countdown initialiser) guards on `started` so no timer fires during preview. `PlanSessionRunner` is untouched.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript 5 · Tailwind CSS 4 · next-intl · Jest + React Testing Library · Playwright

## Global Constraints

- All user-facing strings via `next-intl` translation keys — zero hardcoded UI text.
- Dark theme only. Background `#0A0A0A` / `#111111` / `#1A1A1A`. Primary accent `#E85D26` (orange) for badge and CTA.
- Cards: `1px solid rgba(255,255,255,0.08)`, `border-radius: 8px`.
- Mobile-first layout.
- No comments unless WHY is non-obvious.
- TDD: write failing test first, make it pass, commit.
- Node via nvm — prefix bare commands with `~/.nvm/versions/node/v24.1.0/bin/` or source nvm first in non-interactive shells.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/i18n/en.json` | Modify | Add `session.tabataStart` and `session.tabataPreviewParams` |
| `src/components/TabataPreviewScreen.tsx` | Create | Exercise list + params summary + Start CTA |
| `src/components/TabataRunner.tsx` | Modify | Add `started` state, guard Effect 1, conditional render |
| `tests/unit/components/TabataPreviewScreen.test.tsx` | Create | Unit tests for preview component |
| `tests/unit/components/TabataRunner.test.tsx` | Modify | Add preview tests, add `startTabata()` helper to timer tests |
| `tests/e2e/trainee.spec.ts` | Modify | Add preview interaction before timer assertions in tabata test |

---

### Task 1: i18n keys

**Files:**
- Modify: `src/i18n/en.json`

**Interfaces:**
- Produces: `t('tabataStart')` → `"Start Tabata"` and `t('tabataPreviewParams', { rounds, work, rest })` → `"3 rounds · 20s / 10s"` for use in Task 2

- [ ] **Step 1: Add keys to `en.json`**

Open `src/i18n/en.json`. Inside the `"session"` object, add two keys after `"stopAndNext"`:

```json
"tabataStart": "Start Tabata",
"tabataPreviewParams": "{rounds} rounds · {work}s / {rest}s",
```

The `"session"` block tail should look like:

```json
    "stopAndNext": "Stop & Next Exercise",
    "tabataStart": "Start Tabata",
    "tabataPreviewParams": "{rounds} rounds · {work}s / {rest}s",
    "ready": {
```

- [ ] **Step 2: Verify typecheck passes**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat(i18n): add tabata preview screen translation keys"
```

---

### Task 2: `TabataPreviewScreen` component (TDD)

**Files:**
- Create: `src/components/TabataPreviewScreen.tsx`
- Create: `tests/unit/components/TabataPreviewScreen.test.tsx`

**Interfaces:**
- Consumes: `TabataExercise` from `@/components/TabataRunner`, `MediaStrip` from `@/components/MediaStrip`, `Button` from `@/components/ui/Button`, i18n keys from Task 1
- Produces: `export function TabataPreviewScreen(props: TabataPreviewScreenProps): JSX.Element` — called by `TabataRunner` in Task 3

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/TabataPreviewScreen.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabataPreviewScreen } from '@/components/TabataPreviewScreen'
import type { TabataExercise } from '@/components/TabataRunner'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      tabataBadge: 'TABATA',
      tabataStart: 'Start Tabata',
      tabataPreviewParams: '{rounds} rounds · {work}s / {rest}s',
    }
    const template = map[key] ?? key
    if (!params) return template
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      template,
    )
  },
}))

jest.mock('@/components/MediaStrip', () => ({
  MediaStrip: ({ media }: { media: unknown[] }) => (
    <div data-testid="media-strip" data-count={media.length} />
  ),
}))

const exercises: TabataExercise[] = [
  { id: 'item-1', exerciseId: 'ex-1', name: 'Push Ups', media: [] },
  { id: 'item-2', exerciseId: 'ex-2', name: 'Pull Ups', media: [] },
]

function makeProps(overrides?: Partial<React.ComponentProps<typeof TabataPreviewScreen>>) {
  return {
    exercises,
    totalRounds: 3,
    workTimeSecs: 20,
    restTimeSecs: 10,
    onStart: jest.fn(),
    ...overrides,
  }
}

describe('TabataPreviewScreen', () => {
  it('renders TABATA badge', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByText('TABATA')).toBeInTheDocument()
  })

  it('renders params summary with rounds, work, rest', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByText('3 rounds · 20s / 10s')).toBeInTheDocument()
  })

  it('renders all exercise names', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Pull Ups')).toBeInTheDocument()
  })

  it('renders a MediaStrip for each exercise', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getAllByTestId('media-strip')).toHaveLength(2)
  })

  it('renders Start Tabata button', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByRole('button', { name: 'Start Tabata' })).toBeInTheDocument()
  })

  it('calls onStart when Start Tabata clicked', () => {
    const onStart = jest.fn()
    render(<TabataPreviewScreen {...makeProps({ onStart })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start Tabata' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('does not render timer UI elements', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.queryByText('Round 1 of 3')).not.toBeInTheDocument()
    expect(screen.queryByText('Stop & Next Exercise')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/TabataPreviewScreen.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/TabataPreviewScreen'`

- [ ] **Step 3: Implement `TabataPreviewScreen`**

Create `src/components/TabataPreviewScreen.tsx`:

```tsx
'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { MediaStrip } from '@/components/MediaStrip'
import type { TabataExercise } from '@/components/TabataRunner'

interface TabataPreviewScreenProps {
  exercises: TabataExercise[]
  totalRounds: number
  workTimeSecs: number
  restTimeSecs: number
  onStart: () => void
}

export function TabataPreviewScreen({
  exercises,
  totalRounds,
  workTimeSecs,
  restTimeSecs,
  onStart,
}: TabataPreviewScreenProps) {
  const t = useTranslations('session')

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-2">
        <span className="w-fit rounded bg-[#E85D26] px-2 py-0.5 text-xs font-bold uppercase text-white">
          {t('tabataBadge')}
        </span>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">
          {t('tabataPreviewParams', { rounds: totalRounds, work: workTimeSecs, rest: restTimeSecs })}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="flex flex-col gap-2 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4"
          >
            <h2 className="font-display font-semibold">{ex.name}</h2>
            <MediaStrip media={ex.media} />
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <Button type="button" variant="primary" size="lg" className="w-full" onClick={onStart}>
          {t('tabataStart')}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/TabataPreviewScreen.test.tsx
```

Expected: 7 tests PASS.

- [ ] **Step 5: Typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/TabataPreviewScreen.tsx tests/unit/components/TabataPreviewScreen.test.tsx
git commit -m "feat(tabata): add TabataPreviewScreen component"
```

---

### Task 3: Wire `TabataRunner` to show preview before starting

**Files:**
- Modify: `src/components/TabataRunner.tsx`
- Modify: `tests/unit/components/TabataRunner.test.tsx`

**Interfaces:**
- Consumes: `TabataPreviewScreen` from Task 2
- Produces: `TabataRunner` now renders preview on mount; timer only starts after `onStart` fires

- [ ] **Step 1: Update `TabataRunner.test.tsx` to add translation keys and a `startTabata` helper**

The existing mock in `TabataRunner.test.tsx` is missing the new i18n keys and the `MediaStrip` mock needed by `TabataPreviewScreen`. Add them, and add a `startTabata` helper that every timer-related test must call first.

Replace the top section of `tests/unit/components/TabataRunner.test.tsx` (everything before `const exercises`) with:

```tsx
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TabataRunner } from '@/components/TabataRunner'
import type { TabataExercise } from '@/components/TabataRunner'

const SESSION_TRANSLATIONS: Record<string, string> = {
  tabataBadge: 'TABATA',
  tabataRound: 'Round {current} of {total}',
  tabataExercise: 'Exercise {current} of {total}',
  stopAndNext: 'Stop & Next Exercise',
  restTitle: 'REST',
  tabataStart: 'Start Tabata',
  tabataPreviewParams: '{rounds} rounds · {work}s / {rest}s',
}

jest.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string, params?: Record<string, unknown>) => {
    const map = ns === 'sessionRunner' ? { viewMedia: 'View Media' } : SESSION_TRANSLATIONS
    const template = map[key] ?? key
    if (!params) return template
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      template,
    )
  },
}))

jest.mock('@/lib/audio', () => ({
  playTick: jest.fn(),
  playTimeUp: jest.fn(),
}))

jest.mock('@/components/MediaViewer', () => ({
  MediaViewer: () => null,
}))

jest.mock('@/components/MediaStrip', () => ({
  MediaStrip: () => null,
}))

Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate: jest.fn() },
  writable: true,
})

function startTabata() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Tabata' }))
}
```

- [ ] **Step 2: Add preview state tests and update timer tests**

Inside `describe('TabataRunner')`, add a new `describe('preview state')` block and update the existing timer tests to call `startTabata()` before any timer assertions. Replace the full `describe('TabataRunner')` block with:

```tsx
describe('TabataRunner', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('preview state', () => {
    it('shows TABATA badge, exercise names, and Start button on mount', () => {
      render(<TabataRunner {...makeProps()} />)
      expect(screen.getByText('TABATA')).toBeInTheDocument()
      expect(screen.getByText('Push Ups')).toBeInTheDocument()
      expect(screen.getByText('Pull Ups')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Start Tabata' })).toBeInTheDocument()
    })

    it('does not start the timer before Start is clicked', () => {
      render(<TabataRunner {...makeProps({ workTimeSecs: 10 })} />)
      act(() => { jest.advanceTimersByTime(5000) })
      expect(screen.queryByText('0:05')).not.toBeInTheDocument()
    })

    it('transitions to timer UI after Start is clicked', () => {
      render(<TabataRunner {...makeProps()} />)
      startTabata()
      expect(screen.getByText('Round 1 of 2')).toBeInTheDocument()
      expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Stop & Next Exercise' })).toBeInTheDocument()
    })
  })

  it('work timer counts down from workTimeSecs after start', () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 10 })} />)
    startTabata()
    act(() => { jest.advanceTimersByTime(3000) })
    expect(screen.getByText('0:07')).toBeInTheDocument()
  })

  it('calls onExerciseDone with full workTimeSecs when work timer expires', async () => {
    const onExerciseDone = jest.fn().mockResolvedValue(undefined)
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, onExerciseDone })} />)
    startTabata()
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(onExerciseDone).toHaveBeenCalledWith('ex-1', 1, 5)
  })

  it('shows REST phase after work timer expires', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5 })} />)
    startTabata()
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(screen.getByText('REST')).toBeInTheDocument()
  })

  it('advances to next exercise after rest timer expires', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, restTimeSecs: 3 })} />)
    startTabata()
    await act(async () => { jest.advanceTimersByTime(5000) }) // work done
    await act(async () => { jest.advanceTimersByTime(3000) }) // rest done
    expect(screen.getByText('Pull Ups')).toBeInTheDocument()
    expect(screen.getByText('Exercise 2 of 2')).toBeInTheDocument()
  })

  it('increments round after all exercises complete', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, restTimeSecs: 3 })} />)
    startTabata()
    // exercise 1 work + rest
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // exercise 2 work + rest (end of round 1)
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // should now be on exercise 1 of round 2
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Round 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument()
  })

  it('calls onComplete directly after last exercise of last round — no rest', async () => {
    const onComplete = jest.fn()
    render(<TabataRunner {...makeProps({ totalRounds: 1, workTimeSecs: 5, restTimeSecs: 3, onComplete })} />)
    startTabata()
    // exercise 1 work + rest
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // exercise 2 work (last of last round)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(onComplete).toHaveBeenCalled()
    expect(screen.queryByText('REST')).not.toBeInTheDocument()
  })

  it('Stop & Next calls onExerciseDone with elapsed time and shows REST', async () => {
    const onExerciseDone = jest.fn().mockResolvedValue(undefined)
    render(<TabataRunner {...makeProps({ workTimeSecs: 20, onExerciseDone })} />)
    startTabata()
    act(() => { jest.advanceTimersByTime(8000) }) // 8 seconds elapsed
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Next Exercise' }))
    await act(async () => {})
    expect(onExerciseDone).toHaveBeenCalledWith('ex-1', 1, 8)
    expect(screen.getByText('REST')).toBeInTheDocument()
  })

  it('Stop & Next on last exercise of last round calls onComplete immediately', async () => {
    const onComplete = jest.fn()
    render(<TabataRunner {...makeProps({ totalRounds: 1, workTimeSecs: 20, restTimeSecs: 10, onComplete })} />)
    startTabata()
    // complete exercise 1 naturally (work + rest)
    await act(async () => { jest.advanceTimersByTime(20000) })
    await act(async () => { jest.advanceTimersByTime(10000) })
    // now on exercise 2 (last of last round) — stop early
    act(() => { jest.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Next Exercise' }))
    await act(async () => {})
    expect(onComplete).toHaveBeenCalled()
  })

  it('Stop button is disabled while onExerciseDone is in-flight', async () => {
    let resolve!: () => void
    const onExerciseDone = jest.fn().mockReturnValue(new Promise<void>((r) => { resolve = r }))
    render(<TabataRunner {...makeProps({ workTimeSecs: 20, onExerciseDone })} />)
    startTabata()
    act(() => { jest.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Next Exercise' }))
    expect(screen.getByRole('button', { name: 'Stop & Next Exercise' })).toBeDisabled()
    resolve()
    await act(async () => {})
  })
})
```

- [ ] **Step 3: Run updated tests to confirm they fail**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/TabataRunner.test.tsx
```

Expected: FAIL — `TabataPreviewScreen` not imported in `TabataRunner`, or timer starts immediately (the tests that added `startTabata()` will fail on `getByRole('button', { name: 'Start Tabata' })`).

- [ ] **Step 4: Modify `TabataRunner.tsx`**

Make these three changes to `src/components/TabataRunner.tsx`:

**4a.** Add import at top (after existing imports):

```ts
import { TabataPreviewScreen } from '@/components/TabataPreviewScreen'
```

**4b.** Inside the `TabataRunner` function body, add `started` state immediately after the other `useState` calls (around line 52):

```ts
const [started, setStarted] = useState(false)
```

**4c.** Modify Effect 1 — add `if (!started) return` guard and add `started` to the dependency array. Replace the existing Effect 1 (lines 65–81) with:

```ts
// Effect 1: start countdown whenever circuit position (phase/exerciseIdx/round) changes or started flips
useEffect(() => {
    if (!started) return
    const duration = phase === 'work' ? workTimeSecs : restTimeSecs
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(duration)
    timeLeftRef.current = duration

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        timeLeftRef.current = next
        if (phase === 'work' && next > 0 && next <= CRITICAL_THRESHOLD) playTick()
        return Math.max(next, 0)
      })
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, exerciseIdx, round, started]) // eslint-disable-line react-hooks/exhaustive-deps
```

**4d.** Add preview render guard inside the component, immediately before the `return (` statement (after all hook declarations):

```tsx
if (!started) {
    return (
      <TabataPreviewScreen
        exercises={exercises}
        totalRounds={totalRounds}
        workTimeSecs={workTimeSecs}
        restTimeSecs={restTimeSecs}
        onStart={() => setStarted(true)}
      />
    )
  }
```

- [ ] **Step 5: Run all unit tests to confirm they pass**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/TabataRunner.test.tsx
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit-components -- tests/unit/components/TabataPreviewScreen.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 6: Typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run full unit suite**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit unit-components
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/TabataRunner.tsx tests/unit/components/TabataRunner.test.tsx
git commit -m "feat(tabata): show preview screen before tabata timer starts"
```

---

### Task 4: Update E2E tests

**Files:**
- Modify: `tests/e2e/trainee.spec.ts` — the `'trainee runs tabata plan'` test

**Interfaces:**
- Consumes: `TabataPreviewScreen` rendered in the live app (Docker Compose stack)

The existing tabata E2E test in `tests/e2e/trainee.spec.ts` clicks "LET'S GO" and then immediately asserts the timer is running. After this change, clicking "LET'S GO" shows the preview screen — the test must interact with it before the timer starts.

- [ ] **Step 1: Update the tabata E2E test**

In `tests/e2e/trainee.spec.ts`, find the test `'trainee runs tabata plan — timers fire and session completes'` (line 113). Replace it with:

```ts
test('trainee runs tabata plan — timers fire and session completes', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Tabata Athlete' })
    const exA = await seedExercise({ name: 'Jump Squats', trackingType: 'NONE' })
    const exB = await seedExercise({ name: 'Mountain Climbers', trackingType: 'NONE' })
    const plan = await seedTabataPlan({
      name: 'Quick Tabata',
      exercises: [{ exerciseId: exA.id }, { exerciseId: exB.id }],
      sets: 1,
      workTimeSecs: 3,
      restTimeSecs: 2,
    })

    await page.goto(`/trainee/${trainee.id}`)
    await page.click('text=Quick Tabata')
    await page.click("text=LET'S GO")

    // Preview screen — assert content before timer starts
    await expect(page.getByText('TABATA', { exact: true })).toBeVisible()
    await expect(page.locator('text=Jump Squats')).toBeVisible()
    await expect(page.locator('text=Mountain Climbers')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Tabata' })).toBeVisible()

    // Start the tabata
    await page.click('text=Start Tabata')

    // First exercise work phase
    await expect(page.locator('text=Jump Squats')).toBeVisible()
    await expect(page.getByText('TABATA', { exact: true })).toBeVisible()
    await expect(page.locator('text=Round 1 of 1')).toBeVisible()

    // Wait for work timer to expire (3s + buffer)
    await page.waitForTimeout(4000)

    // Rest phase
    await expect(page.locator('text=REST')).toBeVisible()

    // Wait for rest timer to expire (2s + buffer)
    await page.waitForTimeout(3000)

    // Second exercise
    await expect(page.locator('text=Mountain Climbers')).toBeVisible()
    await expect(page.locator('text=Exercise 2 of 2')).toBeVisible()

    // Wait for second work timer
    await page.waitForTimeout(4000)

    // Session completes (last exercise of last round — no rest, goes to finish)
    await expect(page).toHaveURL(/\/finish/)
  })
```

- [ ] **Step 2: Rebuild the Docker test image**

```bash
docker compose -f docker-compose.test.yml build
```

Expected: build completes without errors.

- [ ] **Step 3: Run the tabata E2E test**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx playwright test tests/e2e/trainee.spec.ts --grep "tabata"
```

Expected: PASS.

- [ ] **Step 4: Run full E2E suite to check for regressions**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx playwright test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/trainee.spec.ts
git commit -m "test(e2e): update tabata test to interact with preview screen"
```
