import { trainingPlanService, exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PlanBuilder } from './PlanBuilder'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params
  await getTranslations('planBuilder')
  const [plan, exercises] = await Promise.all([
    trainingPlanService.findWithItems(id),
    exerciseService.list(),
  ])
  if (!plan) notFound()

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{plan.name}</h1>
      {plan.description && (
        <p className="mb-6 text-[rgba(255,255,255,0.6)]">{plan.description}</p>
      )}
      <PlanBuilder plan={plan} allExercises={exercises} />
    </div>
  )
}
