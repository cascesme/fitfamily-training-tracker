# Translation to Spanish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spanish as the default language with a navbar EN/ES pill toggle that persists via cookie.

**Architecture:** Cookie `FITFAMILY_LOCALE` (`en`|`es`, default `es`) is read by `src/i18n/request.ts` on every request to select messages. A Server Action writes the cookie; `LanguageToggle` (client component) calls it and calls `router.refresh()` to re-render in the new locale. No URL routing changes, no middleware changes.

**Tech Stack:** next-intl 4.13, Next.js 15 App Router, React Server Actions, `next/headers` cookies (async API), Jest + React Testing Library, Playwright.

## Global Constraints

- All user-facing strings via next-intl keys — zero hardcoded UI text.
- Cookie name: `FITFAMILY_LOCALE`. Values: `en` | `es`. Default (missing or invalid): `es`.
- No URL-based locale routing. No `[locale]` segment. No middleware changes.
- Dark theme only. No orange on toggle — it is not a CTA.
- `cookies()` from `next/headers` is async in Next.js 15 — always `await` it.
- Run `npx jest --selectProjects unit` for unit tests; `npx jest --selectProjects integration` for integration tests.
- Before E2E: `docker compose -f docker-compose.test.yml build` to pick up new files.

---

## File Map

| File | Action |
|---|---|
| `src/i18n/es.json` | Create — Spanish translations of all ~350 strings |
| `src/i18n/locale-utils.ts` | Create — pure `resolveLocale()` helper (testable, no framework deps) |
| `src/i18n/request.ts` | Edit — read cookie, call `resolveLocale`, dynamic import |
| `src/app/actions/locale.ts` | Create — Server Action: validates and sets cookie |
| `src/components/layout/LanguageToggle.tsx` | Create — EN/ES pill toggle client component |
| `src/components/layout/Header.tsx` | Edit — add `<LanguageToggle />` |
| `src/app/layout.tsx` | Edit — dynamic `lang` attribute on `<html>` |
| `tests/unit/i18n/resolveLocale.test.ts` | Create — unit tests for locale resolver |
| `tests/unit/components/LanguageToggle.test.tsx` | Create — unit tests for toggle component |
| `tests/e2e/locale.spec.ts` | Create — E2E locale toggle tests |

---

### Task 1: Spanish translations (es.json)

**Files:**
- Create: `src/i18n/es.json`

**Interfaces:**
- Produces: `es.json` — mirrors every key in `en.json` with Spanish values. `request.ts` (Task 2) dynamically imports it.

- [ ] **Step 1: Create `src/i18n/es.json`**

