'use client'
import { useState } from 'react'
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

export function SetLogger({ setNumber, totalSets, targetReps, trackingType, previousWeight, onMarkDone }: SetLoggerProps) {
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
      <p className="mb-3 text-sm text-[rgba(255,255,255,0.6)]">
        {t('currentSet', { current: setNumber, total: totalSets })}
      </p>
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
      <Button variant="primary" size="lg" className="mt-4 w-full" onClick={handleDone} disabled={loading}>
        {t('markDone')}
      </Button>
    </div>
  )
}
