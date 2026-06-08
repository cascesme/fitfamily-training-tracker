import { exerciseService } from '@/lib/api/services'
import { notFound } from 'next/navigation'
import { ExerciseSessionRunner } from './ExerciseSessionRunner'
import type { Exercise, ExerciseMedia } from '@prisma/client'

interface Props {
  params: Promise<{ traineeId: string; exerciseId: string }>
}

export default async function SingleExerciseSessionPage({ params }: Props) {
  const { traineeId, exerciseId } = await params
  const exercise = await exerciseService.findWithMedia(exerciseId)
  if (!exercise) notFound()

  return (
    <ExerciseSessionRunner
      exercise={exercise as Exercise & { media: ExerciseMedia[] }}
      traineeId={traineeId}
    />
  )
}
