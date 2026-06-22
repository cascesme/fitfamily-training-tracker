import { resolveLocale } from '@/i18n/locale-utils'

describe('resolveLocale', () => {
  it('returns es when cookie is undefined', () => {
    expect(resolveLocale(undefined)).toBe('es')
  })

  it('returns es when cookie value is es', () => {
    expect(resolveLocale('es')).toBe('es')
  })

  it('returns en when cookie value is en', () => {
    expect(resolveLocale('en')).toBe('en')
  })

  it('returns es when cookie value is an unrecognised string', () => {
    expect(resolveLocale('fr')).toBe('es')
  })

  it('returns es when cookie value is empty string', () => {
    expect(resolveLocale('')).toBe('es')
  })
})
