'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { MediaViewer } from '@/components/MediaViewer'
import type { ExerciseMedia } from '@prisma/client'

export interface LoggedSet {
  setNumber: number
  weightKg?: number | null
  repsDone?: number | null
  durationSecs?: number | null
}

export interface CompletedExerciseEntry {
  id: string
  name: string
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
  media: ExerciseMedia[]
  loggedSets: LoggedSet[]
}

interface CompletedItemSummaryProps {
  exercises: CompletedExerciseEntry[]
}

function formatSetValue(set: LoggedSet, trackingType: CompletedExerciseEntry['trackingType']): string {
  if (trackingType === 'TIME') return `${set.durationSecs ?? 0}s`
  if (trackingType === 'WEIGHT') return `${set.weightKg ?? 0} kg × ${set.repsDone ?? 0} reps`
  return `${set.repsDone ?? 0} reps`
}

export function CompletedItemSummary({ exercises }: CompletedItemSummaryProps) {
  const t = useTranslations('sessionRunner')
  const [viewerOpenFor, setViewerOpenFor] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <span className="inline-flex w-fit items-center gap-1 rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs font-bold uppercase text-[rgba(255,255,255,0.6)]">
        {t('completedLabel')}
      </span>
      {exercises.map((ex) => (
        <div key={ex.id} className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
          <h2 className="font-display text-lg font-bold">{ex.name}</h2>
          {ex.media.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 hover:border-[#E85D26]"
              onClick={() => setViewerOpenFor(ex.id)}
            >
              {t('viewMedia')} ({ex.media.length})
            </Button>
          )}
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase text-[rgba(255,255,255,0.4)]">
              {t('loggedSetLabel', { number: ex.loggedSets.length })}
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {ex.loggedSets.map((set) => (
                <li key={set.setNumber} className="text-sm text-[rgba(255,255,255,0.6)]">
                  {formatSetValue(set, ex.trackingType)}
                </li>
              ))}
            </ul>
          </div>
          {viewerOpenFor === ex.id && (
            <MediaViewer media={ex.media} onClose={() => setViewerOpenFor(null)} />
          )}
        </div>
      ))}
    </div>
  )
}
