'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SetLoggerProps {
  setNumber: number
  totalSets: number
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
  previousWeight?: number | null
  onMarkDone: (data: { weightKg?: number; repsDone?: number; durationSecs?: number }) => Promise<void>
}

function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  return `0:${String(seconds).padStart(2, '0')}`
}

function CountdownTimer({
  targetReps,
  loading,
  onMarkDone,
  t,
}: {
  targetReps: number
  loading: boolean
  onMarkDone: (data: { durationSecs?: number }) => Promise<void>
  t: ReturnType<typeof useTranslations<'session'>>
}) {
  const [remaining, setRemaining] = useState(targetReps)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)
  const onMarkDoneRef = useRef(onMarkDone)

  useEffect(() => { onMarkDoneRef.current = onMarkDone }, [onMarkDone])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          if (!doneRef.current) {
            doneRef.current = true
            onMarkDoneRef.current({ durationSecs: targetReps })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [targetReps])

  const progressPct = targetReps > 0 ? (remaining / targetReps) * 100 : 0

  const handleDoneEarly = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    doneRef.current = true
    await onMarkDone({ durationSecs: targetReps - remaining })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[rgba(255,255,255,0.6)]">{t('timeRemaining')}</p>
      <p className="font-display text-5xl font-bold tabular-nums">{formatTime(remaining)}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-[#E85D26] transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleDoneEarly}
        disabled={loading || doneRef.current}
      >
        {t('doneEarly')}
      </Button>
    </div>
  )
}

export function SetLogger({ setNumber, totalSets, targetReps, trackingType, previousWeight, onMarkDone }: SetLoggerProps) {
  const t = useTranslations('session')
  const [weightKg, setWeightKg] = useState(previousWeight?.toString() ?? '')
  const [repsDone, setRepsDone] = useState(targetReps.toString())
  const [loading, setLoading] = useState(false)

  const handleDone = async () => {
    setLoading(true)
    await onMarkDone({
      weightKg: trackingType === 'WEIGHT' ? parseFloat(weightKg) : undefined,
      repsDone: trackingType !== 'TIME' ? parseInt(repsDone) : undefined,
    })
    setLoading(false)
  }

  const handleTimeDone = async (data: { durationSecs?: number }) => {
    setLoading(true)
    await onMarkDone(data)
    setLoading(false)
  }

  return (
    <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
      <p className="mb-3 text-sm text-[rgba(255,255,255,0.6)]">
        {t('currentSet', { current: setNumber, total: totalSets })}
      </p>
      {trackingType === 'TIME' ? (
        <CountdownTimer
          targetReps={targetReps}
          loading={loading}
          onMarkDone={handleTimeDone}
          t={t}
        />
      ) : (
        <>
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
            <Input
              name="repsDone"
              label={t('repsLabel')}
              type="number"
              min="1"
              value={repsDone}
              onChange={(e) => setRepsDone(e.target.value)}
              className="w-20 text-2xl font-bold"
            />
          </div>
          {previousWeight && trackingType === 'WEIGHT' && (
            <p className="mt-2 text-xs text-[rgba(255,255,255,0.4)]">
              {t('lastSession')}: {previousWeight} kg
            </p>
          )}
          <Button variant="primary" size="lg" className="mt-4 w-full" onClick={handleDone} disabled={loading}>
            {t('markDone')}
          </Button>
        </>
      )}
    </div>
  )
}
