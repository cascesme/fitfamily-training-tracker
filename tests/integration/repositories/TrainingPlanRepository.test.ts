import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { TrainingPlanRepository } from '@/lib/repositories/TrainingPlanRepository'

let db: TestDb
let repo: TrainingPlanRepository
let exerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new TrainingPlanRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const ex = await db.prisma.exercise.create({ data: { name: 'Squat', trackingType: 'WEIGHT' } })
  exerciseId = ex.id
})

afterEach(async () => {
  await db.prisma.trainingPlanItemExercise.deleteMany()
  await db.prisma.trainingPlanItem.deleteMany()
  await db.prisma.trainingPlan.deleteMany()
  await db.prisma.exercise.deleteMany()
})

describe('TrainingPlanRepository', () => {
  it('creates a plan', async () => {
    const plan = await repo.create({ name: 'Plan A' })
    expect(plan.id).toBeDefined()
    expect(plan.name).toBe('Plan A')
  })

  it('findAll returns all plans', async () => {
    await repo.create({ name: 'P1' })
    await repo.create({ name: 'P2' })
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('nope')
    expect(result).toBeNull()
  })

  it('update modifies plan name', async () => {
    const plan = await repo.create({ name: 'Old' })
    const updated = await repo.update(plan.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('delete removes plan', async () => {
    const plan = await repo.create({ name: 'Gone' })
    await repo.delete(plan.id)
    expect(await repo.findById(plan.id)).toBeNull()
  })

  it('addItem creates item with single exercise', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items).toHaveLength(1)
    expect(full?.items![0].exercises).toHaveLength(1)
    expect(full?.items![0].exercises![0].slot).toBe(1)
  })

  it('addItem creates biseries item with two exercises', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Lunge', trackingType: 'WEIGHT' } })
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [
      { exerciseId, sets: 3, reps: 10, slot: 1 },
      { exerciseId: ex2.id, sets: 3, reps: 12, slot: 2 },
    ])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items![0].exercises).toHaveLength(2)
  })

  it('findWithItems returns nested structure ordered by position', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 2, [{ exerciseId, sets: 2, reps: 8, slot: 1 }])
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items![0].position).toBe(1)
    expect(full?.items![1].position).toBe(2)
  })

  it('removeItem deletes item and its exercises', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items![0].id
    await repo.removeItem(itemId)
    const updated = await repo.findWithItems(plan.id)
    expect(updated?.items).toHaveLength(0)
  })

  it('reorderItems updates positions', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 2, reps: 5, slot: 1 }])
    await repo.addItem(plan.id, 2, [{ exerciseId, sets: 2, reps: 5, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const [item1, item2] = full!.items!
    await repo.reorderItems(plan.id, [
      { id: item1.id, position: 2 },
      { id: item2.id, position: 1 },
    ])
    const reordered = await repo.findWithItems(plan.id)
    expect(reordered!.items![0].id).toBe(item2.id)
  })

  it('findItemSlot returns exercise for matching slot', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items![0].id
    const result = await repo.findItemSlot(itemId, 1)
    expect(result).not.toBeNull()
    expect(result?.slot).toBe(1)
  })

  it('findItemSlot returns null for missing slot', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, slot: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items![0].id
    const result = await repo.findItemSlot(itemId, 2)
    expect(result).toBeNull()
  })
})
