import { TrainingPlanService } from '@/lib/services/TrainingPlanService'
import type { ITrainingPlanRepository } from '@/lib/domain/plan'
import { NotFoundError, ValidationError } from '@/lib/errors'

const mockRepo: jest.Mocked<ITrainingPlanRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findWithItems: jest.fn(),
  findForSession: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
  reorderItems: jest.fn(),
  findItemAtOrder: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new TrainingPlanService(mockRepo)

const basePlan = {
  id: 'p1',
  name: 'Push Day',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('TrainingPlanService', () => {
  describe('create', () => {
    it('creates plan via repo', async () => {
      mockRepo.create.mockResolvedValue(basePlan)
      const result = await service.create({ name: 'Push Day' })
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Push Day' })
      expect(result).toEqual(basePlan)
    })
  })

  describe('update', () => {
    it('throws NotFoundError when plan does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.update('nope', { name: 'X' })).rejects.toThrow(NotFoundError)
    })

    it('updates plan when found', async () => {
      const updated = { ...basePlan, name: 'Pull Day' }
      mockRepo.findById.mockResolvedValue(basePlan)
      mockRepo.update.mockResolvedValue(updated)
      const result = await service.update('p1', { name: 'Pull Day' })
      expect(result.name).toBe('Pull Day')
    })
  })

  describe('delete', () => {
    it('deletes plan via repo', async () => {
      mockRepo.findById.mockResolvedValue(basePlan)
      mockRepo.delete.mockResolvedValue(undefined)
      await service.delete('p1')
      expect(mockRepo.delete).toHaveBeenCalledWith('p1')
    })

    it('throws NotFoundError when plan does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.delete('nope')).rejects.toThrow(NotFoundError)
    })
  })

  const mockPlanItem = { id: 'item1', planId: 'p1', position: 1 }

  describe('addItem', () => {
    it('adds single exercise item without order validation', async () => {
      mockRepo.addItem.mockResolvedValue(mockPlanItem)
      await service.addItem('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }])
      expect(mockRepo.addItem).toHaveBeenCalledWith('p1', 1, [{ exerciseId: 'e1', sets: 3, reps: 10, order: 1 }])
    })

    it('allows series when order 1 and order 2 both present with equal sets', async () => {
      mockRepo.addItem.mockResolvedValue(mockPlanItem)
      await service.addItem('p1', 1, [
        { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'e2', sets: 3, reps: 10, order: 2 },
      ])
      expect(mockRepo.addItem).toHaveBeenCalled()
    })

    it('allows series with five exercises at equal sets and contiguous order', async () => {
      mockRepo.addItem.mockResolvedValue(mockPlanItem)
      await service.addItem('p1', 1, [1, 2, 3, 4, 5].map((order) => ({
        exerciseId: `e${order}`, sets: 3, reps: 10, order,
      })))
      expect(mockRepo.addItem).toHaveBeenCalled()
    })

    it('throws ValidationError when two exercises share the same order', async () => {
      await expect(
        service.addItem('p1', 1, [
          { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
          { exerciseId: 'e2', sets: 3, reps: 10, order: 1 },
        ])
      ).rejects.toThrow(ValidationError)
      expect(mockRepo.addItem).not.toHaveBeenCalled()
    })

    it('throws ValidationError when order values are not contiguous from 1', async () => {
      await expect(
        service.addItem('p1', 1, [
          { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
          { exerciseId: 'e2', sets: 3, reps: 10, order: 3 },
        ])
      ).rejects.toThrow(ValidationError)
      expect(mockRepo.addItem).not.toHaveBeenCalled()
    })

    it('throws ValidationError when series exercises have unequal set counts', async () => {
      await expect(
        service.addItem('p1', 1, [
          { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
          { exerciseId: 'e2', sets: 4, reps: 10, order: 2 },
        ])
      ).rejects.toThrow(ValidationError)
      expect(mockRepo.addItem).not.toHaveBeenCalled()
    })

    it('throws ValidationError when unequal sets appear among three or more exercises', async () => {
      await expect(
        service.addItem('p1', 1, [
          { exerciseId: 'e1', sets: 3, reps: 10, order: 1 },
          { exerciseId: 'e2', sets: 3, reps: 10, order: 2 },
          { exerciseId: 'e3', sets: 4, reps: 10, order: 3 },
        ])
      ).rejects.toThrow(ValidationError)
      expect(mockRepo.addItem).not.toHaveBeenCalled()
    })

    it('throws ValidationError when order 2 provided without order 1 in item', async () => {
      await expect(
        service.addItem('p1', 1, [{ exerciseId: 'e2', sets: 3, reps: 10, order: 2 }])
      ).rejects.toThrow(ValidationError)
      expect(mockRepo.addItem).not.toHaveBeenCalled()
    })
  })

  describe('removeItem', () => {
    it('delegates to repo.removeItem', async () => {
      mockRepo.removeItem.mockResolvedValue(undefined)
      await service.removeItem('item1')
      expect(mockRepo.removeItem).toHaveBeenCalledWith('item1')
    })
  })

  describe('reorderItems', () => {
    it('delegates to repo.reorderItems', async () => {
      mockRepo.reorderItems.mockResolvedValue(undefined)
      const positions = [{ id: 'i1', position: 2 }, { id: 'i2', position: 1 }]
      await service.reorderItems('p1', positions)
      expect(mockRepo.reorderItems).toHaveBeenCalledWith('p1', positions)
    })
  })
})