```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "back": "Volver",
    "loading": "Cargando...",
    "error": "Algo salió mal",
    "confirm": "Confirmar",
    "add": "Agregar",
    "create": "Crear",
    "update": "Actualizar",
    "close": "Cerrar",
    "yes": "Sí",
    "no": "No",
    "optional": "Opcional",
    "required": "Requerido"
  },
  "auth": {
    "pendingTitle": "Configurando tu cuenta…",
    "pendingSubtitle": "Serás redirigido automáticamente.",
    "accessDeniedTitle": "Acceso no concedido.",
    "accessDeniedSubtitle": "Contacta a tu entrenador para obtener acceso.",
    "signInTitle": "Bienvenido a FitFamily"
  },
  "nav": {
    "exercises": "Ejercicios",
    "plans": "Planes de entrenamiento",
    "trainees": "Alumnos",
    "progress": "Progreso",
    "home": "Inicio"
  },
  "exercise": {
    "title": "Ejercicios",
    "createTitle": "Nuevo ejercicio",
    "editTitle": "Editar ejercicio",
    "name": "Nombre del ejercicio",
    "namePlaceholder": "ej. Sentadilla",
    "description": "Descripción",
    "descriptionPlaceholder": "Notas opcionales sobre este ejercicio",
    "trackingType": "Tipo de seguimiento",
    "trackingType_WEIGHT": "Peso",
    "trackingType_TIME": "Tiempo",
    "trackingType_NONE": "Ninguno",
    "createButton": "Crear ejercicio",
    "editButton": "Guardar cambios",
    "deleteButton": "Eliminar ejercicio",
    "deleteConfirm": "¿Estás seguro de que quieres eliminar este ejercicio?",
    "deleteBlocked": "No se puede eliminar: este ejercicio se ha usado en sesiones de entrenamiento.",
    "empty": "Sin ejercicios aún. Crea el primero.",
    "mediaTitle": "Medios",
    "mediaEmpty": "Sin medios aún.",
    "mediaAdd": "Agregar medio",
    "mediaDelete": "Eliminar",
    "mediaLimitReached": "Se alcanzó el máximo de 10 elementos multimedia.",
    "mediaType_VIDEO": "Video",
    "mediaType_PHOTO": "Foto",
    "mediaType_PDF": "PDF",
    "mediaType_YOUTUBE": "YouTube",
    "mediaUrlPlaceholder": "https://youtube.com/watch?v=...",
    "mediaFilePlaceholder": "Subir archivo"
  },
  "plan": {
    "title": "Planes de entrenamiento",
    "createTitle": "Nuevo plan",
    "editTitle": "Editar plan",
    "name": "Nombre del plan",
    "namePlaceholder": "ej. Fuerza cuerpo completo",
    "description": "Descripción",
    "descriptionPlaceholder": "Notas opcionales del plan",
    "createButton": "Crear plan",
    "editButton": "Guardar cambios",
    "deleteButton": "Eliminar plan",
    "deleteConfirm": "¿Estás seguro de que quieres eliminar este plan?",
    "empty": "Sin planes aún. Crea el primero.",
    "itemsTitle": "Ejercicios",
    "addItem": "Agregar ejercicio",
    "sets": "Series",
    "reps": "Repeticiones"
  },
  "trainee": {
    "title": "Alumnos",
    "createTitle": "Nuevo alumno",
    "editTitle": "Editar alumno",
    "name": "Nombre",
    "namePlaceholder": "ej. Alex",
    "createButton": "Agregar alumno",
    "editButton": "Guardar",
    "deleteButton": "Eliminar alumno",
    "deleteConfirm": "¿Estás seguro de que quieres eliminar este alumno?",
    "deleteBlocked": "No se puede eliminar: este alumno tiene sesiones de entrenamiento registradas.",
    "empty": "Sin alumnos aún. Agrega el primero.",
    "pickTitle": "¿Quién entrena hoy?",
    "pickEmpty": "No se encontraron alumnos. Pide al entrenador que te agregue."
  },
  "session": {
    "startPlan": "Comenzar entrenamiento",
    "startSingle": "Ejercicio único",
    "pickPlan": "Elegir un plan",
    "pickExercise": "Elegir un ejercicio",
    "currentSet": "Serie {current} de {total}",
    "weightLabel": "Peso (kg)",
    "weightPlaceholder": "0.0",
    "repsLabel": "Repeticiones",
    "repsPlaceholder": "0",
    "markDone": "Marcar como hecho",
    "nextExercise": "Siguiente ejercicio",
    "finishTitle": "¡Sesión completa!",
    "finishSummary": "¡Buen trabajo! Esto es lo que hiciste:",
    "caloriesLabel": "Calorías quemadas (opcional)",
    "caloriesPlaceholder": "Del Apple Watch",
    "saveSession": "Guardar sesión",
    "lastSession": "Última sesión",
    "noHistory": "Sin datos previos",
    "setsTarget": "Objetivo: {sets} series × {reps} repeticiones",
    "totalSets": "Series totales: {count}",
    "duration": "Duración: {minutes} min",
    "durationLabel": "Duración (s)",
    "timeRemaining": "Tiempo restante",
    "doneEarly": "Terminé antes",
    "durationSeconds": "s",
    "durationMinutes": "min",
    "durationHours": "hr",
    "tapToStart": "Toca para comenzar",
    "countdownComplete": "¡Se acabó el tiempo!",
    "tapDone": "Listo",
    "seriesBadge": "SERIE",
    "markSetDone": "Marcar serie como hecha",
    "targetReps": "Objetivo: {reps} repeticiones",
    "targetDuration": "Objetivo: {secs}s",
    "restTitle": "DESCANSO",
    "restSeconds": "SEGUNDOS",
    "startRest": "Iniciar descanso",
    "skipRest": "Saltar → Siguiente serie",
    "tabataBadge": "TABATA",
    "tabataRound": "Ronda {current} de {total}",
    "tabataExercise": "Ejercicio {current} de {total}",
    "stopAndNext": "Parar y siguiente ejercicio",
    "tabataStart": "Iniciar Tabata",
    "tabataPreviewParams": "{rounds} rondas · {work}s / {rest}s",
    "ready": {
      "exerciseCount": "{count} ejercicios · {sets} series",
      "tagline": "Preséntate. Dale duro.",
      "cta": "¡VAMOS!"
    }
  },
  "media": {
    "playVideo": "Reproducir video",
    "viewPhoto": "Ver foto",
    "downloadPdf": "Descargar PDF",
    "watchYoutube": "Ver en YouTube",
    "dragToReorder": "Arrastra para reordenar",
    "viewMedia": "Ver medios",
    "closeViewer": "Cerrar",
    "prevMedia": "Anterior",
    "nextMedia": "Siguiente",
    "mediaCount": "{current} de {total}",
    "tapToDownload": "Toca para descargar",
    "goToMedia": "Ir al medio {index}"
  },
  "progress": {
    "title": "Progreso",
    "selectTrainee": "Seleccionar un alumno",
    "weightChart": "Progresión de peso",
    "frequencyChart": "Frecuencia de entrenamiento",
    "caloriesChart": "Calorías por sesión",
    "noData": "Sin datos de entrenamiento aún para este alumno."
  },
  "errors": {
    "notFound": "No encontrado.",
    "serverError": "Error del servidor. Intenta de nuevo.",
    "validationError": "Entrada inválida. Revisa tus datos.",
    "deleteBlocked": "Este elemento no se puede eliminar porque está referenciado por datos existentes.",
    "mediaLimit": "Se alcanzó el límite máximo de medios (10) para este ejercicio."
  },
  "trainer": {
    "title": "Entrenador",
    "exercises": "Ejercicios",
    "exercisesDesc": "Crear y gestionar ejercicios",
    "plans": "Planes de entrenamiento",
    "plansDesc": "Crear y organizar planes de entrenamiento",
    "trainees": "Alumnos",
    "traineesDesc": "Gestionar perfiles de alumnos",
    "progress": "Progreso",
    "progressDesc": "Ver gráficos de progresión"
  },
  "exercises": {
    "title": "Ejercicios",
    "empty": "Sin ejercicios aún. Crea el primero.",
    "newExercise": "Nuevo ejercicio",
    "name": "Nombre",
    "description": "Descripción (opcional)",
    "trackingType": "Tipo de seguimiento",
    "trackingWeight": "Peso",
    "trackingTime": "Tiempo",
    "trackingNone": "Ninguno",
    "save": "Guardar",
    "saving": "Guardando…",
    "cancel": "Cancelar",
    "createError": "Error al crear ejercicio"
  },
  "exerciseDetail": {
    "name": "Nombre",
    "description": "Descripción",
    "trackingType": "Tipo de seguimiento",
    "trackingWeight": "Peso",
    "trackingTime": "Tiempo",
    "trackingNone": "Ninguno",
    "save": "Guardar",
    "saving": "Guardando…",
    "saveError": "Error al guardar",
    "delete": "Eliminar ejercicio",
    "confirmDelete": "Confirmar eliminación",
    "deleting": "Eliminando…",
    "cancel": "Cancelar",
    "deleteError": "Error al eliminar",
    "deleteBlockedError": "No se puede eliminar — el ejercicio está referenciado por registros de sesión",
    "media": "Medios"
  },
  "mediaManager": {
    "addMedia": "Agregar medio",
    "mediaType": "Tipo",
    "youtube": "YouTube",
    "video": "Video",
    "photo": "Foto",
    "pdf": "PDF",
    "add": "Agregar",
    "remove": "Eliminar",
    "limitReached": "Máximo de {max} elementos multimedia alcanzado",
    "addError": "Error al agregar medio",
    "deleteError": "Error al eliminar medio",
    "reorderError": "Error al reordenar medios"
  },
  "plans": {
    "title": "Planes de entrenamiento",
    "empty": "Sin planes aún. Crea el primero.",
    "newPlan": "Nuevo plan",
    "name": "Nombre",
    "description": "Descripción (opcional)",
    "save": "Guardar",
    "saving": "Guardando…",
    "cancel": "Cancelar",
    "createError": "Error al crear plan"
  },
  "planBuilder": {
    "addItem": "Agregar elemento",
    "removeItem": "Eliminar",
    "single": "Único",
    "series": "Serie ×{count}",
    "noItems": "Sin elementos aún. Agrega el primero.",
    "exerciseNLabel": "Ejercicio {n}",
    "exerciseNPlaceholder": "Ejercicio {n}",
    "sets": "Series",
    "reps": "Repeticiones",
    "duration": "Duración (s)",
    "save": "Guardar",
    "saving": "Guardando…",
    "cancel": "Cancelar",
    "exerciseRequired": "El ejercicio {n} es requerido",
    "addExercise": "+ Agregar ejercicio",
    "addItemError": "Error al agregar elemento",
    "tabataMode": "Modo Tabata",
    "workTime": "Tiempo de trabajo (seg)",
    "restTime": "Tiempo de descanso (seg)",
    "rounds": "Rondas",
    "tabataBadge": "TABATA · {count} ej · {sets} rondas · {work}s/{rest}s",
    "deleteItemError": "Error al eliminar elemento",
    "reorderError": "Error al reordenar elementos",
    "invalidTime": "Los tiempos de trabajo y descanso deben ser mayores que 0",
    "alternativeLabel": "Alternativo",
    "alternativeExercise": "Ejercicio alternativo",
    "alternativeSets": "Series alt.",
    "alternativeReps": "Reps. alt."
  },
  "home": {
    "greeting": "¿Quién entrena hoy?",
    "subtitle": "Elige tu nombre para comenzar.",
    "noTrainees": "No hay alumnos configurados aún. Habla con tu entrenador."
  },
  "traineeDashboard": {
    "lastSession": "Última sesión: {date}",
    "startTraining": "Comenzar entrenamiento",
    "noPlans": "No hay planes de entrenamiento disponibles aún.",
    "singleExercise": "Entrenar ejercicio único",
    "searchExercise": "Buscar ejercicio…"
  },
  "sessionRunner": {
    "itemProgress": "{current} de {total}",
    "allSetsDone": "Listo",
    "logError": "Error al registrar serie. Intenta de nuevo.",
    "viewMedia": "Ver medios",
    "navPrev": "Ejercicio anterior",
    "navNext": "Siguiente ejercicio",
    "completedLabel": "Completado",
    "lockedLabel": "Bloqueado",
    "lockedHint": "Termina el ejercicio actual para desbloquear",
    "loggedSetLabel": "Serie {number}",
    "loggedSetWeight": "{weight} kg × {reps} reps",
    "loggedSetDuration": "{seconds}s",
    "loggedSetReps": "{reps} reps",
    "reviewButton": "Revisar plan",
    "switchToAlternative": "Cambiar a alternativo"
  },
  "planReview": {
    "exerciseCount": "{count} ejercicios",
    "series": "Serie ×{count}",
    "close": "Cerrar"
  },
  "singleSession": {
    "setTarget": "Establece tu objetivo",
    "sets": "Series",
    "reps": "Repeticiones",
    "start": "Comenzar",
    "startError": "Error al iniciar sesión",
    "setLabel": "Serie {current} de {total}",
    "logError": "Error al registrar serie. Intenta de nuevo.",
    "duration": "Duración (s)",
    "viewMedia": "Ver medios",
    "durationSeconds": "s",
    "durationMinutes": "min",
    "durationHours": "hr"
  },
  "finish": {
    "title": "Sesión completa.",
    "subtitle": "Te presentaste. Eso cuenta.",
    "caloriesLabel": "Calorías quemadas (opcional)",
    "caloriesPlaceholder": "ej. 320",
    "caloriesHint": "Ingresa el valor de tu Apple Watch",
    "saveFinish": "Guardar y finalizar",
    "saving": "Guardando…",
    "saveError": "Error al guardar sesión"
  },
  "trainees": {
    "title": "Alumnos",
    "empty": "Sin alumnos aún.",
    "namePlaceholder": "Nombre completo",
    "emailPlaceholder": "Correo electrónico",
    "emailLabel": "Correo",
    "add": "Agregar",
    "adding": "Agregando…",
    "addError": "Error al agregar alumno",
    "save": "Guardar",
    "cancel": "Cancelar",
    "edit": "Editar",
    "delete": "Eliminar",
    "confirm": "Confirmar",
    "deleteLabel": "Eliminar {name}",
    "deleteError": "Error al eliminar",
    "deleteBlockedError": "No se puede eliminar — el alumno tiene sesiones de entrenamiento",
    "saveEditError": "Error al guardar"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/es.json
git commit -m "feat(i18n): add Spanish translations (es.json)"
```

