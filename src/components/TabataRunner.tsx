'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import { playTick, playTimeUp } from '@/lib/audio'
import type { ExerciseMedia } from '@prisma/client'
import { TabataPreviewScreen } from '@/components/TabataPreviewScreen'

const RING_RADIUS = 45
const RING_CX = 60
const RING_CY = 60
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const CRITICAL_THRESHOLD = 10

export interface TabataExercise {
  id: string
  exerciseId: string
  name: string
  media: ExerciseMedia[]
}

interface TabataRunnerProps {
  exercises: TabataExercise[]
  totalRounds: number
  workTimeSecs: number
  restTimeSecs: number
  onExerciseDone: (exerciseId: string, round: number, durationSecs: number) => Promise<void>
  onComplete: () => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TabataRunner({
  exercises,
  totalRounds,
  workTimeSecs,
  restTimeSecs,
  onExerciseDone,
  onComplete,
}: TabataRunnerProps) {
  const t = useTranslations('session')
  const tRunner = useTranslations('sessionRunner')
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(workTimeSecs)
  const [loading, setLoading] = useState(false)
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeLeftRef = useRef(workTimeSecs)
  const loadingRef = useRef(false)

  const currentDuration = phase === 'work' ? workTimeSecs : restTimeSecs
  const progress = currentDuration > 0 ? timeLeft / currentDuration : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)
  const isCritical = phase === 'work' && timeLeft <= CRITICAL_THRESHOLD
  const ringColor = isCritical ? '#EF4444' : '#E85D26'

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

  // Effect 2: handle timer expiry — runs with fresh closure on each render,
  // so phase/exerciseIdx/round are always current when timeLeft hits 0
  useEffect(() => {
    if (timeLeft > 0) return
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }

    if (phase === 'rest') {
      playTimeUp()
      navigator.vibrate?.(200)
      /* eslint-disable react-hooks/set-state-in-effect */
      if (exerciseIdx === exercises.length - 1) {
        setExerciseIdx(0)
        setRound((r) => r + 1)
      } else {
        setExerciseIdx((i) => i + 1)
      }
      setPhase('work')
      /* eslint-enable react-hooks/set-state-in-effect */
    } else if (!loadingRef.current) {
      playTimeUp()
      navigator.vibrate?.(200)
      void completeCurrentExercise(workTimeSecs)
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  async function completeCurrentExercise(elapsed: number) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }

    try {
      await onExerciseDone(exercises[exerciseIdx].exerciseId, round, elapsed)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }

    const isLastExercise = exerciseIdx === exercises.length - 1
    const isLastRound = round === totalRounds

    if (isLastExercise && isLastRound) {
      onComplete()
      return
    }

    // exerciseIdx stays on the CURRENT exercise during rest;
    // rest-end handler will advance to the next exercise/round
    setPhase('rest')
  }

  const handleStop = () => {
    const elapsed = Math.max(1, workTimeSecs - timeLeftRef.current)
    void completeCurrentExercise(elapsed)
  }

  const currentExercise = exercises[exerciseIdx]

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="rounded bg-[#E85D26] px-2 py-0.5 text-xs font-bold uppercase text-white">
          {t('tabataBadge')}
        </span>
        <div className="text-right text-sm text-[rgba(255,255,255,0.6)]">
          <div>{t('tabataRound', { current: round, total: totalRounds })}</div>
          <div>{t('tabataExercise', { current: exerciseIdx + 1, total: exercises.length })}</div>
        </div>
      </div>

      {phase === 'work' ? (
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
          <h2 className="mb-2 font-display text-2xl font-bold">{currentExercise.name}</h2>
          {currentExercise.media.length > 0 && (
            <>
              <Button
                type="button"
                variant="secondary"
                className="mb-4"
                onClick={() => setViewerOpenFor(currentExercise.id)}
              >
                {tRunner('viewMedia')} ({currentExercise.media.length})
              </Button>
              {viewerOpenFor === currentExercise.id && (
                <MediaViewer media={currentExercise.media} onClose={() => setViewerOpenFor(null)} />
              )}
            </>
          )}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90">
                <circle cx={RING_CX} cy={RING_CY} r={RING_RADIUS} fill="none" stroke="#333" strokeWidth="8" />
                <circle
                  cx={RING_CX} cy={RING_CY} r={RING_RADIUS}
                  fill="none" stroke={ringColor} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-2xl font-bold tabular-nums" style={{ color: ringColor }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleStop}
              disabled={loading}
            >
              {t('stopAndNext')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 py-8">
          <h1 className="font-display text-3xl font-bold">{t('restTitle')}</h1>
          <div className="relative">
            <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx={RING_CX} cy={RING_CY} r={RING_RADIUS} fill="none" stroke="#333" strokeWidth="8" />
              <circle
                cx={RING_CX} cy={RING_CY} r={RING_RADIUS}
                fill="none" stroke="#E85D26" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl font-bold tabular-nums" style={{ color: '#E85D26' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
