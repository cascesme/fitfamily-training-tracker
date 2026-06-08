import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { ExerciseMediaRepository } from '@/lib/repositories/ExerciseMediaRepository'

let db: TestDb
let repo: ExerciseMediaRepository
let exerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new ExerciseMediaRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const ex = await db.prisma.exercise.create({
    data: { name: 'TestEx', trackingType: 'WEIGHT' },
  })
  exerciseId = ex.id
})

afterEach(async () => {
  await db.prisma.exerciseMedia.deleteMany()
  await db.prisma.exercise.deleteMany()
})

describe('ExerciseMediaRepository', () => {
  it('creates media for an exercise', async () => {
    const media = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/img.jpg', position: 1 })
    expect(media.id).toBeDefined()
    expect(media.exerciseId).toBe(exerciseId)
  })

  it('countByExercise returns correct count', async () => {
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/a', position: 1 })
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/b', position: 2 })
    const count = await repo.countByExercise(exerciseId)
    expect(count).toBe(2)
  })

  it('countByExercise returns 0 when no media', async () => {
    const count = await repo.countByExercise(exerciseId)
    expect(count).toBe(0)
  })

  it('findByExercise returns media ordered by position', async () => {
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/b', position: 2 })
    await repo.create({ exerciseId, type: 'PHOTO', filePath: '/a', position: 1 })
    const items = await repo.findByExercise(exerciseId)
    expect(items[0].position).toBe(1)
    expect(items[1].position).toBe(2)
  })

  it('delete removes media', async () => {
    const media = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/img', position: 1 })
    await repo.delete(media.id)
    const remaining = await repo.findByExercise(exerciseId)
    expect(remaining).toHaveLength(0)
  })

  it('reorder swaps positions correctly', async () => {
    const m1 = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/a', position: 1 })
    const m2 = await repo.create({ exerciseId, type: 'PHOTO', filePath: '/b', position: 2 })
    await repo.reorder(exerciseId, [
      { id: m1.id, position: 2 },
      { id: m2.id, position: 1 },
    ])
    const items = await repo.findByExercise(exerciseId)
    expect(items[0].id).toBe(m2.id)
    expect(items[1].id).toBe(m1.id)
  })
})
