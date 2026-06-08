import type { IExerciseMediaRepository, IExerciseRepository } from '@/lib/domain/exercise'
import type { ExerciseMedia } from '@prisma/client'
import { NotFoundError, MediaLimitError } from '@/lib/errors'
import { MAX_EXERCISE_MEDIA } from '@/lib/domain/constants'
import { logger } from '@/lib/logger'

interface AddMediaInput {
  exerciseId: string
  type: 'VIDEO' | 'PHOTO' | 'PDF' | 'YOUTUBE'
  filePath?: string
  url?: string
  originalFilename?: string
}

export class ExerciseMediaService {
  constructor(
    private mediaRepo: IExerciseMediaRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async addMedia(input: AddMediaInput): Promise<ExerciseMedia> {
    logger.info({ service: 'ExerciseMediaService', operation: 'addMedia', entityId: input.exerciseId }, 'Adding media to exercise')
    const exercise = await this.exerciseRepo.findById(input.exerciseId)
    if (!exercise) throw new NotFoundError(input.exerciseId)

    const count = await this.mediaRepo.countByExercise(input.exerciseId)
    if (count >= MAX_EXERCISE_MEDIA) {
      logger.info({ service: 'ExerciseMediaService', operation: 'addMedia', entityId: input.exerciseId, outcome: 'blocked' }, 'Media limit reached')
      throw new MediaLimitError(input.exerciseId)
    }

    const existing = await this.mediaRepo.findByExercise(input.exerciseId)
    const nextPosition = existing.length > 0
      ? Math.max(...existing.map(m => m.position)) + 1
      : 1

    const media = await this.mediaRepo.create({ ...input, position: nextPosition })
    logger.info({ service: 'ExerciseMediaService', operation: 'addMedia', entityId: media.id, outcome: 'created' }, 'Media added')
    return media
  }

  async deleteMedia(id: string): Promise<void> {
    logger.info({ service: 'ExerciseMediaService', operation: 'deleteMedia', entityId: id }, 'Deleting media')
    await this.mediaRepo.delete(id)
    logger.info({ service: 'ExerciseMediaService', operation: 'deleteMedia', entityId: id, outcome: 'deleted' }, 'Media deleted')
  }

  async reorder(exerciseId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    logger.info({ service: 'ExerciseMediaService', operation: 'reorder', entityId: exerciseId }, 'Reordering media')
    await this.mediaRepo.reorder(exerciseId, positions)
  }
}
