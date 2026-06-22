import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { allowedUserService, traineeService } from '@/lib/api/services'
import { handleClerkUserCreated } from '@/lib/services/ClerkWebhookHandler'
import { logger } from '@/lib/logger'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    email_addresses: { id: string; email_address: string }[]
    primary_email_address_id: string
  }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    logger.error({ service: 'ClerkWebhook' }, 'CLERK_WEBHOOK_SECRET not set')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const payload = await req.text()
  const headerList = await headers()
  const svixHeaders = {
    'svix-id': headerList.get('svix-id') ?? '',
    'svix-timestamp': headerList.get('svix-timestamp') ?? '',
    'svix-signature': headerList.get('svix-signature') ?? '',
  }

  let event: ClerkUserCreatedEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(payload, svixHeaders) as ClerkUserCreatedEvent
  } catch {
    logger.warn({ service: 'ClerkWebhook' }, 'Invalid webhook signature')
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type !== 'user.created') {
    return new Response('OK', { status: 200 })
  }

  const primaryEmail = event.data.email_addresses.find(
    (e) => e.id === event.data.primary_email_address_id,
  )?.email_address

  if (!primaryEmail) {
    logger.warn({ service: 'ClerkWebhook', userId: event.data.id }, 'No primary email on user.created')
    return new Response('No email', { status: 400 })
  }

  await handleClerkUserCreated(event.data.id, primaryEmail, allowedUserService, traineeService)
  return new Response('OK', { status: 200 })
}
