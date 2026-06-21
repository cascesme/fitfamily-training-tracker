import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
import { setupTestDb, teardownTestDb, type TestDb } from '../helpers/db'

let db: TestDb
let repo: TraineeRepository

beforeAll(async () => { db = await setupTestDb() })
afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  repo = new TraineeRepository(db.prisma)
  await db.prisma.trainee.deleteMany()
})

describe('TraineeRepository', () => {
  it('creates a trainee', async () => {
    const t = await repo.create({ name: 'Alice', email: 'alice@example.com' })
    expect(t.id).toBeDefined()
    expect(t.name).toBe('Alice')
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
})
