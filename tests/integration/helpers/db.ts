import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { execSync } from 'child_process'

export interface TestDb {
  prisma: PrismaClient
  container: StartedPostgreSqlContainer
}

export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start()
  const url = container.getConnectionUri()
  process.env.DATABASE_URL = url
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } })
  const adapter = new PrismaPg({ connectionString: url })
  const prisma = new PrismaClient({ adapter })
  return { prisma, container }
}

export async function teardownTestDb({ prisma, container }: TestDb) {
  await prisma.$disconnect()
  await container.stop()
}
