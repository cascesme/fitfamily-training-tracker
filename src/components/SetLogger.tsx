'use client'
import { WeightSetLogger } from '@/components/WeightSetLogger'
import { TimeSetLogger } from '@/components/TimeSetLogger'

interface SetLoggerProps {
  setNumber: number
  totalSets: number
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
  previousWeight?: number | null
  onMarkDone: (data: { weightKg?: number; repsDone?: number; durationSecs?: number }) => Promise<void>
}

export function SetLogger({ trackingType, ...rest }: SetLoggerProps) {
  if (trackingType === 'TIME') {
    return <TimeSetLogger trackingType={trackingType} {...rest} />
  }
  return <WeightSetLogger trackingType={trackingType} {...rest} />
}
