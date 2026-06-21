import { PrismaClient } from '@prisma/client'

// Replace these with real trainer emails before deploying
const TRAINER_EMAILS: string[] = [
  'trainer@example.com',
]

export async function runSeed(prisma: PrismaClient): Promise<void> {
  await prisma.allowedUser.createMany({
    data: TRAINER_EMAILS.map((email) => ({ email, role: 'trainer' as const })),
    skipDuplicates: true,
  })
}

if (require.main === module) {
  const prisma = new PrismaClient()
  runSeed(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
