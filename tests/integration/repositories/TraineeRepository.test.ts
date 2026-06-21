import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
import { setupTestDb, teardownTestDb, type TestDb } from '../helpers/db'

let db: TestDb
let repo: TraineeRepository

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  repo = new TraineeRepository(db.prisma)
  await db.prisma.trainingSessionLog.deleteMany()
  await db.prisma.trainingSession.deleteMany()
  await db.prisma.trainee.deleteMany()
  await db.prisma.allowedUser.deleteMany()
})

describe('TraineeRepository', () => {
  it('creates a trainee', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    expect(t.id).toBeDefined()
    expect(t.name).toBe('Alice')
    expect(t.email).toBe('alice@example.com')
  })

  it('findAll returns all trainees', async () => {
    await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await repo.create({ name: 'Bob', email: 'bob@example.com' })
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('findById returns null when not found', async () => {
    expect(await repo.findById('nonexistent')).toBeNull()
  })

  it('update changes name', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    const updated = await repo.update(t.id, { name: 'Alicia' })
    expect(updated.name).toBe('Alicia')
  })

  it('delete removes trainee', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await repo.delete(t.id)
    expect(await repo.findById(t.id)).toBeNull()
  })

  it('hasSessions returns false when no sessions', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    expect(await repo.hasSessions(t.id)).toBe(false)
  })

  it('hasSessions returns true when sessions exist', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await db.prisma.trainingSession.create({
      data: { traineeId: t.id }
    })
    expect(await repo.hasSessions(t.id)).toBe(true)
  })

  it('createWithAllowedUser creates both Trainee and AllowedUser atomically', async () => {
    const t = await repo.createWithAllowedUser({ name: 'Charlie', email: 'charlie@example.com' })
    expect(t.email).toBe('charlie@example.com')
    const au = await db.prisma.allowedUser.findUnique({ where: { email: 'charlie@example.com' } })
    expect(au?.role).toBe('trainee')
  })

  it('createWithAllowedUser rolls back if email already exists in AllowedUser', async () => {
    await db.prisma.allowedUser.create({ data: { email: 'charlie@example.com', role: 'trainer' } })
    await expect(
      repo.createWithAllowedUser({ name: 'Charlie', email: 'charlie@example.com' })
    ).rejects.toThrow()
    const traineeCount = await db.prisma.trainee.count({ where: { email: 'charlie@example.com' } })
    expect(traineeCount).toBe(0)
  })

  it('findByClerkUserId returns trainee when clerkUserId matches', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await repo.linkClerkUser('alice@example.com', 'clerk_abc')
    const found = await repo.findByClerkUserId('clerk_abc')
    expect(found?.id).toBe(t.id)
  })

  it('findByClerkUserId returns null when not found', async () => {
    expect(await repo.findByClerkUserId('clerk_none')).toBeNull()
  })

  it('linkClerkUser sets clerkUserId on trainee', async () => {
    await repo.create({ name: 'Alice', email: 'alice@example.com' })
    await repo.linkClerkUser('alice@example.com', 'clerk_xyz')
    const found = await repo.findByEmail('alice@example.com')
    expect(found?.clerkUserId).toBe('clerk_xyz')
  })
})
