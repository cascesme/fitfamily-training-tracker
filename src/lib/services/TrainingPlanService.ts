import type { ITrainingPlanRepository, CreatePlanInput, UpdatePlanInput, TrainingPlan, TrainingPlanItem, TrainingPlanWithDetails } from '@/lib/domain/plan'
import type { IExerciseRepository } from '@/lib/domain/exercise'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface PlanItemExerciseInput {
  exerciseId: string
  sets: number
  reps: number
  order: number
  alternativeExerciseId?: string
  alternativeSets?: number
  alternativeReps?: number
}

export class TrainingPlanService {
  constructor(
    private repo: ITrainingPlanRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  list(): Promise<TrainingPlan[]> {
    return this.repo.findAll()
  }

  findById(id: string): Promise<TrainingPlan | null> {
    return this.repo.findById(id)
  }

  findWithItems(id: string): Promise<TrainingPlan | null> {
    return this.repo.findWithItems(id)
  }

  async findForSession(id: string): Promise<TrainingPlanWithDetails | null> {
    return this.repo.findForSession(id)
  }

  async create(data: CreatePlanInput): Promise<TrainingPlan> {
    logger.info({ service: 'TrainingPlanService', operation: 'create' }, 'Creating plan')
    const plan = await this.repo.create(data)
    logger.info({ service: 'TrainingPlanService', operation: 'create', entityId: plan.id, outcome: 'created' }, 'Plan created')
    return plan
  }

  async update(id: string, data: UpdatePlanInput): Promise<TrainingPlan> {
    logger.info({ service: 'TrainingPlanService', operation: 'update', entityId: id }, 'Updating plan')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const updated = await this.repo.update(id, data)
    logger.info({ service: 'TrainingPlanService', operation: 'update', entityId: id, outcome: 'updated' }, 'Plan updated')
    return updated
  }

  async delete(id: string): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'delete', entityId: id }, 'Deleting plan')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    await this.repo.delete(id)
    logger.info({ service: 'TrainingPlanService', operation: 'delete', entityId: id, outcome: 'deleted' }, 'Plan deleted')
  }

  async addItem(
    planId: string,
    position: number,
    exercises: PlanItemExerciseInput[],
    tabataConfig?: { workTimeSecs: number; restTimeSecs: number },
  ): Promise<TrainingPlanItem> {
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId }, 'Adding item to plan')

    const orders = exercises.map((e) => e.order).sort((a, b) => a - b)
    const isContiguous = orders.every((o, i) => o === i + 1)
    if (!isContiguous) {
      logger.warn(
        { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'series-order-contiguous' },
        'Series rejected — order values must be contiguous starting at 1',
      )
      throw new ValidationError('series exercises must have contiguous order starting at 1')
    }

    if (exercises.length > 1) {
      const allEqualSets = exercises.every((e) => e.sets === exercises[0].sets)
      if (!allEqualSets) {
        logger.warn(
          { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'series-equal-sets' },
          'Series rejected — unequal set counts',
        )
        throw new ValidationError('series exercises must have equal set counts')
      }
    }

    if (tabataConfig && exercises.length < 2) {
      logger.warn(
        { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'tabata-min-exercises' },
        'Tabata item rejected — requires at least 2 exercises',
      )
      throw new ValidationError('tabata requires at least 2 exercises')
    }

    for (const ex of exercises) {
      if (ex.alternativeExerciseId) {
        const altEx = await this.exerciseRepo.findById(ex.alternativeExerciseId)
        if (!altEx) {
          logger.warn(
            { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', alternativeExerciseId: ex.alternativeExerciseId },
            'Plan item rejected — alternative exercise not found',
          )
          throw new ValidationError(`Alternative exercise ${ex.alternativeExerciseId} not found`)
        }
      }
    }

    const item = await this.repo.addItem(planId, position, exercises, tabataConfig)
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: item.id, outcome: 'created', isTabata: tabataConfig != null, hasAlternative: exercises.some((e) => !!e.alternativeExerciseId) }, 'Plan item added')
    return item
  }

  async removeItem(itemId: string): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'removeItem', entityId: itemId }, 'Removing plan item')
    await this.repo.removeItem(itemId)
  }

  async reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    logger.info({ service: 'TrainingPlanService', operation: 'reorderItems', entityId: planId }, 'Reordering plan items')
    await this.repo.reorderItems(planId, positions)
  }
}
