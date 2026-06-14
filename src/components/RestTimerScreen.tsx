'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { playTick, playTimeUp } from '@/lib/audio'

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const progress = duration > 0 ? timeLeft / duration : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  // Effect 1: tick
  useEffect(() => {
    if (timerState !== 'running') return
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(prev - 1, 0)
        if (next > 0 && next <= 10) playTick()
        return next
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState])

  // Effect 2: completion watcher
  useEffect(() => {
    if (timerState !== 'running' || timeLeft > 0) return
    clearInterval(intervalRef.current!)
    navigator.vibrate?.(200)
    playTimeUp()
    const completeTimer = setTimeout(() => {
      setTimerState('done')
      timeoutRef.current = setTimeout(() => onCompleteRef.current(), 800)
    }, 0)
    return () => clearTimeout(completeTimer)
  }, [timeLeft, timerState])

  // Effect 3: timeout cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

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
              if (!isNaN(v) && v >= 5) {
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
