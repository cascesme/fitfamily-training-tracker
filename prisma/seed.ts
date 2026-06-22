import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Trainer emails come from the TRAINER_EMAILS env var (comma-separated),
// so the image stays generic and operators set their own.
function parseTrainerEmails(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function runSeed(prisma: PrismaClient): Promise<void> {
  const emails = parseTrainerEmails(process.env.TRAINER_EMAILS)
  if (emails.length === 0) {
    console.warn('TRAINER_EMAILS not set — no trainer AllowedUser rows seeded')
    return
  }
  await prisma.allowedUser.createMany({
    data: emails.map((email) => ({ email, role: 'trainer' as const })),
    skipDuplicates: true,
  })
  console.log(`Seeded ${emails.length} trainer allowed-user row(s)`)
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
