import { clerkClient } from '@clerk/nextjs/server'

// Roles live in Clerk publicMetadata but are NOT in the default session token,
// so read them from the Backend API to avoid stale-JWT issues after the webhook
// assigns a role on sign-up.
export async function getUserRole(userId: string): Promise<'trainer' | 'trainee' | undefined> {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role
}
