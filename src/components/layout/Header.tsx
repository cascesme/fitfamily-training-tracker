'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMode } from '@/lib/context/ModeContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const t = useTranslations('mode')
  const { mode, setMode } = useMode()
  const router = useRouter()

  const handleModeSwitch = () => {
    const next = mode === 'trainer' ? 'trainee' : 'trainer'
    setMode(next)
    router.push(next === 'trainer' ? '/trainer' : '/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0A]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={mode === 'trainer' ? '/trainer' : '/'} className="font-display text-lg font-bold tracking-tight">
          FitFamily
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleModeSwitch}
        >
          {mode === 'trainer' ? t('switchToTrainee') : t('switchToTrainer')}
        </Button>
      </div>
    </header>
  )
}
