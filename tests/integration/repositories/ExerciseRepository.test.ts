import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { ExerciseRepository } from '@/lib/repositories/ExerciseRepository'

let db: TestDb
let repo: ExerciseRepository

beforeAll(async () => {
  db = await setupTestDb()
  repo = new ExerciseRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

afterEach(async () => {
  await db.prisma.exerciseMedia.deleteMany()
  await db.prisma.exercise.deleteMany()
})

describe('ExerciseRepository', () => {
  it('creates an exercise', async () => {
    const ex = await repo.create({ name: 'Squat', trackingType: 'WEIGHT' })
    expect(ex.id).toBeDefined()
    expect(ex.name).toBe('Squat')
  })

  it('findAll returns all exercises', async () => {
    await repo.create({ name: 'A', trackingType: 'WEIGHT' })
    await repo.create({ name: 'B', trackingType: 'NONE' })
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('nonexistent')
    expect(result).toBeNull()
  })

  it('update modifies fields', async () => {
    const ex = await repo.create({ name: 'Old', trackingType: 'WEIGHT' })
    const updated = await repo.update(ex.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('delete removes exercise', async () => {
    const ex = await repo.create({ name: 'ToDelete', trackingType: 'WEIGHT' })
    await repo.delete(ex.id)
    const found = await repo.findById(ex.id)
    expect(found).toBeNull()
  })

  it('hasSessionLogs returns false when no logs', async () => {
    const ex = await repo.create({ name: 'Clean', trackingType: 'WEIGHT' })
    const has = await repo.hasSessionLogs(ex.id)
    expect(has).toBe(false)
  })

  it('findWithMedia returns exercise with ordered media', async () => {
    const ex = await repo.create({ name: 'WithMedia', trackingType: 'WEIGHT' })
    await db.prisma.exerciseMedia.createMany({
      data: [
        { exerciseId: ex.id, type: 'PHOTO', position: 2, filePath: '/p2' },
        { exerciseId: ex.id, type: 'PHOTO', position: 1, filePath: '/p1' },
      ],
    })
    const result = await repo.findWithMedia(ex.id)
    expect(result?.media).toHaveLength(2)
    expect(result?.media?.[0].position).toBe(1)
  })
})
