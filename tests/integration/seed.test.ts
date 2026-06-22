import { setupTestDb, teardownTestDb, type TestDb } from './helpers/db'
import { runSeed } from '../../prisma/seed'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb(db) })

describe('seed', () => {
  const originalEnv = process.env.TRAINER_EMAILS
  afterEach(() => { process.env.TRAINER_EMAILS = originalEnv })

  it('runs without error', async () => {
    process.env.TRAINER_EMAILS = 'trainer@example.com'
    await expect(runSeed(db.prisma)).resolves.toBeUndefined()
  })

  it('is idempotent — second run does not throw or duplicate', async () => {
    process.env.TRAINER_EMAILS = 'trainer@example.com'
    await runSeed(db.prisma)
    await runSeed(db.prisma)
    const count = await db.prisma.allowedUser.count()
    expect(count).toBe(1)
  })

  it('seeds nothing when TRAINER_EMAILS is unset', async () => {
    delete process.env.TRAINER_EMAILS
    await db.prisma.allowedUser.deleteMany()
    await runSeed(db.prisma)
    const count = await db.prisma.allowedUser.count()
    expect(count).toBe(0)
  })
})
