# Users, Profiles & Authorization — Design Spec

**Date:** 2026-06-21
**Branch:** cascesme/users-profiles-authorization

---

## Overview

Add Clerk-based authentication to FitFamily. The app is going public; access is restricted to a pre-approved allowlist of emails managed in the database. Two roles exist: `trainer` (manages content, adds trainees) and `trainee` (runs sessions, views exercises). Role is fixed at sign-in — no toggling.

---

## Auth Provider: Clerk

Google-only social login via Clerk. Clerk handles OAuth flow, session management, and user storage. No passwords, no email sending, no user data managed in our DB beyond what's needed for app logic.

Clerk is chosen because:
- Zero user data management on our side
- First-class Next.js 15 App Router support
- Role stored in `publicMetadata` → included in JWT → zero DB query per request
- Google-only restricts login method surface area

---

## Architecture

### Sign-in Flow

1. Unauthenticated request → `clerkMiddleware()` → redirect `/sign-in`
2. User signs in with Google via Clerk
3. Clerk fires `user.created` webhook to `POST /api/webhooks/clerk`
4. Webhook handler:
   - Validates Clerk webhook signature (`svix` library)
   - Looks up email in `AllowedUser` table
   - **Found** → calls Clerk Backend API to set `publicMetadata.role = 'trainer' | 'trainee'`; if `role = 'trainee'`, also writes `clerkUserId` onto matching `Trainee` record (linked by email)
   - **Not found** → calls Clerk Backend API to delete the user; user is redirected to `/access-denied`
5. Subsequent requests: role read from `auth().sessionClaims.publicMetadata.role` (JWT claim, no DB hit)

### Webhook Security

Webhook endpoint validates `svix-id`, `svix-timestamp`, `svix-signature` headers using `CLERK_WEBHOOK_SECRET` env var. Invalid signatures return 400 immediately.

---

## Data Model

### New: `AllowedUser` table

```prisma
enum Role {
  trainer
  trainee
}

model AllowedUser {
  id        String   @id @default(cuid())
  email     String   @unique
  role      Role
  createdAt DateTime @default(now())
}
```

### Updated: `Trainee` model

Two new fields:

```prisma
model Trainee {
  id          String            @id @default(cuid())
  name        String
  email       String            @unique      // new
  clerkUserId String?           @unique      // new — set on first sign-in
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  sessions    TrainingSession[]
}
```

### Seed (`prisma/seed.ts`)

Trainer emails are hardcoded in the seed file, run once at deploy. Uses `skipDuplicates: true` — safe to re-run.

```ts
await prisma.allowedUser.createMany({
  data: [
    { email: 'trainer@example.com', role: 'trainer' },
  ],
  skipDuplicates: true,
})
```

### Trainee Creation (Trainer UI → DB)

When a trainer adds a trainee via the UI, a single service method writes both records in a Prisma transaction:
- `AllowedUser` (`email`, `role: 'trainee'`)
- `Trainee` (`name`, `email`)

If either write fails the whole transaction rolls back.

---

## Route Protection

`src/middleware.ts` using `clerkMiddleware()`:

| Route pattern | Rule |
|---|---|
| `/sign-in` | Public |
| `/access-denied` | Public |
| `/api/webhooks/clerk` | Public (Clerk calls unauthenticated) |
| `/trainer/**` | Auth + `role === 'trainer'`; trainee → redirect `/trainee` |
| `/trainee/**` | Auth + `role === 'trainee'`; trainer → redirect `/trainer` |
| `/api/**` (except webhook) | Auth required; trainer-only API routes return 403 for trainees |
| Everything else | Redirect `/sign-in` |

Roles are fully siloed: trainers can only access `/trainer/**`, trainees can only access `/trainee/**`. No cross-role browsing — trainers have no `Trainee` record so the trainee shell would have no data to show.

---

## UI Changes

### Removed

- **Trainee selector page** — identity comes from auth, no manual selection
- **Mode toggle button** in `AppLayout` — role is fixed, no switching
- **`ModeContext` / `ModeProvider`** — replaced by Clerk JWT role

### New Pages

- **`/sign-in`** — Clerk `<SignIn />` component, Google-only, dark-themed to match app
- **`/access-denied`** — static page: "Access not granted. Contact your trainer."

### Updated: `AppLayout`

Mode toggle replaced with Clerk `<UserButton />` (avatar + sign-out). Dark-themed to match `#0A0A0A` background.

### Trainer Shell

Navigation: Plans · Exercises · Trainees. Trainees list now shows `name` + `email` columns. Add-trainee form has `name` + `email` fields.

### Trainee Shell

Functionally unchanged. On load, resolves `Trainee` record via `clerkUserId` — all session/log data scoped automatically. No manual profile selection.

### API Routes

- Extract `auth().userId` from Clerk per request
- Trainer-only routes check `publicMetadata.role === 'trainer'` and return 403 via `handleError` otherwise
- Trainee-scoped data resolved by joining `clerkUserId` → `Trainee.id`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Unauthenticated request | Middleware → `/sign-in` |
| Email not in `AllowedUser` | Webhook deletes Clerk user → `/access-denied` |
| Trainee hits `/trainer/**` | Middleware → `/trainee` |
| Trainee calls trainer API | `handleError` → 403 |
| Invalid webhook signature | Return 400, no processing |
| `Trainee.clerkUserId` not yet set | Webhook links on first sign-in by email match |

---

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
```

---

## Testing

### Unit

- `AllowedUserService.create` — happy path; duplicate email is no-op (no error)
- `TraineeService.create` — writes both `AllowedUser` + `Trainee` in transaction; rolls back if either fails
- Seed function — runs twice without error (idempotent)

### Integration

- Webhook handler with valid signature + allowed email → role set on Clerk user + `clerkUserId` written to `Trainee`
- Webhook handler with valid signature + unknown email → Clerk user deleted
- Trainee CRUD — trainer creates trainee → both `AllowedUser` + `Trainee` records exist in DB

### E2E

- Non-allowed Google account → `/access-denied`
- Trainer signs in → trainer shell visible, no mode toggle
- Trainee signs in → trainee shell visible, sessions scoped to their profile
- Trainee navigates to `/trainer/exercises` directly → redirected to `/trainee`
- Trainer navigates to `/trainee` directly → redirected to `/trainer`