---

### Task 2: Locale resolver util + updated request.ts

**Files:**
- Create: `src/i18n/locale-utils.ts`
- Modify: `src/i18n/request.ts`
- Test: `tests/unit/i18n/resolveLocale.test.ts`

**Interfaces:**
- Produces: `resolveLocale(cookieValue: string | undefined): 'en' | 'es'` — exported from `src/i18n/locale-utils.ts`
- Consumes: nothing (pure function, no imports)

- [ ] **Step 1: Create `tests/unit/i18n/resolveLocale.test.ts` (failing)**

```ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest --selectProjects unit -- tests/unit/i18n/resolveLocale.test.ts
```

Expected: FAIL — `Cannot find module '@/i18n/locale-utils'`

- [ ] **Step 3: Create `src/i18n/locale-utils.ts`**

```ts
export function resolveLocale(cookieValue: string | undefined): 'en' | 'es' {
  return cookieValue === 'en' ? 'en' : 'es'
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest --selectProjects unit -- tests/unit/i18n/resolveLocale.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Update `src/i18n/request.ts`**

Replace the entire file:

```ts
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
```

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locale-utils.ts src/i18n/request.ts tests/unit/i18n/resolveLocale.test.ts
git commit -m "feat(i18n): cookie-based locale resolution, default es"
```

