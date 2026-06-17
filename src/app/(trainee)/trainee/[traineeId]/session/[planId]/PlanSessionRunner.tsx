'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import { PlanReviewOverlay } from '@/components/PlanReviewOverlay'
import { SetLogger } from '@/components/SetLogger'
import { SeriesSetLogger } from '@/components/SeriesSetLogger'
import { RestTimerScreen } from '@/components/RestTimerScreen'
import type { SetLogData } from '@/components/SeriesSetLogger'
import { fadeSlideUp, springTransition } from '@/lib/animation'
import { playSetComplete } from '@/lib/audio'
import type { TrainingPlanWithDetails } from '@/lib/domain/plan'

interface Props {
  plan: TrainingPlanWithDetails
  traineeId: string
}

export function PlanSessionRunner({ plan, traineeId }: Props) {
  const t = useTranslations('sessionRunner')
  const tSession = useTranslations('session')
  const router = useRouter()
  const [phase, setPhase] = useState<'ready' | 'running'>('ready')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [itemIndex, setItemIndex] = useState(0)
  const [setProgress, setSetProgress] = useState<Record<string, number>>({})
  const [logError, setLogError] = useState<string | null>(null)
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)
  const [seriesRoundProgress, setSeriesRoundProgress] = useState<Record<string, number>>({})
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const logging = useRef(false)
  const starting = useRef(false)

  const totalExercises = plan.items.reduce((sum, item) => sum + item.exercises.length, 0)
  const totalSets = plan.items.reduce(
    (sum, item) => item.exercises.reduce((s, ex) => s + ex.sets, sum),
    0,
  )
  const completedItemIds = new Set(
    plan.items.filter((_, idx) => idx < itemIndex).map((item) => item.id),
  )

  async function handleStart() {
    if (starting.current) return
    starting.current = true
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId, planId: plan.id }),
      })
      if (!res.ok) return
      const s = await res.json()
      setSessionId(s.id)
      setPhase('running')
    } finally {
      starting.current = false
    }
  }

  const currentItem = plan.items[itemIndex]

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
    playSetComplete()

    const allDone = currentItem!.exercises.every((ex) => (newProgress[ex.id] ?? 0) >= ex.sets)
    if (!allDone) return

    if (itemIndex + 1 >= plan.items.length) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}&planId=${plan.id}`)
      return
    }
    setItemIndex((prev) => prev + 1)
  }

  async function handleSeriesSetDone(data: SetLogData[]) {
    if (!sessionId || logging.current) return
    logging.current = true
    setLogError(null)

    const sorted = currentItem!.exercises.slice().sort((a, b) => a.order - b.order)
    const setNumber = (seriesRoundProgress[currentItem!.id] ?? 0) + 1

    try {
      const responses = await Promise.all(
        sorted.map((ex, i) =>
          fetch(`/api/sessions/${sessionId}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exerciseId: ex.exerciseId,
              planItemId: currentItem!.id,
              setNumber,
              weightKg: data[i].weightKg ?? null,
              repsDone: data[i].repsDone ?? null,
              durationSecs: data[i].durationSecs ?? undefined,
            }),
          }),
        ),
      )
      if (responses.some((res) => !res.ok)) {
        setLogError(t('logError'))
        return
      }
    } catch {
      setLogError(t('logError'))
      return
    } finally {
      logging.current = false
    }

    const seriesTotalSets = sorted[0].sets
    setSeriesRoundProgress((prev) => ({ ...prev, [currentItem!.id]: setNumber }))
    playSetComplete()

    if (setNumber < seriesTotalSets) {
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

  const sessionContent = (
    <AnimatePresence mode="wait">
      {phase === 'ready' && (
        <motion.div
          key="ready"
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          exit={fadeSlideUp.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-6 px-4"
        >
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

          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="font-display text-2xl font-bold">{plan.name}</h1>
              <p className="text-sm text-[rgba(255,255,255,0.6)]">
                {tSession('ready.exerciseCount', { count: totalExercises, sets: totalSets })}
              </p>
            </div>

            <hr className="border-[rgba(255,255,255,0.08)]" />

            <p className="text-center italic text-[rgba(255,255,255,0.4)]">
              {tSession('ready.tagline')}
            </p>

            <motion.div whileTap={{ scale: 0.97 }} transition={springTransition}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStart}
              >
                {tSession('ready.cta')}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

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
            const isSeries = currentItem.exercises.length > 1

            if (showRestTimer) {
              return <RestTimerScreen onComplete={() => setShowRestTimer(false)} />
            }

            if (isSeries) {
              const sorted = currentItem.exercises.slice().sort((a, b) => a.order - b.order)
              const currentSet = seriesRoundProgress[currentItem.id] ?? 0
              return (
                <>
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
                  <SeriesSetLogger
                    setNumber={currentSet + 1}
                    totalSets={sorted[0].sets}
                    exercises={sorted.map((ex) => ({
                      id: ex.id,
                      name: ex.exercise.name,
                      targetReps: ex.reps,
                      trackingType: ex.exercise.trackingType,
                    }))}
                    onMarkDone={handleSeriesSetDone}
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
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {sessionContent}
      {reviewOpen && (
        <PlanReviewOverlay
          plan={plan}
          onClose={() => setReviewOpen(false)}
          completedItemIds={phase === 'running' ? completedItemIds : undefined}
        />
      )}
    </>
  )
}
