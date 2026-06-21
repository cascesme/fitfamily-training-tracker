import { TraineeService } from '@/lib/services/TraineeService'
import type { ITraineeRepository } from '@/lib/domain/trainee'
import { DeleteBlockedError, NotFoundError } from '@/lib/errors'

const mockRepo: jest.Mocked<ITraineeRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  hasSessions: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new TraineeService(mockRepo)

const baseTrainee = {
  id: 't1',
  name: 'Alice',
  email: 'alice@example.com',
  clerkUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('TraineeService', () => {
  describe('create', () => {
    it('creates trainee via repo', async () => {
      mockRepo.create.mockResolvedValue(baseTrainee)
      const result = await service.create({ name: 'Alice', email: 'alice@example.com' })
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@example.com' })
      expect(result).toEqual(baseTrainee)
    })
  })

  describe('update', () => {
    it('updates trainee when found', async () => {
      const updated = { ...baseTrainee, name: 'Bob' }
      mockRepo.findById.mockResolvedValue(baseTrainee)
      mockRepo.update.mockResolvedValue(updated)
      const result = await service.update('t1', { name: 'Bob' })
      expect(result.name).toBe('Bob')
    })

    it('throws NotFoundError when trainee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.update('nope', { name: 'X' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('deletes trainee when no sessions exist', async () => {
      mockRepo.findById.mockResolvedValue(baseTrainee)
      mockRepo.hasSessions.mockResolvedValue(false)
      await service.delete('t1')
      expect(mockRepo.delete).toHaveBeenCalledWith('t1')
    })

    it('throws DeleteBlockedError when trainee has sessions', async () => {
      mockRepo.findById.mockResolvedValue(baseTrainee)
      mockRepo.hasSessions.mockResolvedValue(true)
      await expect(service.delete('t1')).rejects.toThrow(DeleteBlockedError)
      expect(mockRepo.delete).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when trainee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.delete('nope')).rejects.toThrow(NotFoundError)
    })
  })

  describe('findById', () => {
    it('throws NotFoundError when trainee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.findById('nope')).rejects.toThrow(NotFoundError)
    })

    it('returns trainee when found', async () => {
      mockRepo.findById.mockResolvedValue(baseTrainee)
      const result = await service.findById('t1')
      expect(result).toEqual(baseTrainee)
    })
  })
})
