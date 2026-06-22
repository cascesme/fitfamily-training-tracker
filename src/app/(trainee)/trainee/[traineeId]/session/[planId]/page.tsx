export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { trainingPlanService, traineeService } from '@/lib/api/services'
import { notFound } from 'next/navigation'
import { PlanSessionRunner } from './PlanSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; planId: string }>
}

export default async function PlanSessionPage({ params }: Props) {
  const { traineeId, planId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const myTrainee = await traineeService.findByClerkUserId(userId)
  if (!myTrainee || myTrainee.id !== traineeId) {
    redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
  }

  const plan = await trainingPlanService.findForSession(planId)
  if (!plan) notFound()

  return <PlanSessionRunner plan={plan} traineeId={traineeId} />
}
