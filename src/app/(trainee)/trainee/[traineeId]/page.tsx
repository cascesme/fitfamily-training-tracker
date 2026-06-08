import { traineeService, trainingPlanService, exerciseService, sessionService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  params: Promise<{ traineeId: string }>
}

export default async function TraineeDashboardPage({ params }: Props) {
  const { traineeId } = await params
  const t = await getTranslations('traineeDashboard')

  let trainee
  try {
    trainee = await traineeService.findById(traineeId)
  } catch {
    notFound()
  }

  const [plans, exercises, lastSession] = await Promise.all([
    trainingPlanService.list(),
    exerciseService.list(),
    sessionService.findLastByTrainee(traineeId),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold">{trainee!.name}</h1>
        {lastSession && (
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.4)]">
            {t('lastSession', {
              date: new Date(lastSession.startedAt).toLocaleDateString(),
            })}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('startTraining')}</h2>
        {plans.length === 0 ? (
          <p className="text-[rgba(255,255,255,0.4)]">{t('noPlans')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/trainee/${traineeId}/session/${plan.id}`}>
                <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
                  <p className="font-display font-semibold">{plan.name}</p>
                  {plan.description && (
                    <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{plan.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('singleExercise')}</h2>
        <ExercisePicker traineeId={traineeId} exercises={exercises} />
      </section>
    </div>
  )
}
