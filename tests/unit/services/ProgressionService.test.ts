import { ProgressionService } from '@/lib/services/ProgressionService'
import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'

const mockSessionRepo: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  finish: jest.fn(),
  findByTrainee: jest.fn(),
  findById: jest.fn(),
  findWithLogs: jest.fn(),
}

const mockSessionLogRepo: jest.Mocked<ISessionLogRepository> = {
  create: jest.fn(),
  findBySessionAndExercise: jest.fn(),
  findBySession: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new ProgressionService(mockSessionRepo, mockSessionLogRepo)

const makeSession = (id: string, startedAt: Date) => ({
  id,
  traineeId: 'tr1',
  planId: null,
  startedAt,
  finishedAt: startedAt,
  caloriesBurned: null,
})

const makeLog = (sessionId: string, weightKg: number, repsDone: number) => ({
  id: `log-${sessionId}`,
  sessionId,
  exerciseId: 'e1',
  planItemId: null,
  setNumber: 1,
  weightKg,
  durationSecs: null,
  repsDone,
  completedAt: new Date(),
})

describe('ProgressionService', () => {
  describe('getExerciseProgression', () => {
    it('returns max weight per session sorted by date', async () => {
      const date1 = new Date('2026-01-01')
      const date2 = new Date('2026-01-08')
      mockSessionRepo.findByTrainee.mockResolvedValue([
        makeSession('s1', date1),
        makeSession('s2', date2),
      ])
      mockSessionLogRepo.findBySessionAndExercise
        .mockResolvedValueOnce([makeLog('s1', 80, 10), makeLog('s1', 82.5, 8)])
        .mockResolvedValueOnce([makeLog('s2', 85, 6)])

      const result = await service.getExerciseProgression('tr1', 'e1')
      expect(result).toHaveLength(2)
      expect(result[0].date).toEqual(date1)
      expect(result[0].weightKg).toBe(82.5)
      expect(result[1].weightKg).toBe(85)
    })

    it('returns empty array when trainee has no sessions', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([])
      const result = await service.getExerciseProgression('tr1', 'e1')
      expect(result).toHaveLength(0)
    })

    it('excludes sessions with no logs for the exercise', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([makeSession('s1', new Date())])
      mockSessionLogRepo.findBySessionAndExercise.mockResolvedValue([])
      const result = await service.getExerciseProgression('tr1', 'e1')
      expect(result).toHaveLength(0)
    })
  })

  describe('getSessionFrequency', () => {
    it('groups sessions by ISO week', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([
        makeSession('s1', new Date('2026-01-05')),
        makeSession('s2', new Date('2026-01-06')),
        makeSession('s3', new Date('2026-01-12')),
      ])
      const result = await service.getSessionFrequency('tr1')
      expect(result).toHaveLength(2)
      const week1 = result.find(r => r.count === 2)
      const week2 = result.find(r => r.count === 1)
      expect(week1).toBeDefined()
      expect(week2).toBeDefined()
    })

    it('returns empty array when trainee has no sessions', async () => {
      mockSessionRepo.findByTrainee.mockResolvedValue([])
      const result = await service.getSessionFrequency('tr1')
      expect(result).toHaveLength(0)
    })
  })
})
