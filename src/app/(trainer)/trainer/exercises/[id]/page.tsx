export const dynamic = 'force-dynamic'

import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { EditExerciseForm } from './EditExerciseForm'
import { MediaManager } from './MediaManager'
import { DeleteExerciseButton } from './DeleteExerciseButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('exerciseDetail')
  const exercise = await exerciseService.findWithMedia(id)
  if (!exercise) notFound()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
        <DeleteExerciseButton id={id} />
      </div>
      <EditExerciseForm exercise={exercise} />
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{t('media')}</h2>
        <MediaManager exerciseId={id} initialMedia={exercise.media ?? []} />
      </section>
    </div>
  )
}
