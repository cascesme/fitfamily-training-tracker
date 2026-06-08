'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MediaStrip } from '@/components/MediaStrip'
import { SetLogger } from '@/components/SetLogger'
import type { TrainingSession } from '@prisma/client'
import type { TrainingPlanWithDetails } from '@/lib/domain/plan'

interface Props {
  plan: TrainingPlanWithDetails
  session: TrainingSession
  traineeId: string
}

export function PlanSessionRunner({ plan, session, traineeId }: Props) {
  const t = useTranslations('sessionRunner')
  const router = useRouter()
  const [itemIndex, setItemIndex] = useState(0)
  const [setProgress, setSetProgress] = useState<Record<string, number>>({})
  const [logError, setLogError] = useState<string | null>(null)

  const currentItem = plan.items[itemIndex]

  if (!currentItem) return null

  async function handleMarkDone(
    planItemExerciseId: string,
    exerciseId: string,
    sets: number,
    data: { weightKg?: number; repsDone?: number },
  ) {
    setLogError(null)
    const currentSet = (setProgress[planItemExerciseId] ?? 0) + 1

    try {
      const res = await fetch(`/api/sessions/${session.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          planItemId: currentItem.id,
          setNumber: currentSet,
          weightKg: data.weightKg ?? null,
          repsDone: data.repsDone ?? null,
        }),
      })
      if (!res.ok) {
        setLogError(t('logError'))
        return
      }
    } catch {
      setLogError(t('logError'))
      return
    }

    const newProgress = { ...setProgress, [planItemExerciseId]: currentSet }
    setSetProgress(newProgress)

    const allDone = currentItem.exercises.every((ex) => (newProgress[ex.id] ?? 0) >= ex.sets)
    if (!allDone) return

    if (itemIndex + 1 >= plan.items.length) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${session.id}&planId=${plan.id}`)
      return
    }
    setItemIndex((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{plan.name}</h1>
        <span className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
        </span>
      </div>

      {currentItem.exercises.map((ex) => {
        const currentSet = setProgress[ex.id] ?? 0
        const setsLeft = ex.sets - currentSet

        return (
          <div key={ex.id} className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">{ex.exercise.name}</h2>
              {ex.exercise.description && (
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{ex.exercise.description}</p>
              )}
            </div>

            {ex.exercise.media.length > 0 && (
              <MediaStrip media={ex.exercise.media} />
            )}

            {setsLeft > 0 && (
              <SetLogger
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
    </div>
  )
}
