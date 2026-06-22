'use client'
import Link from 'next/link'
import { UserButton, useAuth } from '@clerk/nextjs'
import { LanguageToggle } from './LanguageToggle'

export function Header() {
  const { sessionClaims } = useAuth()
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role
  const homeHref = role === 'trainer' ? '/trainer' : '/'

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0A]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={homeHref} className="font-display text-lg font-bold tracking-tight">
          FitFamily
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
