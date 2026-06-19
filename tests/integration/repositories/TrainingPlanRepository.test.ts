import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { TrainingPlanRepository } from '@/lib/repositories/TrainingPlanRepository'

let db: TestDb
let repo: TrainingPlanRepository
let exerciseId: string
let altExerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new TrainingPlanRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const ex = await db.prisma.exercise.create({ data: { name: 'Squat', trackingType: 'WEIGHT' } })
  exerciseId = ex.id
  const alt = await db.prisma.exercise.create({ data: { name: 'Leg Press', trackingType: 'WEIGHT' } })
  altExerciseId = alt.id
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
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items).toHaveLength(1)
    expect(full?.items![0].exercises).toHaveLength(1)
    expect(full?.items![0].exercises![0].order).toBe(1)
  })

  it('addItem creates series item with two exercises', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Lunge', trackingType: 'WEIGHT' } })
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [
      { exerciseId, sets: 3, reps: 10, order: 1 },
      { exerciseId: ex2.id, sets: 3, reps: 12, order: 2 },
    ])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items![0].exercises).toHaveLength(2)
  })

  it('addItem creates series item with five exercises', async () => {
    const others = await Promise.all(
      [2, 3, 4, 5].map((n) => db.prisma.exercise.create({ data: { name: `Ex${n}`, trackingType: 'WEIGHT' } })),
    )
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [
      { exerciseId, sets: 3, reps: 10, order: 1 },
      ...others.map((ex, i) => ({ exerciseId: ex.id, sets: 3, reps: 10, order: i + 2 })),
    ])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items![0].exercises).toHaveLength(5)
  })

  it('findWithItems returns nested structure ordered by position', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 2, [{ exerciseId, sets: 2, reps: 8, order: 1 }])
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    expect(full?.items![0].position).toBe(1)
    expect(full?.items![1].position).toBe(2)
  })

  it('removeItem deletes item and its exercises', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items![0].id
    await repo.removeItem(itemId)
    const updated = await repo.findWithItems(plan.id)
    expect(updated?.items).toHaveLength(0)
  })

  it('reorderItems updates positions', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 2, reps: 5, order: 1 }])
    await repo.addItem(plan.id, 2, [{ exerciseId, sets: 2, reps: 5, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const [item1, item2] = full!.items!
    await repo.reorderItems(plan.id, [
      { id: item1.id, position: 2 },
      { id: item2.id, position: 1 },
    ])
    const reordered = await repo.findWithItems(plan.id)
    expect(reordered!.items![0].id).toBe(item2.id)
  })

  it('findItemAtOrder returns exercise for matching order', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items![0].id
    const result = await repo.findItemAtOrder(itemId, 1)
    expect(result).not.toBeNull()
    expect(result?.order).toBe(1)
  })

  it('findItemAtOrder returns null for missing order', async () => {
    const plan = await repo.create({ name: 'P' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const itemId = full!.items![0].id
    const result = await repo.findItemAtOrder(itemId, 2)
    expect(result).toBeNull()
  })

  it('addItem persists tabata config on item', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Pull Ups', trackingType: 'NONE' } })
    const plan = await repo.create({ name: 'Tabata Plan' })
    await repo.addItem(
      plan.id, 1,
      [
        { exerciseId, sets: 8, reps: 0, order: 1 },
        { exerciseId: ex2.id, sets: 8, reps: 0, order: 2 },
      ],
      { workTimeSecs: 20, restTimeSecs: 10 },
    )
    const full = await repo.findWithItems(plan.id)
    const item = full?.items![0]
    expect(item?.isTabata).toBe(true)
    expect(item?.workTimeSecs).toBe(20)
    expect(item?.restTimeSecs).toBe(10)
    expect(item?.exercises).toHaveLength(2)
  })

  it('addItem stores isTabata=false and nulls for non-tabata item', async () => {
    const plan = await repo.create({ name: 'Normal Plan' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const item = full?.items![0]
    expect(item?.isTabata).toBe(false)
    expect(item?.workTimeSecs).toBeNull()
    expect(item?.restTimeSecs).toBeNull()
  })

  it('findForSession returns tabata fields on items', async () => {
    const ex2 = await db.prisma.exercise.create({ data: { name: 'Burpees', trackingType: 'NONE' } })
    const plan = await repo.create({ name: 'Tabata Session Plan' })
    await repo.addItem(
      plan.id, 1,
      [
        { exerciseId, sets: 4, reps: 0, order: 1 },
        { exerciseId: ex2.id, sets: 4, reps: 0, order: 2 },
      ],
      { workTimeSecs: 30, restTimeSecs: 15 },
    )
    const result = await repo.findForSession(plan.id)
    expect(result?.items[0].isTabata).toBe(true)
    expect(result?.items[0].workTimeSecs).toBe(30)
    expect(result?.items[0].restTimeSecs).toBe(15)
  })

  it('addItem stores alternative exercise columns', async () => {
    const plan = await repo.create({ name: 'Alt Plan' })
    await repo.addItem(plan.id, 1, [{
      exerciseId, sets: 3, reps: 10, order: 1,
      alternativeExerciseId: altExerciseId, alternativeSets: 3, alternativeReps: 8,
    }])
    const full = await repo.findWithItems(plan.id)
    const ex = full!.items![0].exercises![0] as any
    expect(ex.alternativeExerciseId).toBe(altExerciseId)
    expect(ex.alternativeSets).toBe(3)
    expect(ex.alternativeReps).toBe(8)
  })

  it('addItem sets alternative columns to null when not provided', async () => {
    const plan = await repo.create({ name: 'No Alt Plan' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const full = await repo.findWithItems(plan.id)
    const ex = full!.items![0].exercises![0] as any
    expect(ex.alternativeExerciseId).toBeNull()
    expect(ex.alternativeSets).toBeNull()
    expect(ex.alternativeReps).toBeNull()
  })

  it('findForSession hydrates alternativeExercise with media', async () => {
    const plan = await repo.create({ name: 'Hydrate Alt Plan' })
    await repo.addItem(plan.id, 1, [{
      exerciseId, sets: 3, reps: 10, order: 1,
      alternativeExerciseId: altExerciseId, alternativeSets: 3, alternativeReps: 8,
    }])
    const result = await repo.findForSession(plan.id)
    const ex = result?.items[0].exercises[0]
    expect(ex?.alternativeExercise).not.toBeNull()
    expect(ex?.alternativeExercise?.id).toBe(altExerciseId)
    expect(ex?.alternativeExercise?.name).toBe('Leg Press')
    expect(Array.isArray(ex?.alternativeExercise?.media)).toBe(true)
  })

  it('findForSession returns null alternativeExercise when not set', async () => {
    const plan = await repo.create({ name: 'No Alt Session Plan' })
    await repo.addItem(plan.id, 1, [{ exerciseId, sets: 3, reps: 10, order: 1 }])
    const result = await repo.findForSession(plan.id)
    const ex = result?.items[0].exercises[0]
    expect(ex?.alternativeExercise).toBeNull()
  })
})
