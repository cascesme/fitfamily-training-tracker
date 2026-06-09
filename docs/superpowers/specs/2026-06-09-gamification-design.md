# Gamification — FitFamily Training Tracker

**Date:** 2026-06-09

---

## Context

The trainee session flow has no motivational moments — clicking a plan card immediately creates a DB session and drops into the workout. There is no pre-session gate, no mid-set feedback, and the finish screen is a minimal form. The goal is to add subtle, polished gamification (Framer Motion, adult tone, premium/Nike feel) at three touchpoints: session start, per-set completion, and session finish.

---

## Scope

Three touchpoints. No new routes, no new data, no streaks/stats.

| Touchpoint | Where | What changes |
|---|---|---|
| Pre-session ready screen | `PlanSessionRunner`, `ExerciseSessionRunner` | New `ready` phase before session creation |
| Per-set micro-feedback | `SetLogger` | Tap animation, set counter bounce, exercise-done glow |
| Finish screen | `FinishScreen` | Staggered entrance, new copy, checkmark icon |

---

## Approach

**Framer Motion** — declarative spring animations, `AnimatePresence` for enter/exit transitions, `whileTap` for tactile button feedback. Add as a new dependency. Verify latest stable version compatible with React 19 + Next.js 15 before installing.

---

## Detailed Design

### 1. Pre-session Ready Screen

**File:** `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

Add `phase: 'ready' | 'running'` state. On mount, start in `ready`. Session (`POST /api/sessions`) is called only when user taps "LET'S GO" — not on mount as today.

Layout (vertically centered, mobile-first):
- Back arrow top-left (`router.back()` — safe since no session created yet)
- Plan name — Manrope bold, large
- `"N exercises · M sets"` — muted secondary text
- Divider
- `"Show up. Push hard."` — italic, secondary color
- Full-width orange `"LET'S GO"` button (xl, bottom third)

Framer Motion:
- Whole container: `initial: { opacity: 0, y: 24 }` → `animate: { opacity: 1, y: 0 }`, easeOut, 300ms
- Button: `whileTap: { scale: 0.97 }` spring
- On tap: brief scale → create session → `AnimatePresence mode="wait"` transitions: ready fades out, then running fades in

**`ExerciseSessionRunner.tsx`** — the existing setup form (sets/reps inputs) stays unchanged. Only the setup→running phase transition gets animated: `AnimatePresence mode="wait"` wraps both phases so setup fades out before running fades in. No new ready screen for single exercises.

i18n keys (new):
- `session.ready.exerciseCount` — `"{count} exercises · {sets} sets"`
- `session.ready.tagline` — `"Show up. Push hard."`
- `session.ready.cta` — `"LET'S GO"`

---

### 2. Per-set Micro-feedback

**File:** `src/components/SetLogger.tsx`

Three layers of animation, all inline — no toasts, no modals:

1. **Button tap** — `motion.button` with `whileTap: { scale: 0.95 }` on "Mark Done" and "Done Early"

2. **Set counter bounce** — set number display wrapped in `AnimatePresence` keyed on set number. Each increment: old number exits upward (`y: -8, opacity: 0`), new number enters from below (`y: 8 → 0, opacity: 0 → 1`). Spring easing.

3. **Exercise-done glow** — when all sets for an exercise complete, the exercise row background animates: `rgba(232, 93, 38, 0) → rgba(232, 93, 38, 0.12) → rgba(232, 93, 38, 0)` over 600ms. One-shot `animate` sequence via Framer Motion keyframes.

---

### 3. Enhanced Finish Screen

**File:** `src/app/(trainee)/trainee/[traineeId]/finish/FinishScreen.tsx`

Staggered entrance on mount. Children animate in sequence with `staggerChildren: 0.08`:

```
✓ icon              ← fades in first (orange, 64px inline SVG)
Session Complete.   ← slides up 80ms later
You showed up. That counts.  ← slides up 160ms later
──────────────────────────
Calories Burned input   ← slides up 240ms later
Save & Finish button    ← slides up 320ms later
```

Each child: `initial: { opacity: 0, y: 16 }` → `animate: { opacity: 1, y: 0 }`, easeOut. Total entrance ~400ms.

Checkmark icon: inline SVG, 64px, orange (`#E85D26`). No new icon library.

Copy changes (i18n):
- `finish.title`: `"Session Complete."`
- `finish.subtitle`: `"You showed up. That counts."`

Calories input and Save flow unchanged.

---

## Files Modified

| File | Change |
|---|---|
| `package.json` | Add `framer-motion` (pin exact version after compatibility check) |
| `src/lib/animation.ts` | New — shared animation constants |
| `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx` | Add `ready` phase, Framer Motion entrance + button animations |
| `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx` | Animate setup→running phase transition only |
| `src/components/SetLogger.tsx` | `motion.button` on done buttons, set counter `AnimatePresence`, exercise-done glow |
| `src/app/(trainee)/trainee/[traineeId]/finish/FinishScreen.tsx` | Staggered entrance, checkmark icon, updated copy |
| `src/i18n/en.json` | Add `session.ready.*` keys, update `finish.title` / `finish.subtitle` |

---

## Animation Constants

`src/lib/animation.ts`:

```ts
export const fadeSlideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const springTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};
```

---

## Verification

1. `npm run dev` — run dev server
2. Navigate to trainee dashboard → click plan card → ready screen appears with entrance animation, "LET'S GO" has spring press, transitions to session
3. Log a set — button pulses on tap, counter bounces on increment, exercise row glows when all sets done
4. Complete final set — finish screen enters with staggered animation
5. `npm run typecheck` — no type errors
6. `npm run test:unit` — existing tests pass (no logic changed)
7. `npm run test:e2e` — existing E2E passes (UI flow unchanged, only visual layer added)
