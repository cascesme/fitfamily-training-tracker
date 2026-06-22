import { setupTestDb, teardownTestDb, TestDb } from '../helpers/db'
import { SessionLogRepository } from '@/lib/repositories/SessionLogRepository'

let db: TestDb
let repo: SessionLogRepository
let sessionId: string
let exerciseId: string

beforeAll(async () => {
  db = await setupTestDb()
  repo = new SessionLogRepository(db.prisma)
}, 60000)

afterAll(async () => { await teardownTestDb(db) })

beforeEach(async () => {
  const trainee = await db.prisma.trainee.create({ data: { name: 'T', email: 't@example.com' } })
  const session = await db.prisma.trainingSession.create({ data: { traineeId: trainee.id } })
  const exercise = await db.prisma.exercise.create({ data: { name: 'Bench', trackingType: 'WEIGHT' } })
  sessionId = session.id
  exerciseId = exercise.id
})

afterEach(async () => {
  await db.prisma.trainingSessionLog.deleteMany()
  await db.prisma.trainingSession.deleteMany()
  await db.prisma.exercise.deleteMany()
  await db.prisma.trainee.deleteMany()
})

describe('SessionLogRepository', () => {
  it('creates a log entry', async () => {
    const log = await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    expect(log.id).toBeDefined()
    expect(log.sessionId).toBe(sessionId)
    expect(log.exerciseId).toBe(exerciseId)
  })

  it('logs multiple sets for the same exercise', async () => {
    await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    await repo.create({ sessionId, exerciseId, setNumber: 2, weightKg: 82.5, repsDone: 8 })
    const logs = await repo.findBySession(sessionId)
    expect(logs).toHaveLength(2)
  })

  it('findBySessionAndExercise filters correctly', async () => {
    const other = await db.prisma.exercise.create({ data: { name: 'Row', trackingType: 'WEIGHT' } })
    await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    await repo.create({ sessionId, exerciseId: other.id, setNumber: 1, weightKg: 60, repsDone: 12 })
    const logs = await repo.findBySessionAndExercise(sessionId, exerciseId)
    expect(logs).toHaveLength(1)
    expect(logs[0].exerciseId).toBe(exerciseId)
  })

  it('findBySession returns all logs for the session', async () => {
    const other = await db.prisma.exercise.create({ data: { name: 'Curl', trackingType: 'WEIGHT' } })
    await repo.create({ sessionId, exerciseId, setNumber: 1, weightKg: 80, repsDone: 10 })
    await repo.create({ sessionId, exerciseId: other.id, setNumber: 1, weightKg: 20, repsDone: 15 })
    const logs = await repo.findBySession(sessionId)
    expect(logs).toHaveLength(2)
  })

  it('findBySessionAndExercise returns empty array when no matching logs', async () => {
    const logs = await repo.findBySessionAndExercise(sessionId, exerciseId)
    expect(logs).toHaveLength(0)
  })
})
