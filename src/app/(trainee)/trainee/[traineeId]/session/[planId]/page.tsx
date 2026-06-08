export const dynamic = 'force-dynamic'

import { trainingPlanService } from '@/lib/api/services'
import { notFound } from 'next/navigation'
import { PlanSessionRunner } from './PlanSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; planId: string }>
}

export default async function PlanSessionPage({ params }: Props) {
  const { traineeId, planId } = await params
  const plan = await trainingPlanService.findForSession(planId)
  if (!plan) notFound()

  return <PlanSessionRunner plan={plan} traineeId={traineeId} />
}