---

### Task 3: setLocale Server Action

**Files:**
- Create: `src/app/actions/locale.ts`

**Interfaces:**
- Produces: `setLocale(locale: 'en' | 'es'): Promise<void>` — imported by `LanguageToggle` (Task 4)

Server Actions that only set a cookie have no meaningful unit test surface. E2E in Task 6 covers end-to-end correctness.

- [ ] **Step 1: Create `src/app/actions/locale.ts`**

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

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/locale.ts
git commit -m "feat(i18n): setLocale server action"
```

---

### Task 4: LanguageToggle component

**Files:**
- Create: `src/components/layout/LanguageToggle.tsx`
- Test: `tests/unit/components/LanguageToggle.test.tsx`

**Interfaces:**
- Consumes: `useLocale(): string` from `next-intl`, `useRouter()` from `next/navigation`, `setLocale` from `@/app/actions/locale`
- Produces: `<LanguageToggle />` — no props. Renders EN and ES buttons. Active locale button is disabled.

- [ ] **Step 1: Create `tests/unit/components/LanguageToggle.test.tsx` (failing)**

```tsx
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockSetLocale = jest.fn()
jest.mock('@/app/actions/locale', () => ({
  setLocale: mockSetLocale,
}))

jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
}))

import { useLocale } from 'next-intl'
import { LanguageToggle } from '@/components/layout/LanguageToggle'

