import { trainingPlanService, sessionService } from '@/lib/api/services'
import { notFound } from 'next/navigation'
import { PlanSessionRunner } from './PlanSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; planId: string }>
}

export default async function PlanSessionPage({ params }: Props) {
  const { traineeId, planId } = await params
  const plan = await trainingPlanService.findForSession(planId)
  if (!plan) notFound()

  const session = await sessionService.start(traineeId, planId)

  return <PlanSessionRunner plan={plan} session={session} traineeId={traineeId} />
}
