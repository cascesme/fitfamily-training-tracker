import { AllowedUserService } from '@/lib/services/AllowedUserService'
import type { IAllowedUserRepository } from '@/lib/domain/allowedUser'

const mockRepo: jest.Mocked<IAllowedUserRepository> = {
  findByEmail: jest.fn(),
  create: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new AllowedUserService(mockRepo)

const baseAllowedUser = {
  id: 'au1',
  email: 'alice@example.com',
  role: 'trainer' as const,
  createdAt: new Date(),
}

describe('AllowedUserService', () => {
  describe('findByEmail', () => {
    it('returns allowed user when found', async () => {
      mockRepo.findByEmail.mockResolvedValue(baseAllowedUser)
      const result = await service.findByEmail('alice@example.com')
      expect(result).toEqual(baseAllowedUser)
    })

    it('returns null when not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null)
      const result = await service.findByEmail('unknown@example.com')
      expect(result).toBeNull()
    })
  })
})
