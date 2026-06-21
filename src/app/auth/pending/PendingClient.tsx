'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function PendingClient() {
  const router = useRouter()
  const t = useTranslations('auth')
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 2000)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#0A0A0A]">
      <p className="font-display text-lg font-semibold">{t('pendingTitle')}</p>
      <p className="text-sm text-[rgba(255,255,255,0.4)]">{t('pendingSubtitle')}</p>
    </div>
  )
}
