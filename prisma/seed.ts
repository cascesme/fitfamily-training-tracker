import { PrismaPg } from '@prisma/adapter-pg'
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
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })
  runSeed(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
