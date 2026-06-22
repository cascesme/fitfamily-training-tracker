import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { resolveLocale } from './locale-utils'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('FITFAMILY_LOCALE')?.value)
  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  }
})
