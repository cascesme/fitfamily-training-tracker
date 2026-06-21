'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PendingClient() {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 2000)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#0A0A0A]">
      <p className="font-display text-lg font-semibold">Setting up your account…</p>
      <p className="text-sm text-[rgba(255,255,255,0.4)]">You&apos;ll be redirected automatically.</p>
    </div>
  )
}
