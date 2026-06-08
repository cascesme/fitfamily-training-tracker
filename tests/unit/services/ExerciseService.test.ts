import { ExerciseService } from '@/lib/services/ExerciseService'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import { DeleteBlockedError, NotFoundError } from '@/lib/errors'

const mockRepo: jest.Mocked<IExerciseRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findWithMedia: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  hasSessionLogs: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new ExerciseService(mockRepo)

const baseExercise = {
  id: '1',
  name: 'Squat',
  trackingType: 'WEIGHT' as const,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ExerciseService', () => {
  describe('create', () => {
    it('creates exercise via repo', async () => {
      const input = { name: 'Squat', trackingType: 'WEIGHT' as const }
      mockRepo.create.mockResolvedValue(baseExercise)
      const result = await service.create(input)
      expect(mockRepo.create).toHaveBeenCalledWith(input)
      expect(result).toEqual(baseExercise)
    })
  })

  describe('list', () => {
    it('returns all exercises from repo', async () => {
      mockRepo.findAll.mockResolvedValue([baseExercise])
      const result = await service.list()
      expect(result).toHaveLength(1)
    })
  })

  describe('update', () => {
    it('updates exercise when found', async () => {
      const updated = { ...baseExercise, name: 'New' }
      mockRepo.findById.mockResolvedValue(baseExercise)
      mockRepo.update.mockResolvedValue(updated)
      const result = await service.update('1', { name: 'New' })
      expect(result.name).toBe('New')
    })

    it('throws NotFoundError when exercise does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.update('999', { name: 'New' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes exercise when no session logs', async () => {
      mockRepo.findById.mockResolvedValue(baseExercise)
      mockRepo.hasSessionLogs.mockResolvedValue(false)
      await service.delete('1')
      expect(mockRepo.delete).toHaveBeenCalledWith('1')
    })

    it('throws DeleteBlockedError when exercise has session logs', async () => {
      mockRepo.findById.mockResolvedValue(baseExercise)
      mockRepo.hasSessionLogs.mockResolvedValue(true)
      await expect(service.delete('1')).rejects.toThrow(DeleteBlockedError)
      expect(mockRepo.delete).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when exercise does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.delete('999')).rejects.toThrow(NotFoundError)
    })
  })
})
