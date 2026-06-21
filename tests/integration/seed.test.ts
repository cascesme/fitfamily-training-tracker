import { setupTestDb, teardownTestDb, type TestDb } from './helpers/db'
import { runSeed } from '../../prisma/seed'

let db: TestDb

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb(db) })

describe('seed', () => {
  it('runs without error', async () => {
    await expect(runSeed(db.prisma)).resolves.toBeUndefined()
  })

  it('is idempotent — second run does not throw or duplicate', async () => {
    await runSeed(db.prisma)
    await runSeed(db.prisma)
    const count = await db.prisma.allowedUser.count()
    expect(count).toBe(1)
  })
})
