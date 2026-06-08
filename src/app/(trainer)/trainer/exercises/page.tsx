import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { ExerciseCard } from '@/components/ExerciseCard'
import { CreateExerciseModal } from './CreateExerciseModal'

export default async function ExercisesPage() {
  const t = await getTranslations('exercises')
  const exercises = await exerciseService.list()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <CreateExerciseModal />
      </div>

      {exercises.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} href={`/trainer/exercises/${ex.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
