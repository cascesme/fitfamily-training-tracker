'use server'
import { cookies } from 'next/headers'

export async function setLocale(locale: 'en' | 'es') {
  const cookieStore = await cookies()
  cookieStore.set('FITFAMILY_LOCALE', locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  })
}
