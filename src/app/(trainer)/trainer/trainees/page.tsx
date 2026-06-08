import { traineeService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { TraineeList } from './TraineeList'

export default async function TraineesPage() {
  const t = await getTranslations('trainees')
  const trainees = await traineeService.list()

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t('title')}</h1>
      <TraineeList initialTrainees={trainees} />
    </div>
  )
}
