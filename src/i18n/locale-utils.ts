export function resolveLocale(cookieValue: string | undefined): 'en' | 'es' {
  return cookieValue === 'en' ? 'en' : 'es'
}
