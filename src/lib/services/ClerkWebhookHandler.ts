import { clerkClient } from '@clerk/nextjs/server'
import type { AllowedUserService } from './AllowedUserService'
import type { TraineeService } from './TraineeService'
import { logger } from '@/lib/logger'

export async function handleClerkUserCreated(
  userId: string,
  email: string,
  allowedUserService: AllowedUserService,
  traineeService: TraineeService,
): Promise<void> {
  const client = await clerkClient()
  const allowed = await allowedUserService.findByEmail(email)

  if (!allowed) {
    logger.warn({ service: 'ClerkWebhookHandler', operation: 'user.created', email, outcome: 'blocked' }, 'Email not in AllowedUser — deleting Clerk user')
    await client.users.deleteUser(userId)
    return
  }

  await client.users.updateUserMetadata(userId, { publicMetadata: { role: allowed.role } })
  logger.info({ service: 'ClerkWebhookHandler', operation: 'user.created', email, role: allowed.role, outcome: 'role-set' }, 'Role set on Clerk user')

  if (allowed.role === 'trainee') {
    await traineeService.linkClerkUserByEmail(email, userId)
    logger.info({ service: 'ClerkWebhookHandler', operation: 'user.created', email, outcome: 'linked' }, 'Clerk user linked to Trainee record')
  }
}