describe('LanguageToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSetLocale.mockResolvedValue(undefined)
  })

  it('renders EN and ES buttons', () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument()
  })

  it('disables the active locale button', () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    expect(screen.getByRole('button', { name: 'ES' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'EN' })).not.toBeDisabled()
  })

  it('clicking EN when locale is es calls setLocale("en") then refresh', async () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    })
    expect(mockSetLocale).toHaveBeenCalledWith('en')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('clicking ES when locale is en calls setLocale("es") then refresh', async () => {
    ;(useLocale as jest.Mock).mockReturnValue('en')
    render(<LanguageToggle />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ES' }))
    })
    expect(mockSetLocale).toHaveBeenCalledWith('es')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('active locale button has visible border, inactive does not', () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    const esBtn = screen.getByRole('button', { name: 'ES' })
    const enBtn = screen.getByRole('button', { name: 'EN' })
    expect(esBtn.className).toContain('border')
    expect(enBtn.className).not.toContain('border')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest --selectProjects unit -- tests/unit/components/LanguageToggle.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/layout/LanguageToggle'`

- [ ] **Step 3: Create `src/components/layout/LanguageToggle.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest --selectProjects unit -- tests/unit/components/LanguageToggle.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LanguageToggle.tsx tests/unit/components/LanguageToggle.test.tsx
git commit -m "feat(i18n): LanguageToggle EN/ES pill component"
```

---

### Task 5: Wire LanguageToggle into Header + fix html lang attribute

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `<LanguageToggle />` from Task 4, `getLocale` from `next-intl/server`

- [ ] **Step 1: Update `src/components/layout/Header.tsx`**

Replace entire file:

```tsx
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
```

- [ ] **Step 2: Update `src/app/layout.tsx`**

Replace entire file:

```tsx
import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { ClerkProvider } from '@clerk/nextjs'
import { AppLayout } from '@/components/layout/AppLayout'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'FitFamily',
  description: 'Family fitness tracking',
  manifest: '/manifest.json',
  icons: {
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()])
  return (
    <ClerkProvider publishableKey={process.env.CLERK_PUBLISHABLE_KEY} signInUrl="/sign-in">
      <html lang={locale} className={`${manrope.variable} ${inter.variable}`}>
        <body>
          <NextIntlClientProvider messages={messages}>
            <AppLayout>
              {children}
            </AppLayout>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run lint**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx next lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/app/layout.tsx
git commit -m "feat(i18n): wire LanguageToggle into Header, dynamic html lang"
```

---

### Task 6: E2E locale toggle tests

**Files:**
- Test: `tests/e2e/locale.spec.ts`

The test page is `/access-denied` — public route (no auth required), rendered by `AppLayout` so the Header with the toggle is present. Spanish text: `"Acceso no concedido."` English text: `"Access not granted."` These come from the `auth.accessDeniedTitle` key.

**Before running E2E tests, rebuild the Docker image to pick up the new files:**
```bash
docker compose -f docker-compose.test.yml build
```

- [ ] **Step 1: Create `tests/e2e/locale.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('Locale toggle', () => {
  test('default locale is Spanish (no cookie)', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')
    await expect(page.getByText('Acceso no concedido.')).toBeVisible()
  })

  test('toggle EN switches UI to English', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')
    await expect(page.getByText('Acceso no concedido.')).toBeVisible()

    await page.getByRole('button', { name: 'EN' }).click()

    await expect(page.getByText('Access not granted.')).toBeVisible()
    await expect(page.getByText('Acceso no concedido.')).not.toBeVisible()
  })

  test('English locale persists on reload', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.getByText('Access not granted.')).toBeVisible()

    await page.reload()

    await expect(page.getByText('Access not granted.')).toBeVisible()
  })

  test('toggle ES switches back to Spanish', async ({ page, context }) => {
    await context.addCookies([{
      name: 'FITFAMILY_LOCALE',
      value: 'en',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/access-denied')
    await expect(page.getByText('Access not granted.')).toBeVisible()

    await page.getByRole('button', { name: 'ES' }).click()

    await expect(page.getByText('Acceso no concedido.')).toBeVisible()
    await expect(page.getByText('Access not granted.')).not.toBeVisible()
  })

  test('active locale button is disabled', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')

    const esButton = page.getByRole('button', { name: 'ES' })
    const enButton = page.getByRole('button', { name: 'EN' })

    await expect(esButton).toBeDisabled()
    await expect(enButton).toBeEnabled()
  })
})
```

- [ ] **Step 2: Rebuild Docker image**

```bash
docker compose -f docker-compose.test.yml build
```

- [ ] **Step 3: Run E2E locale tests**

```bash
~/.nvm/versions/node/v24.1.0/bin/npx playwright test tests/e2e/locale.spec.ts
```

Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/locale.spec.ts
git commit -m "test(e2e): locale toggle — default ES, persist on reload, switch EN/ES"
```
