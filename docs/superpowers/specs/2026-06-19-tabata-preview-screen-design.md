# Tabata Preview Screen

**Date:** 2026-06-19
**Branch:** cascesme/tabata-fixes-improvements

## Problem

When a trainee reaches a tabata plan item during a session, `TabataRunner` mounts and the timer starts immediately. The trainee has no chance to see the exercises or prepare before the countdown begins.

## Goal

Show a preview screen before every tabata block starts — listing all exercises with their media and a "Start Tabata" button. Timer only begins after the trainee explicitly taps Start.

Applies to every tabata item in a plan, not just the first one.

---

## Component Split

### `TabataPreviewScreen.tsx` (new)

Located at `src/components/TabataPreviewScreen.tsx`.

**Props:**
```ts
interface TabataPreviewScreenProps {
  exercises: TabataExercise[]
  totalRounds: number
  workTimeSecs: number
  restTimeSecs: number
  onStart: () => void
}
```

**Layout:**
- TABATA orange badge (`session.tabataBadge`)
- Params summary line: `"{rounds} rounds · {work}s / {rest}s"` (`session.tabataPreviewParams`)
- Scrollable exercise card list — each card shows exercise name + `MediaStrip` (existing component, zero extra API calls; exercises already carry `media: ExerciseMedia[]`)
- Sticky bottom: full-width primary "Start Tabata" button (`session.tabataStart`)

Follows existing dark theme: `bg-[#0A0A0A]`, cards with `1px solid rgba(255,255,255,0.08)`, primary accent `#E85D26` for badge and CTA.

### `TabataRunner.tsx` (modified)

Add `const [started, setStarted] = useState(false)`.

- When `!started`: render `<TabataPreviewScreen ... onStart={() => setStarted(true)} />`
- When `started`: render existing timer UI unchanged

**Timer guard:** Add `started` to Effect 1's dependency array and return early when `!started`:

```ts
useEffect(() => {
  if (!started) return
  // existing timer logic unchanged
}, [phase, exerciseIdx, round, started])
```

Effect 2 (timer expiry) is unaffected — `timeLeft` initialises to `workTimeSecs > 0` so it never fires during preview.

No changes to `PlanSessionRunner`. Since `PlanSessionRunner` remounts `TabataRunner` for each plan item, every tabata block naturally shows the preview screen first (`started` resets to `false` on each mount).

---

## i18n

Two new keys in the `session` namespace of `src/i18n/en.json`:

| Key | Value |
|-----|-------|
| `session.tabataStart` | `"Start Tabata"` |
| `session.tabataPreviewParams` | `"{rounds} rounds · {work}s / {rest}s"` |

---

## Data Flow

No new API calls. `TabataExercise[]` (including `media`) is already available at the call site in `PlanSessionRunner` where `TabataRunner` is mounted. `TabataPreviewScreen` receives it directly as a prop.

---

## Error Handling

No new error surface. Preview is pure synchronous UI. The existing guard in `PlanSessionRunner` (checks `workTimeSecs` and `restTimeSecs` exist before rendering `TabataRunner`) covers all invalid-state cases before the preview even mounts.

---

## Testing

### Unit (Jest + RTL)

New test file: `tests/unit/components/TabataPreviewScreen.test.tsx`

- Renders exercise names and `MediaStrip` for each exercise
- Calls `onStart` when "Start Tabata" button clicked
- Does not render timer elements

### E2E (Playwright)

Update existing tabata E2E spec (`tests/e2e/tabata.spec.ts`):

- Before asserting the timer, assert preview screen is visible: TABATA badge present, exercise names listed, "Start Tabata" button visible
- Click "Start Tabata"
- Assert timer ring appears and countdown begins

No new test files required; existing tabata trainer/trainee golden-path and failure-path tests are extended.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/TabataPreviewScreen.tsx` | New component |
| `src/components/TabataRunner.tsx` | Add `started` state + preview render |
| `src/i18n/en.json` | Two new i18n keys |
| `tests/unit/components/TabataPreviewScreen.test.tsx` | New unit test |
| `tests/e2e/tabata.spec.ts` | Update existing tests to click through preview |
