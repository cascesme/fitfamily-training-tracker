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
