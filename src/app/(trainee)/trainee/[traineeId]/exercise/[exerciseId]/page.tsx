export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { exerciseService, traineeService } from '@/lib/api/services'
import { notFound } from 'next/navigation'
import { ExerciseSessionRunner } from './ExerciseSessionRunner'
import type { Exercise, ExerciseMedia } from '@prisma/client'

interface Props {
  params: Promise<{ traineeId: string; exerciseId: string }>
}

export default async function SingleExerciseSessionPage({ params }: Props) {
  const { traineeId, exerciseId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const myTrainee = await traineeService.findByClerkUserId(userId)
  if (!myTrainee || myTrainee.id !== traineeId) {
    redirect(myTrainee ? `/trainee/${myTrainee.id}` : '/access-denied')
  }

  const exercise = await exerciseService.findWithMedia(exerciseId)
  if (!exercise) notFound()

  return (
    <ExerciseSessionRunner
      exercise={exercise as Exercise & { media: ExerciseMedia[] }}
      traineeId={traineeId}
    />
  )
}
