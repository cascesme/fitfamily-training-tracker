import { TraineeService } from '@/lib/services/TraineeService'
import type { ITraineeRepository } from '@/lib/domain/trainee'
import { DeleteBlockedError, NotFoundError } from '@/lib/errors'

const mockRepo: jest.Mocked<ITraineeRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClerkUserId: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  createWithAllowedUser: jest.fn(),
  linkClerkUser: jest.fn(),
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
    it('creates trainee + allowedUser via createWithAllowedUser', async () => {
      mockRepo.createWithAllowedUser.mockResolvedValue(baseTrainee)
      const result = await service.create({ name: 'Alice', email: 'alice@example.com' })
      expect(mockRepo.createWithAllowedUser).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@example.com' })
      expect(result).toEqual(baseTrainee)
    })
  })

  describe('findByClerkUserId', () => {
    it('returns trainee when found', async () => {
      mockRepo.findByClerkUserId.mockResolvedValue(baseTrainee)
      const result = await service.findByClerkUserId('clerk_123')
      expect(result).toEqual(baseTrainee)
    })

    it('returns null when not found', async () => {
      mockRepo.findByClerkUserId.mockResolvedValue(null)
      const result = await service.findByClerkUserId('clerk_unknown')
      expect(result).toBeNull()
    })
  })

  describe('linkClerkUserByEmail', () => {
    it('links clerkUserId to trainee by email', async () => {
      mockRepo.linkClerkUser.mockResolvedValue(undefined)
      await service.linkClerkUserByEmail('alice@example.com', 'clerk_123')
      expect(mockRepo.linkClerkUser).toHaveBeenCalledWith('alice@example.com', 'clerk_123')
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
    })
  })
})
