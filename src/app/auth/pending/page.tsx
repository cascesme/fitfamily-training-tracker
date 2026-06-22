import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { traineeService } from '@/lib/api/services'
import { getUserRole } from '@/lib/api/role'
import { PendingClient } from './PendingClient'

export default async function PendingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getUserRole(userId)
  if (role === 'trainer') redirect('/trainer')
  if (role === 'trainee') {
    const trainee = await traineeService.findByClerkUserId(userId)
    if (trainee) redirect(`/trainee/${trainee.id}`)
    redirect('/access-denied')
  }

  return <PendingClient />
}
