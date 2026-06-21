import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0A] px-4 text-center">
      <h1 className="font-display text-2xl font-bold">Access not granted.</h1>
      <p className="text-[rgba(255,255,255,0.6)]">Contact your trainer to get access.</p>
      <Link href="/sign-in" className="text-sm text-[rgba(255,255,255,0.4)] underline">
        Back to sign in
      </Link>
    </div>
  )
}
