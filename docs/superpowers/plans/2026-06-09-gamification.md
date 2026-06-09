# Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subtle, polished Framer Motion gamification at three touchpoints: pre-session ready screen, per-set micro-feedback, and enhanced finish screen.

**Architecture:** Framer Motion added as a dependency. Shared animation constants in `src/lib/animation.ts`. `PlanSessionRunner` gains a `ready` phase (session created on LET'S GO tap, not on mount). `SetLogger` gets button tap animation and set counter bounce. `FinishScreen` gets staggered entrance with checkmark icon and updated copy.

**Tech Stack:** framer-motion (verify latest stable, React 19 + Next.js 15 compat), next-intl, Tailwind CSS 4, TypeScript 5.

**Spec:** `docs/superpowers/specs/2026-06-09-gamification-design.md`

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/lib/animation.ts` | Create | Shared animation variants + transitions |
| `src/i18n/en.json` | Modify | Add `sessionRunner.ready.*` keys, update `finish.title` / `finish.subtitle` |
| `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` | Modify | Add `ready` phase, Framer Motion entrance, glow overlay |
| `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx` | Modify | Animate setup→running phase transition only |
| `src/components/SetLogger.tsx` | Modify | `motion(Button)` on Mark Done, set counter `AnimatePresence` bounce |
| `src/app/(trainee)/trainee/[traineeId]/finish/FinishScreen.tsx` | Modify | Staggered entrance, checkmark SVG, updated copy |
| `tests/e2e/trainee.spec.ts` | Modify | Click LET'S GO after clicking plan card |
| `tests/e2e/time-exercise.spec.ts` | Modify | Click LET'S GO after clicking plan in TIME plan session test |

---

## Task 1: Install framer-motion and create animation constants

**Files:**
- Modify: `package.json`
- Create: `src/lib/animation.ts`

- [ ] **Step 1: Verify framer-motion version compatible with React 19 + Next.js 15**

  Run this search before installing:
  ```bash
  npm info framer-motion versions --json | tail -20
  ```
  Confirm latest stable supports React 19 (check peerDependencies in npm registry or docs). As of 2026 framer-motion 12.x+ supports React 19. Install the latest stable.

- [ ] **Step 2: Install framer-motion**

  ```bash
  npm install framer-motion
  ```

  Expected: framer-motion added to `package.json` dependencies.

- [ ] **Step 3: Create `src/lib/animation.ts`**

  ```ts
  import type { Variants, Transition } from 'framer-motion'

  export const fadeSlideUp: Variants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  }

  export const springTransition: Transition = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  }

  export const staggerContainer: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  }
  ```

- [ ] **Step 4: Run typecheck to confirm no errors**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add package.json package-lock.json src/lib/animation.ts
  git commit -m "feat(gamification): install framer-motion, add animation constants"
  ```

---

## Task 2: Update i18n keys

**Files:**
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add ready-screen keys to `sessionRunner` namespace and update `finish` namespace**

  In `src/i18n/en.json`, update the `sessionRunner` object:
  ```json
  "sessionRunner": {
    "itemProgress": "{current} of {total}",
    "allSetsDone": "Done",
    "logError": "Failed to log set. Please try again.",
    "viewMedia": "View Media",
    "ready": {
      "exerciseCount": "{count} exercises · {sets} sets",
      "tagline": "Show up. Push hard.",
      "cta": "LET'S GO"
    }
  }
  ```

  Update the `finish` object:
  ```json
  "finish": {
    "title": "Session Complete.",
    "subtitle": "You showed up. That counts.",
    "caloriesLabel": "Calories burned (optional)",
    "caloriesPlaceholder": "e.g. 320",
    "caloriesHint": "Enter the value from your Apple Watch",
    "saveFinish": "Save & Finish",
    "saving": "Saving…",
    "saveError": "Failed to save session"
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/i18n/en.json
  git commit -m "feat(gamification): add i18n keys for ready screen and finish copy"
  ```

---

## Task 3: Pre-session ready screen in PlanSessionRunner

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

Changes: remove `useEffect` session creation, add `phase: 'ready' | 'running'` state, add `handleStart`, add exercise-done glow overlay, wrap JSX in `AnimatePresence`.

