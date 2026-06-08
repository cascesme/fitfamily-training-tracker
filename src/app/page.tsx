import { traineeService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export default async function HomePage() {
  const t = await getTranslations('home')
  const trainees = await traineeService.list()

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold">{t('greeting')}</h1>
      <p className="mb-8 text-[rgba(255,255,255,0.6)]">{t('subtitle')}</p>

      {trainees.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('noTrainees')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trainees.map((trainee) => (
            <Link key={trainee.id} href={`/trainee/${trainee.id}`}>
              <Card className="cursor-pointer py-6 transition-colors hover:border-[rgba(255,255,255,0.16)]">
                <p className="font-display text-2xl font-bold">{trainee.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
