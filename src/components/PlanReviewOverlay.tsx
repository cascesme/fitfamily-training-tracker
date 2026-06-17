'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MediaStrip } from '@/components/MediaStrip'
import type { TrainingPlanWithDetails, TrainingPlanItemExerciseWithDetails } from '@/lib/domain/plan'

interface Props {
  plan: TrainingPlanWithDetails
  onClose: () => void
}

export function PlanReviewOverlay({ plan, onClose }: Props) {
  const t = useTranslations('planReview')
  const totalExercises = plan.items.reduce((sum, item) => sum + item.exercises.length, 0)
  const sortedItems = [...plan.items].sort((a, b) => a.position - b.position)

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0A0A0A] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{plan.name}</h1>
            <p className="text-sm text-[rgba(255,255,255,0.6)]">
              {t('exerciseCount', { count: totalExercises })}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label={t('close')} onClick={onClose}>
            {t('close')}
          </Button>
        </div>

        {sortedItems.map((item) => {
          const exercises = [...item.exercises].sort((a, b) => a.order - b.order)
          const isSeries = exercises.length > 1

          return (
            <Card key={item.id} className="flex flex-col gap-4">
              {isSeries && <Badge variant="accent">{t('series', { count: exercises.length })}</Badge>}
              {exercises.map((ex) => (
                <ReviewExerciseRow key={ex.id} item={ex} />
              ))}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ReviewExerciseRow({ item }: { item: TrainingPlanItemExerciseWithDetails }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">{item.exercise.name}</h2>
        <Badge>
          {item.sets} × {item.reps}
        </Badge>
      </div>
      {item.exercise.description && (
        <p className="text-sm text-[rgba(255,255,255,0.6)]">{item.exercise.description}</p>
      )}
      <MediaStrip media={item.exercise.media} />
    </div>
  )
}
