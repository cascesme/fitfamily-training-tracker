import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { traineeService } from '@/lib/api/services'
import { notFound } from 'next/navigation'
import { FinishScreen } from './FinishScreen'

interface Props {
  params: Promise<{ traineeId: string }>
  searchParams: Promise<{ sessionId?: string; planId?: string }>
}

export default async function FinishPage({ params, searchParams }: Props) {
  const { traineeId } = await params
  const { sessionId } = await searchParams
  if (!sessionId) notFound()

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const myTrainee = await traineeService.findByClerkUserId(userId)
  if (!myTrainee || myTrainee.id !== traineeId) {
    redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
  }

  return <FinishScreen traineeId={traineeId} sessionId={sessionId} />
}
