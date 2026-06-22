# Translation to Spanish — Design Spec

**Date:** 2026-06-22
**Branch:** cascesme/translation-to-spanish

---

## Overview

Add Spanish language support to FitFamily. All next-intl UI strings are translatable. User-created content (exercise names, plan names, trainee names) is not translated — it stays as entered. A toggle button in the navbar switches between EN and ES. Preference persists in a cookie. Spanish is the default.

---

## Scope

**In scope:**
- All strings in `src/i18n/en.json` translated to `src/i18n/es.json`
- Locale toggle in navbar (EN / ES pills)
- Cookie-based persistence (`FITFAMILY_LOCALE`)
- Default locale: `es` (no cookie = Spanish)

**Out of scope:**
- URL-based locale routing (`/en/...` `/es/...`)
- Translation of user-created content (exercise names, plan titles, etc.)
- Per-user DB-stored locale preference

---

## Architecture

### Cookie

| Property | Value |
|---|---|
| Name | `FITFAMILY_LOCALE` |
| Values | `en` \| `es` |
| Default (no cookie) | `es` |
| Max age | 1 year |
| Path | `/` |
| `httpOnly` | `false` (client reads for toggle state) |
| `sameSite` | `lax` |

### Data flow

1. Request arrives → `src/i18n/request.ts` reads `FITFAMILY_LOCALE` cookie
2. Picks `en.json` or `es.json` based on cookie value (default: `es`)
3. `NextIntlClientProvider` in `layout.tsx` hydrates with chosen messages
4. User clicks toggle → Server Action sets cookie → `router.refresh()` → full re-render in new locale

---

## Files Changed

| File | Action | Description |
|---|---|---|
| `src/i18n/es.json` | **Create** | Spanish translations of all ~350 strings from `en.json` |
| `src/i18n/request.ts` | **Edit** | Read `FITFAMILY_LOCALE` cookie; default to `es`; load matching JSON |
| `src/app/actions/locale.ts` | **Create** | Server Action: validate locale value, set cookie |
| `src/components/layout/LanguageToggle.tsx` | **Create** | Client component — EN/ES pill toggle, calls action + `router.refresh()` |
| `src/components/layout/Header.tsx` | **Edit** | Add `LanguageToggle` between logo and `UserButton` |

No changes to: middleware, routing, Prisma schema, services, repositories, API routes.

---

## Toggle UI

EN and ES pills always visible in the navbar header, between the FitFamily logo and the Clerk `UserButton`.

```
┌─────────────────────────────────────┐
│ FitFamily      [EN] [ES]  [avatar] │
└─────────────────────────────────────┘
```

- **Active locale:** white text, `1px solid rgba(255,255,255,0.4)` border, `border-radius: 4px`
- **Inactive locale:** `rgba(255,255,255,0.4)` text, no border
- Font: Inter (body), `text-sm font-medium`
- No orange — this is not a CTA

---

## request.ts Change

```ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('FITFAMILY_LOCALE')?.value === 'en' ? 'en' : 'es'
  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  }
})
```

---

## Server Action

```ts
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
```

---

## Testing

### Unit tests

- `src/i18n/request.ts` locale resolution:
  - Cookie `es` → ES messages
  - Cookie `en` → EN messages
  - No cookie → ES messages (default)
  - Invalid cookie value → ES messages (default)
- `LanguageToggle` renders:
  - Active pill has border; inactive does not
  - Correct pill is active per locale prop

### E2E tests

- Toggle from ES to EN: UI strings change to English, page refreshes
- Toggle from EN to ES: UI strings change to Spanish, page refreshes
- Refresh after toggle: chosen locale persists (cookie survives reload)
- First visit (no cookie): page renders in Spanish

---

## Translation Approach

`es.json` generated from `en.json` by Claude, covering all top-level namespaces:
`common`, `auth`, `nav`, `exercise`, `plan`, `trainee`, `session`, `media`, `progress`, `errors`, `trainer`, `exercises`, `exerciseDetail`, `mediaManager`, `plans`, `planBuilder`, `home`, `traineeDashboard`, `sessionRunner`, `planReview`, `singleSession`, `finish`, `trainees`.

User reviews Spanish wording after generation and requests corrections inline.
