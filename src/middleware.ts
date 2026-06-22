import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublic = createRouteMatcher([
  '/sign-in(.*)',
  '/access-denied',
  '/api/webhooks/clerk',
])

const isPending = createRouteMatcher(['/auth/pending'])
const isTrainerRoute = createRouteMatcher(['/trainer(.*)'])
const isTraineeRoute = createRouteMatcher(['/trainee(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return NextResponse.next()

  const { userId, sessionClaims } = await auth()

  if (isPending(req)) {
    if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))
    return NextResponse.next()
  }

  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))

  const role = sessionClaims?.publicMetadata?.role

  if (!role) return NextResponse.redirect(new URL('/auth/pending', req.url))

  if (isTrainerRoute(req) && role !== 'trainer') {
    return NextResponse.redirect(new URL('/trainee', req.url))
  }

  if (isTraineeRoute(req) && role !== 'trainee') {
    return NextResponse.redirect(new URL('/trainer', req.url))
  }

  return NextResponse.next()
}, {
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)',
  ],
}
