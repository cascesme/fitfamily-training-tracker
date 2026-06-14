import type { ITrainingPlanRepository, CreatePlanInput, UpdatePlanInput, TrainingPlan, TrainingPlanItem, TrainingPlanWithDetails } from '@/lib/domain/plan'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface PlanItemExerciseInput {
  exerciseId: string
  sets: number
  reps: number
  slot: number
}

export class TrainingPlanService {
  constructor(private repo: ITrainingPlanRepository) {}

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
  ): Promise<TrainingPlanItem> {
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId }, 'Adding item to plan')
    const hasSlot2 = exercises.some(e => e.slot === 2)
    const hasSlot1 = exercises.some(e => e.slot === 1)
    if (hasSlot2 && !hasSlot1) {
      logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked' }, 'Biseries slot 2 requires slot 1')
      throw new ValidationError('biseries slot 2 requires slot 1 to exist in the same item')
    }
    if (exercises.length === 2 && exercises[0].sets !== exercises[1].sets) {
      logger.warn(
        { service: 'TrainingPlanService', operation: 'addItem', entityId: planId, outcome: 'blocked', rule: 'biseries-equal-sets' },
        'Biseries rejected — unequal set counts',
      )
      throw new ValidationError('biseries exercises must have equal set counts')
    }
    const item = await this.repo.addItem(planId, position, exercises)
    logger.info({ service: 'TrainingPlanService', operation: 'addItem', entityId: item.id, outcome: 'created' }, 'Plan item added')
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
