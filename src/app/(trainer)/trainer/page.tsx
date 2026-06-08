import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Card } from '@/components/ui/Card'

export default async function TrainerHomePage() {
  const t = await getTranslations('trainer')
  const sections = [
    { href: '/trainer/exercises', label: t('exercises'), description: t('exercisesDesc') },
    { href: '/trainer/plans', label: t('plans'), description: t('plansDesc') },
    { href: '/trainer/trainees', label: t('trainees'), description: t('traineesDesc') },
    { href: '/trainer/progress', label: t('progress'), description: t('progressDesc') },
  ]
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t('title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
              <h2 className="font-display font-semibold">{s.label}</h2>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