- [ ] **Step 1: Rewrite `PlanSessionRunner.tsx`**

  Replace the entire file with:

  ```tsx
  'use client'

  import { useState, useRef } from 'react'
  import { useRouter } from 'next/navigation'
  import { useTranslations } from 'next-intl'
  import { motion, AnimatePresence } from 'framer-motion'
  import { Button } from '@/components/ui/Button'
  import { MediaViewer } from '@/components/MediaViewer'
  import { SetLogger } from '@/components/SetLogger'
  import { fadeSlideUp, springTransition } from '@/lib/animation'
  import type { TrainingPlanWithDetails } from '@/lib/domain/plan'

  interface Props {
    plan: TrainingPlanWithDetails
    traineeId: string
  }

  type Phase = 'ready' | 'running'

  export function PlanSessionRunner({ plan, traineeId }: Props) {
    const t = useTranslations('sessionRunner')
    const router = useRouter()
    const [phase, setPhase] = useState<Phase>('ready')
    const [starting, setStarting] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [itemIndex, setItemIndex] = useState(0)
    const [setProgress, setSetProgress] = useState<Record<string, number>>({})
    const [completingExercise, setCompletingExercise] = useState<string | null>(null)
    const [logError, setLogError] = useState<string | null>(null)
    const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)
    const logging = useRef(false)

    const totalExercises = plan.items.reduce((acc, item) => acc + item.exercises.length, 0)
    const totalSets = plan.items.reduce(
      (acc, item) => acc + item.exercises.reduce((a, e) => a + e.sets, 0),
      0,
    )

    async function handleStart() {
      setStarting(true)
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traineeId, planId: plan.id }),
        })
        const s = await res.json()
        setSessionId(s.id)
        setPhase('running')
      } finally {
        setStarting(false)
      }
    }

    const currentItem = plan.items[itemIndex]

    if (!currentItem && phase === 'running') return null

    async function handleMarkDone(
      planItemExerciseId: string,
      exerciseId: string,
      sets: number,
      data: { weightKg?: number; repsDone?: number; durationSecs?: number },
    ) {
      if (!sessionId) return
      if (logging.current) return
      logging.current = true
      setLogError(null)
      const currentSet = (setProgress[planItemExerciseId] ?? 0) + 1

      try {
        const res = await fetch(`/api/sessions/${sessionId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseId,
            planItemId: currentItem!.id,
            setNumber: currentSet,
            weightKg: data.weightKg ?? null,
            repsDone: data.repsDone ?? null,
            durationSecs: data.durationSecs ?? undefined,
          }),
        })
        if (!res.ok) {
          setLogError(t('logError'))
          return
        }
      } catch {
        setLogError(t('logError'))
        return
      } finally {
        logging.current = false
      }

      const newProgress = { ...setProgress, [planItemExerciseId]: currentSet }
      setSetProgress(newProgress)

      const exercise = currentItem!.exercises.find((ex) => ex.id === planItemExerciseId)
      if (exercise && currentSet >= exercise.sets) {
        setCompletingExercise(planItemExerciseId)
      }

      const allDone = currentItem!.exercises.every((ex) => (newProgress[ex.id] ?? 0) >= ex.sets)
      if (!allDone) return

      if (itemIndex + 1 >= plan.items.length) {
        router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}&planId=${plan.id}`)
        return
      }
      setItemIndex((prev) => prev + 1)
    }

    return (
      <AnimatePresence mode="wait">
        {phase === 'ready' ? (
          <motion.div
            key="ready"
            variants={fadeSlideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springTransition}
            className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center"
          >
            <div className="self-start">
              <button
                onClick={() => router.back()}
                className="text-[rgba(255,255,255,0.4)] hover:text-white"
              >
                ←
              </button>
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold">{plan.name}</h1>
              <p className="mt-2 text-[rgba(255,255,255,0.6)]">
                {t('ready.exerciseCount', { count: totalExercises, sets: totalSets })}
              </p>
            </div>

            <hr className="w-full border-[rgba(255,255,255,0.08)]" />

            <p className="italic text-[rgba(255,255,255,0.6)]">{t('ready.tagline')}</p>

            <motion.div whileTap={{ scale: 0.97 }} transition={springTransition} className="w-full">
              <Button
                variant="primary"
                size="lg"
                className="w-full py-5 font-display text-xl font-bold"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? '…' : t('ready.cta')}
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="running"
            variants={fadeSlideUp}
            initial="initial"
            animate="animate"
            transition={springTransition}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h1 className="font-display text-xl font-bold">{plan.name}</h1>
              <span className="text-sm text-[rgba(255,255,255,0.4)]">
                {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
              </span>
            </div>

            {currentItem?.exercises.map((ex) => {
              const currentSet = setProgress[ex.id] ?? 0
              const setsLeft = ex.sets - currentSet

              return (
                <div key={ex.id} className="relative flex flex-col gap-4 rounded-[8px]">
                  {completingExercise === ex.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.12, 0] }}
                      transition={{ duration: 0.6, times: [0, 0.4, 1] }}
                      onAnimationComplete={() => setCompletingExercise(null)}
                      className="pointer-events-none absolute inset-0 rounded-[8px] bg-[#E85D26]"
                    />
                  )}

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
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/\(trainee\)/trainee/\[traineeId\]/session/\[planId\]/PlanSessionRunner.tsx
  git commit -m "feat(gamification): add ready phase and exercise-done glow to PlanSessionRunner"
  ```

