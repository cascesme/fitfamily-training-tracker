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
  execSync(`DATABASE_URL="${url}" /home/ccastro/.nvm/versions/node/v24.1.0/bin/npx prisma migrate deploy`, { stdio: 'inherit' })
  const adapter = new PrismaPg({ connectionString: url })
  const prisma = new PrismaClient({ adapter })
  return { prisma, container }
}

export async function teardownTestDb({ prisma, container }: TestDb) {
  await prisma.$disconnect()
  await container.stop()
}
