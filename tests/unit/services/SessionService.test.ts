import { SessionService } from '@/lib/services/SessionService'
import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'

const mockSessionRepo: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  finish: jest.fn(),
  findByTrainee: jest.fn(),
  findLastByTrainee: jest.fn(),
  findById: jest.fn(),
  findWithLogs: jest.fn(),
}

const mockSessionLogRepo: jest.Mocked<ISessionLogRepository> = {
  create: jest.fn(),
  findBySessionAndExercise: jest.fn(),
  findBySession: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new SessionService(mockSessionRepo, mockSessionLogRepo)

const baseSession = {
  id: 's1',
  traineeId: 'tr1',
  planId: null,
  startedAt: new Date(),
  finishedAt: null,
  caloriesBurned: null,
}

const baseLog = {
  id: 'log1',
  sessionId: 's1',
  exerciseId: 'e1',
  planItemId: null,
  setNumber: 1,
  weightKg: 80,
  durationSecs: null,
  repsDone: 10,
  completedAt: new Date(),
}

describe('SessionService', () => {
  describe('startPlanSession', () => {
    it('creates session with planId', async () => {
      const withPlan = { ...baseSession, planId: 'p1' }
      mockSessionRepo.create.mockResolvedValue(withPlan)
      const result = await service.startPlanSession('tr1', 'p1')
      expect(mockSessionRepo.create).toHaveBeenCalledWith({ traineeId: 'tr1', planId: 'p1' })
      expect(result.planId).toBe('p1')
    })
  })

  describe('startExerciseSession', () => {
    it('creates session without planId', async () => {
      mockSessionRepo.create.mockResolvedValue(baseSession)
      const result = await service.startExerciseSession('tr1')
      expect(mockSessionRepo.create).toHaveBeenCalledWith({ traineeId: 'tr1' })
      expect(result.planId).toBeNull()
    })
  })

  describe('logSet', () => {
    it('calls sessionLogRepo.create with correct data', async () => {
      mockSessionLogRepo.create.mockResolvedValue(baseLog)
      const input = { exerciseId: 'e1', setNumber: 1, weightKg: 80, repsDone: 10 }
      const result = await service.logSet('s1', input)
      expect(mockSessionLogRepo.create).toHaveBeenCalledWith({ sessionId: 's1', ...input })
      expect(result).toEqual(baseLog)
    })
  })

  describe('finishSession', () => {
    it('calls sessionRepo.finish with finishedAt', async () => {
      const finishedAt = new Date()
      const finished = { ...baseSession, finishedAt, caloriesBurned: 300 }
      mockSessionRepo.finish.mockResolvedValue(finished)
      const result = await service.finishSession('s1', { finishedAt, caloriesBurned: 300 })
      expect(mockSessionRepo.finish).toHaveBeenCalledWith('s1', { finishedAt, caloriesBurned: 300 })
      expect(result.finishedAt).toEqual(finishedAt)
    })
  })
})
