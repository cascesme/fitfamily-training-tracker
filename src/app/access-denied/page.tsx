import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function AccessDeniedPage() {
  const t = await getTranslations('auth')
  const tCommon = await getTranslations('common')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0A] px-4 text-center">
      <h1 className="font-display text-2xl font-bold">{t('accessDeniedTitle')}</h1>
      <p className="text-[rgba(255,255,255,0.6)]">{t('accessDeniedSubtitle')}</p>
      <Link href="/sign-in" className="text-sm text-[rgba(255,255,255,0.4)] underline">
        {tCommon('back')}
      </Link>
    </div>
  )
}
