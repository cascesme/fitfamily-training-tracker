import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { SessionRepository } from '@/lib/repositories/SessionRepository'

let db: TestDb
let repo: SessionRepository
let traineeId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new SessionRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const t = await db.prisma.trainee.create({ data: { name: 'Tester' } })
  traineeId = t.id
})

afterEach(async () => {
  await db.prisma.trainingSession.deleteMany()
  await db.prisma.trainee.deleteMany()
})

describe('SessionRepository', () => {
  it('creates a session for a trainee', async () => {
    const session = await repo.create({ traineeId })
    expect(session.id).toBeDefined()
    expect(session.traineeId).toBe(traineeId)
    expect(session.finishedAt).toBeNull()
  })

  it('creates a session with a planId', async () => {
    const plan = await db.prisma.trainingPlan.create({ data: { name: 'Plan' } })
    const session = await repo.create({ traineeId, planId: plan.id })
    expect(session.planId).toBe(plan.id)
  })

  it('finish updates finishedAt and caloriesBurned', async () => {
    const session = await repo.create({ traineeId })
    const finishedAt = new Date()
    const finished = await repo.finish(session.id, { finishedAt, caloriesBurned: 350 })
    expect(finished.finishedAt).toEqual(finishedAt)
    expect(finished.caloriesBurned).toBe(350)
  })

  it('findByTrainee returns only sessions for the specified trainee', async () => {
    const other = await db.prisma.trainee.create({ data: { name: 'Other' } })
    await repo.create({ traineeId })
    await repo.create({ traineeId })
    await repo.create({ traineeId: other.id })
    const sessions = await repo.findByTrainee(traineeId)
    expect(sessions).toHaveLength(2)
    sessions.forEach(s => expect(s.traineeId).toBe(traineeId))
  })

  it('findById returns null for unknown id', async () => {
    expect(await repo.findById('nope')).toBeNull()
  })

  it('findById returns the session', async () => {
    const session = await repo.create({ traineeId })
    const found = await repo.findById(session.id)
    expect(found?.id).toBe(session.id)
  })
})
