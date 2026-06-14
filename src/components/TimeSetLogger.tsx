'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { springTransition } from '@/lib/animation'

const RING_RADIUS = 45
const RING_CX = 60
const RING_CY = 60
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const CRITICAL_THRESHOLD = 10

type CountdownState = 'idle' | 'running' | 'done'

interface TimeSetLoggerProps {
  setNumber: number
  totalSets: number
  targetReps: number
  trackingType: 'TIME'
  previousWeight?: number | null
  onMarkDone: (data: { weightKg?: number; repsDone?: number; durationSecs?: number }) => Promise<void>
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TimeSetLogger({
  setNumber,
  totalSets,
  targetReps,
  onMarkDone,
}: TimeSetLoggerProps) {
  const t = useTranslations('session')
  const [countdownState, setCountdownState] = useState<CountdownState>('idle')
  const [timeLeft, setTimeLeft] = useState(targetReps)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeLeftRef = useRef(targetReps)

  const isCritical = timeLeft <= CRITICAL_THRESHOLD
  const ringColor = isCritical ? '#EF4444' : '#E85D26'
  const progress = targetReps > 0 ? timeLeft / targetReps : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  useEffect(() => {
    if (countdownState !== 'running') return

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        timeLeftRef.current = next
        if (next <= 0) {
          clearInterval(intervalRef.current!)
          setCountdownState('done')
          navigator.vibrate?.(200)
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [countdownState])

  const handleStart = () => {
    timeLeftRef.current = targetReps
    setCountdownState('running')
  }

  const handleDone = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const elapsed = targetReps - timeLeftRef.current
    setLoading(true)
    await onMarkDone({ durationSecs: elapsed })
    setLoading(false)
  }

  return (
    <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
      <p className="mb-4 text-sm text-[rgba(255,255,255,0.6)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={setNumber}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springTransition}
            style={{ display: 'inline-block' }}
          >
            {t('currentSet', { current: setNumber, total: totalSets })}
          </motion.span>
        </AnimatePresence>
      </p>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <svg
            width="160"
            height="160"
            viewBox="0 0 120 120"
            className="-rotate-90"
          >
            <circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_RADIUS}
              fill="none"
              stroke="#333"
              strokeWidth="8"
            />
            <motion.circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animate={{
                strokeDashoffset,
                stroke: ringColor,
              }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {countdownState === 'done' ? (
                <motion.p
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm font-bold text-[#EF4444]"
                >
                  {t('countdownComplete')}
                </motion.p>
              ) : (
                <motion.div
                  key={isCritical ? timeLeft : 'stable'}
                  animate={isCritical && countdownState === 'running'
                    ? { scale: [1, 1.12, 1] }
                    : { scale: 1 }
                  }
                  transition={{ duration: 0.3 }}
                  className="flex items-baseline gap-0.5"
                >
                  <span
                    className="font-display text-2xl font-bold tabular-nums leading-none"
                    style={{ color: countdownState === 'idle' ? 'rgba(255,255,255,0.4)' : ringColor }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {countdownState === 'idle' && (
          <p className="text-sm text-[rgba(255,255,255,0.4)]">{t('tapToStart')}</p>
        )}

        <div className="flex w-full flex-col gap-2">
          {countdownState === 'idle' ? (
            <motion.div whileTap={{ scale: 0.95 }} transition={springTransition}>
              <Button variant="primary" size="lg" className="w-full" onClick={handleStart}>
                {t('tapToStart')}
              </Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.95 }} transition={springTransition}>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleDone}
                disabled={loading}
              >
                {t('tapDone')}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
