'use client'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { setLocale } from '@/app/actions/locale'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()

  async function handleToggle(newLocale: 'en' | 'es') {
    await setLocale(newLocale)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      {(['en', 'es'] as const).map((l) => (
        <button
          key={l}
          onClick={() => handleToggle(l)}
          disabled={l === locale}
          className={`rounded px-2 py-0.5 text-sm font-medium ${
            l === locale
              ? 'border border-[rgba(255,255,255,0.4)] text-white'
              : 'text-[rgba(255,255,255,0.4)] hover:text-white'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
