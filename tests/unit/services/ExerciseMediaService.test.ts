import { ExerciseMediaService } from '@/lib/services/ExerciseMediaService'
import type { IExerciseMediaRepository } from '@/lib/domain/exercise'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import { MediaLimitError, NotFoundError } from '@/lib/errors'
import { MAX_EXERCISE_MEDIA } from '@/lib/domain/constants'

const mockMediaRepo: jest.Mocked<IExerciseMediaRepository> = {
  create: jest.fn(),
  delete: jest.fn(),
  countByExercise: jest.fn(),
  reorder: jest.fn(),
  findByExercise: jest.fn(),
}

const mockExerciseRepo: jest.Mocked<IExerciseRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findWithMedia: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  hasSessionLogs: jest.fn(),
}

beforeEach(() => { jest.clearAllMocks() })

const service = new ExerciseMediaService(mockMediaRepo, mockExerciseRepo)

const baseExercise = {
  id: 'ex1',
  name: 'Squat',
  trackingType: 'WEIGHT' as const,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseMedia = {
  id: 'm1',
  exerciseId: 'ex1',
  type: 'PHOTO' as const,
  filePath: '/img.jpg',
  url: null,
  originalFilename: null,
  position: 1,
  createdAt: new Date(),
}

describe('ExerciseMediaService', () => {
  describe('addMedia', () => {
    it('adds media when count is below limit', async () => {
      mockExerciseRepo.findById.mockResolvedValue(baseExercise)
      mockMediaRepo.countByExercise.mockResolvedValue(3)
      mockMediaRepo.findByExercise.mockResolvedValue([])
      mockMediaRepo.create.mockResolvedValue(baseMedia)
      const result = await service.addMedia({ exerciseId: 'ex1', type: 'PHOTO', filePath: '/img.jpg' })
      expect(mockMediaRepo.create).toHaveBeenCalled()
      expect(result).toEqual(baseMedia)
    })

    it('throws MediaLimitError when count is at limit', async () => {
      mockExerciseRepo.findById.mockResolvedValue(baseExercise)
      mockMediaRepo.countByExercise.mockResolvedValue(MAX_EXERCISE_MEDIA)
      await expect(
        service.addMedia({ exerciseId: 'ex1', type: 'PHOTO', filePath: '/img.jpg' })
      ).rejects.toThrow(MediaLimitError)
      expect(mockMediaRepo.create).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when exercise does not exist', async () => {
      mockExerciseRepo.findById.mockResolvedValue(null)
      await expect(
        service.addMedia({ exerciseId: 'nope', type: 'PHOTO', filePath: '/img.jpg' })
      ).rejects.toThrow(NotFoundError)
    })

    it('computes next position as max existing position + 1', async () => {
      mockExerciseRepo.findById.mockResolvedValue(baseExercise)
      mockMediaRepo.countByExercise.mockResolvedValue(2)
      mockMediaRepo.findByExercise.mockResolvedValue([
        { ...baseMedia, position: 1 },
        { ...baseMedia, id: 'm2', position: 2 },
      ])
      mockMediaRepo.create.mockResolvedValue({ ...baseMedia, position: 3 })
      await service.addMedia({ exerciseId: 'ex1', type: 'PHOTO', filePath: '/img.jpg' })
      expect(mockMediaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 })
      )
    })
  })

  describe('deleteMedia', () => {
    it('calls repo.delete with the media id', async () => {
      mockMediaRepo.delete.mockResolvedValue(undefined)
      await service.deleteMedia('m1')
      expect(mockMediaRepo.delete).toHaveBeenCalledWith('m1')
    })
  })

  describe('reorder', () => {
    it('delegates to repo.reorder', async () => {
      mockMediaRepo.reorder.mockResolvedValue(undefined)
      const positions = [{ id: 'm1', position: 2 }, { id: 'm2', position: 1 }]
      await service.reorder('ex1', positions)
      expect(mockMediaRepo.reorder).toHaveBeenCalledWith('ex1', positions)
    })
  })
})
