import { trainingPlanService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { CreatePlanModal } from './CreatePlanModal'

export default async function PlansPage() {
  const t = await getTranslations('plans')
  const plans = await trainingPlanService.list()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <CreatePlanModal />
      </div>

      {plans.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/trainer/plans/${plan.id}`}>
              <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
                <h2 className="font-display font-semibold">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{plan.description}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
