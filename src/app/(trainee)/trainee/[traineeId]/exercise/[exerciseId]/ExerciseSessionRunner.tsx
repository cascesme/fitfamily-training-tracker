'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeSlideUp } from '@/lib/animation'
import { MediaViewer } from '@/components/MediaViewer'
import { SetLogger } from '@/components/SetLogger'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise, ExerciseMedia } from '@prisma/client'
import { DEFAULT_TIME_TARGET_SECONDS } from '@/lib/domain/constants'

interface Props {
  exercise: Exercise & { media: ExerciseMedia[] }
  traineeId: string
}

type Phase = 'setup' | 'running'

export function ExerciseSessionRunner({ exercise, traineeId }: Props) {
  const t = useTranslations('singleSession')
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('setup')
  const [targetSets, setTargetSets] = useState(3)
  const [targetReps, setTargetReps] = useState(exercise.trackingType === 'TIME' ? DEFAULT_TIME_TARGET_SECONDS : 10)
  const [durationValue, setDurationValue] = useState(DEFAULT_TIME_TARGET_SECONDS)
  const [durationUnit, setDurationUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentSet, setCurrentSet] = useState(0)
  const [startError, setStartError] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const logging = useRef(false)

  function computeTargetReps(): number {
    if (exercise.trackingType !== 'TIME') return targetReps
    if (durationUnit === 'hours') return durationValue * 3600
    if (durationUnit === 'minutes') return durationValue * 60
    return durationValue
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    const computedReps = computeTargetReps()
    setTargetReps(computedReps)
    setStartError(null)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId }),
      })
      if (!res.ok) {
        setStartError(t('startError'))
        return
      }
      const session = await res.json()
      setSessionId(session.id)
      setPhase('running')
    } catch {
      setStartError(t('startError'))
    }
  }

  async function handleMarkDone(data: { weightKg?: number; repsDone?: number; durationSecs?: number }) {
    if (!sessionId) return
    if (logging.current) return
    logging.current = true
    setLogError(null)
    const nextSet = currentSet + 1
    try {
      const res = await fetch(`/api/sessions/${sessionId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise.id,
          setNumber: nextSet,
          weightKg: data.weightKg ?? undefined,
          repsDone: data.repsDone ?? undefined,
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
    if (nextSet >= targetSets) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}`)
      return
    }
    setCurrentSet(nextSet)
  }

  return (
    <AnimatePresence mode="wait">
      {phase === 'setup' && (
        <motion.div
          key="setup"
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          exit={fadeSlideUp.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
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
                <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{exercise.trackingType === 'TIME' ? t('duration') : t('reps')}</label>
                <Input
                  name="reps"
                  type="number"
                  min="1"
                  value={targetReps}
                  onChange={(e) => setTargetReps(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            {startError && <p className="text-sm text-red-400">{startError}</p>}
            <Button type="submit">{t('start')}</Button>
          </form>
        </motion.div>
      )}

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
    </AnimatePresence>
  )
}
