import { AllowedUserRepository } from '@/lib/repositories/AllowedUserRepository'
import { setupTestDb, teardownTestDb, type TestDb } from '../helpers/db'

let db: TestDb
let repo: AllowedUserRepository

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  repo = new AllowedUserRepository(db.prisma)
  await db.prisma.allowedUser.deleteMany()
})

describe('AllowedUserRepository', () => {
  it('creates an allowed user', async () => {
    const au = await repo.create({ email: 'alice@example.com', role: 'trainer' })
    expect(au.id).toBeDefined()
    expect(au.email).toBe('alice@example.com')
    expect(au.role).toBe('trainer')
  })

  it('findByEmail returns user when found', async () => {
    await repo.create({ email: 'alice@example.com', role: 'trainee' })
    const found = await repo.findByEmail('alice@example.com')
    expect(found?.email).toBe('alice@example.com')
  })

  it('findByEmail returns null when not found', async () => {
    const found = await repo.findByEmail('nobody@example.com')
    expect(found).toBeNull()
  })

  it('enforces unique email constraint', async () => {
    await repo.create({ email: 'alice@example.com', role: 'trainer' })
    await expect(repo.create({ email: 'alice@example.com', role: 'trainee' })).rejects.toThrow()
  })
})
