import type { IExerciseRepository, CreateExerciseInput, UpdateExerciseInput, Exercise } from '@/lib/domain/exercise'
import { NotFoundError, DeleteBlockedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export class ExerciseService {
  constructor(private repo: IExerciseRepository) {}

  list(): Promise<Exercise[]> {
    return this.repo.findAll()
  }

  findById(id: string): Promise<Exercise | null> {
    return this.repo.findById(id)
  }

  findWithMedia(id: string): Promise<Exercise | null> {
    return this.repo.findWithMedia(id)
  }

  async create(data: CreateExerciseInput): Promise<Exercise> {
    logger.info({ service: 'ExerciseService', operation: 'create' }, 'Creating exercise')
    const exercise = await this.repo.create(data)
    logger.info({ service: 'ExerciseService', operation: 'create', entityId: exercise.id, outcome: 'created' }, 'Exercise created')
    return exercise
  }

  async update(id: string, data: UpdateExerciseInput): Promise<Exercise> {
    logger.info({ service: 'ExerciseService', operation: 'update', entityId: id }, 'Updating exercise')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const updated = await this.repo.update(id, data)
    logger.info({ service: 'ExerciseService', operation: 'update', entityId: id, outcome: 'updated' }, 'Exercise updated')
    return updated
  }

  async delete(id: string): Promise<void> {
    logger.info({ service: 'ExerciseService', operation: 'delete', entityId: id }, 'Deleting exercise')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const hasLogs = await this.repo.hasSessionLogs(id)
    if (hasLogs) {
      logger.info({ service: 'ExerciseService', operation: 'delete', entityId: id, outcome: 'blocked' }, 'Delete blocked — exercise has session logs')
      throw new DeleteBlockedError(id, 'exercise has session logs')
    }
    await this.repo.delete(id)
    logger.info({ service: 'ExerciseService', operation: 'delete', entityId: id, outcome: 'deleted' }, 'Exercise deleted')
  }
}
