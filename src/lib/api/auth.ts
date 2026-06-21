import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ForbiddenError } from '@/lib/errors'
import { traineeService } from './services'
import type { Trainee } from '@/lib/domain/trainee'

export async function requireTrainerRole(): Promise<void> {
  const { sessionClaims } = await auth()
  if (sessionClaims?.publicMetadata?.role !== 'trainer') {
    throw new ForbiddenError()
  }
}

export async function resolveAuthTrainee(): Promise<Trainee> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const trainee = await traineeService.findByClerkUserId(userId)
  if (!trainee) redirect('/access-denied')
  return trainee
}