---

## Task 4: Animate ExerciseSessionRunner phase transition

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx`

Only change: wrap both `phase === 'setup'` and `phase === 'running'` returns in `AnimatePresence mode="wait"` with fade-slide-up motion divs. The setup form content (sets/reps inputs, Start button) stays 100% unchanged.

- [ ] **Step 1: Add framer-motion imports and wrap phases in AnimatePresence**

  Replace the top of the file imports (lines 1-12) with:

  ```tsx
  'use client'

  import { useState, useRef } from 'react'
  import { useRouter } from 'next/navigation'
  import { useTranslations } from 'next-intl'
  import { motion, AnimatePresence } from 'framer-motion'
  import { MediaViewer } from '@/components/MediaViewer'
  import { SetLogger } from '@/components/SetLogger'
  import { Button } from '@/components/ui/Button'
  import { Input } from '@/components/ui/Input'
  import type { Exercise, ExerciseMedia } from '@prisma/client'
  import { DEFAULT_TIME_TARGET_SECONDS } from '@/lib/domain/constants'
  import { fadeSlideUp, springTransition } from '@/lib/animation'
  ```

  Replace the `if (phase === 'setup') { return ( ... ) }` block and the final `return (...)` at lines 101-213 with:

  ```tsx
  return (
    <AnimatePresence mode="wait">
      {phase === 'setup' ? (
        <motion.div
          key="setup"
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springTransition}
          className="flex flex-col gap-6"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
            {exercise.description && (
              <p className="mt-1 text-[rgba(255,255,255,0.6)]">{exercise.description}</p>
            )}
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

          {viewerOpen && (
            <MediaViewer media={exercise.media} onClose={() => setViewerOpen(false)} />
          )}

          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-semibold">{t('setTarget')}</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('sets')}</label>
                <Input
                  name="sets"
                  type="number"
                  min="1"
                  value={targetSets}
                  onChange={(e) => setTargetSets(Number(e.target.value))}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">
                  {exercise.trackingType === 'TIME' ? t('duration') : t('reps')}
                </label>
                {exercise.trackingType === 'TIME' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      name="reps"
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => setDurationValue(Number(e.target.value))}
                      className="w-20"
                      required
                    />
                    {(['seconds', 'minutes', 'hours'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setDurationUnit(unit)}
                        className={`rounded-[6px] border px-2 py-1 text-sm font-medium transition-colors ${durationUnit === unit ? 'border-[#E85D26] text-white' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)]'}`}
                      >
                        {unit === 'seconds'
                          ? t('durationSeconds')
                          : unit === 'minutes'
                            ? t('durationMinutes')
                            : t('durationHours')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    name="reps"
                    type="number"
                    min="1"
                    value={targetReps}
                    onChange={(e) => setTargetReps(Number(e.target.value))}
                    required
                  />
                )}
              </div>
            </div>
            {startError && <p className="text-sm text-red-400">{startError}</p>}
            <Button type="submit">{t('start')}</Button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          key="running"
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          transition={springTransition}
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
    </AnimatePresence>
  )
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/\(trainee\)/trainee/\[traineeId\]/exercise/\[exerciseId\]/ExerciseSessionRunner.tsx
  git commit -m "feat(gamification): animate setup→running phase transition in ExerciseSessionRunner"
  ```

---

## Task 5: Per-set micro-feedback in SetLogger

**Files:**
- Modify: `src/components/SetLogger.tsx`

Changes: set counter becomes `AnimatePresence` keyed on `setNumber` (bounce when set increments). "Mark Done" button becomes `motion(Button)` with `whileTap: { scale: 0.95 }`.

- [ ] **Step 1: Rewrite `SetLogger.tsx`**

  Replace the entire file with:

  ```tsx
  'use client'
  import { useState } from 'react'
  import { useTranslations } from 'next-intl'
  import { motion, AnimatePresence } from 'framer-motion'
  import { Button } from '@/components/ui/Button'
  import { Input } from '@/components/ui/Input'
  import { springTransition } from '@/lib/animation'

  const MotionButton = motion(Button)

  interface SetLoggerProps {
    setNumber: number
    totalSets: number
    targetReps: number
    trackingType: 'WEIGHT' | 'TIME' | 'NONE'
    previousWeight?: number | null
    onMarkDone: (data: { weightKg?: number; repsDone?: number; durationSecs?: number }) => Promise<void>
  }

  export function SetLogger({
    setNumber,
    totalSets,
    targetReps,
    trackingType,
    previousWeight,
    onMarkDone,
  }: SetLoggerProps) {
    const t = useTranslations('session')
    const [weightKg, setWeightKg] = useState(previousWeight?.toString() ?? '')
    const [repsDone, setRepsDone] = useState(targetReps.toString())
    const [durationSecs, setDurationSecs] = useState(targetReps.toString())
    const [loading, setLoading] = useState(false)

    const handleDone = async () => {
      setLoading(true)
      await onMarkDone({
        weightKg: trackingType === 'WEIGHT' ? parseFloat(weightKg) : undefined,
        repsDone: trackingType !== 'TIME' ? parseInt(repsDone) : undefined,
        durationSecs: trackingType === 'TIME' ? parseInt(durationSecs) : undefined,
      })
      setLoading(false)
    }

    return (
      <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={setNumber}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springTransition}
            className="mb-3 text-sm text-[rgba(255,255,255,0.6)]"
          >
            {t('currentSet', { current: setNumber, total: totalSets })}
          </motion.p>
        </AnimatePresence>

        <div className="flex gap-3">
          {trackingType === 'WEIGHT' && (
            <Input
              name="weightKg"
              label={t('weightLabel')}
              type="number"
              step="0.5"
              min="0"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-24 text-2xl font-bold"
            />
          )}
          {trackingType === 'TIME' ? (
            <Input
              name="durationSecs"
              label={t('durationLabel')}
              type="number"
              min="1"
              value={durationSecs}
              onChange={(e) => setDurationSecs(e.target.value)}
              className="w-20 text-2xl font-bold"
            />
          ) : (
            <Input
              name="repsDone"
              label={t('repsLabel')}
              type="number"
              min="1"
              value={repsDone}
              onChange={(e) => setRepsDone(e.target.value)}
              className="w-20 text-2xl font-bold"
            />
          )}
        </div>

        {previousWeight && trackingType === 'WEIGHT' && (
          <p className="mt-2 text-xs text-[rgba(255,255,255,0.4)]">
            {t('lastSession')}: {previousWeight} kg
          </p>
        )}

        <MotionButton
          variant="primary"
          size="lg"
          className="mt-4 w-full"
          onClick={handleDone}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
        >
          {t('markDone')}
        </MotionButton>
      </div>
    )
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/SetLogger.tsx
  git commit -m "feat(gamification): add set counter bounce and mark-done tap animation to SetLogger"
  ```

---

## Task 6: Enhanced finish screen

**Files:**
- Modify: `src/app/(trainee)/trainee/[traineeId]/finish/FinishScreen.tsx`

Changes: staggered entrance via `staggerContainer` variants, inline SVG checkmark icon (64px, orange), updated copy uses the new i18n values from Task 2.

- [ ] **Step 1: Rewrite `FinishScreen.tsx`**

  Replace the entire file with:

  ```tsx
  'use client'

  import { useState } from 'react'
  import { useRouter } from 'next/navigation'
  import { useTranslations } from 'next-intl'
  import { motion } from 'framer-motion'
  import { Button } from '@/components/ui/Button'
  import { Input } from '@/components/ui/Input'
  import { fadeSlideUp, springTransition, staggerContainer } from '@/lib/animation'

  interface Props {
    traineeId: string
    sessionId: string
  }

  export function FinishScreen({ traineeId, sessionId }: Props) {
    const t = useTranslations('finish')
    const router = useRouter()
    const [calories, setCalories] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSave(e: React.FormEvent) {
      e.preventDefault()
      setError(null)
      setSaving(true)
      try {
        const body: { caloriesBurned?: number } = {}
        if (calories !== '') {
          body.caloriesBurned = Number(calories)
        }
        const res = await fetch(`/api/sessions/${sessionId}/finish`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          setError(t('saveError'))
          return
        }
        router.push(`/trainee/${traineeId}`)
      } catch {
        setError(t('saveError'))
      } finally {
        setSaving(false)
      }
    }

    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center gap-8 py-12 text-center"
      >
        <motion.div variants={fadeSlideUp} transition={springTransition}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="31" stroke="#E85D26" strokeWidth="2" />
            <path
              d="M20 32L28 40L44 24"
              stroke="#E85D26"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        <motion.h1
          variants={fadeSlideUp}
          transition={springTransition}
          className="font-display text-4xl font-bold"
        >
          {t('title')}
        </motion.h1>

        <motion.p
          variants={fadeSlideUp}
          transition={springTransition}
          className="text-[rgba(255,255,255,0.6)]"
        >
          {t('subtitle')}
        </motion.p>

        <motion.hr
          variants={fadeSlideUp}
          transition={springTransition}
          className="w-full border-[rgba(255,255,255,0.08)]"
        />

        <motion.form
          variants={fadeSlideUp}
          transition={springTransition}
          onSubmit={handleSave}
          className="flex w-full max-w-xs flex-col gap-4"
        >
          <div>
            <label className="mb-2 block text-sm text-[rgba(255,255,255,0.6)]">
              {t('caloriesLabel')}
            </label>
            <Input
              name="calories"
              type="number"
              min="0"
              placeholder={t('caloriesPlaceholder')}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">{t('caloriesHint')}</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t('saving') : t('saveFinish')}
          </Button>
        </motion.form>
      </motion.div>
    )
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/\(trainee\)/trainee/\[traineeId\]/finish/FinishScreen.tsx
  git commit -m "feat(gamification): staggered entrance and checkmark icon on FinishScreen"
  ```

---

## Task 7: Update E2E tests for ready screen

**Files:**
- Modify: `tests/e2e/trainee.spec.ts`
- Modify: `tests/e2e/time-exercise.spec.ts`

The ready screen is shown before the workout starts. Any E2E test that clicks a plan card and immediately expects exercise content must now click "LET'S GO" first.

- [ ] **Step 1: Update `trainee.spec.ts` — plan session test**

  In `tests/e2e/trainee.spec.ts`, the test `'runs full training plan and logs sets'` clicks `'Push Day'` (line 20) and then expects `'Bench Press'` to be visible (line 22). Add a `LET'S GO` click between them.

  Replace lines 20-22:
  ```ts
  await page.click('text=Push Day')

  await expect(page.locator('text=Bench Press')).toBeVisible()
  ```

  With:
  ```ts
  await page.click('text=Push Day')
  await expect(page.locator('text=LET\'S GO')).toBeVisible()
  await page.click('text=LET\'S GO')

  await expect(page.locator('text=Bench Press')).toBeVisible()
  ```

- [ ] **Step 2: Update `time-exercise.spec.ts` — plan session runner test**

  In `tests/e2e/time-exercise.spec.ts`, the test `'plan session runner shows Duration field for TIME exercise'` (line 78) clicks `'Cardio Plan'` and immediately expects `'Duration (s)'` to be visible. Add LET'S GO click.

  Replace lines 83-85:
  ```ts
  await page.goto(`/trainee/${trainee.id}`)
  await page.click('text=Cardio Plan')
  await expect(page.locator('label', { hasText: 'Duration (s)' })).toBeVisible()
  ```

  With:
  ```ts
  await page.goto(`/trainee/${trainee.id}`)
  await page.click('text=Cardio Plan')
  await expect(page.locator('text=LET\'S GO')).toBeVisible()
  await page.click('text=LET\'S GO')
  await expect(page.locator('label', { hasText: 'Duration (s)' })).toBeVisible()
  ```

- [ ] **Step 3: Run typecheck**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add tests/e2e/trainee.spec.ts tests/e2e/time-exercise.spec.ts
  git commit -m "test(e2e): update plan session tests to click through ready screen"
  ```

---

## Task 8: Verify

- [ ] **Step 1: Run unit tests (no logic changed — should all pass)**

  ```bash
  ~/.nvm/versions/node/v24.1.0/bin/npx jest --selectProjects unit
  ```

  Expected: all pass.

- [ ] **Step 2: Start the dev server and manually verify each touchpoint**

  ```bash
  npm run dev
  ```

  Check:
  1. Navigate to `http://localhost:3000` → pick trainee → click plan card → ready screen appears with plan name, exercise count, tagline, LET'S GO button
  2. Tap LET'S GO — button scales on press, smooth fade-out then session runner fades in
  3. Log a set — "Mark Done" button scales on press, set counter bounces to next number
  4. Complete all sets for an exercise — subtle orange glow pulses on that exercise row
  5. Complete all sets — finish screen slides in with staggered entrance (icon → title → subtitle → hr → form), checkmark visible, copy reads "Session Complete." / "You showed up. That counts."
  6. Navigate to single exercise → pick exercise → setup form fades in → click Start → running phase fades in

- [ ] **Step 3: Run E2E tests against Docker stack**

  ```bash
  npm run test:e2e
  ```

  Expected: all pass including the updated plan session tests.
