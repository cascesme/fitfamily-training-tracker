import type { ITraineeRepository, CreateTraineeInput, UpdateTraineeInput, Trainee } from '@/lib/domain/trainee'
import { NotFoundError, DeleteBlockedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export class TraineeService {
  constructor(private repo: ITraineeRepository) {}

  list(): Promise<Trainee[]> {
    return this.repo.findAll()
  }

  async findById(id: string): Promise<Trainee> {
    const trainee = await this.repo.findById(id)
    if (!trainee) throw new NotFoundError(id)
    return trainee
  }

  findByClerkUserId(clerkUserId: string): Promise<Trainee | null> {
    return this.repo.findByClerkUserId(clerkUserId)
  }

  async create(data: CreateTraineeInput): Promise<Trainee> {
    logger.info({ service: 'TraineeService', operation: 'create' }, 'Creating trainee')
    const trainee = await this.repo.createWithAllowedUser(data)
    logger.info({ service: 'TraineeService', operation: 'create', entityId: trainee.id, outcome: 'created' }, 'Trainee created')
    return trainee
  }

  async linkClerkUserByEmail(email: string, clerkUserId: string): Promise<void> {
    logger.info({ service: 'TraineeService', operation: 'linkClerkUser', entityId: email }, 'Linking Clerk user to trainee')
    await this.repo.linkClerkUser(email, clerkUserId)
  }

  async update(id: string, data: UpdateTraineeInput): Promise<Trainee> {
    logger.info({ service: 'TraineeService', operation: 'update', entityId: id }, 'Updating trainee')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const updated = await this.repo.update(id, data)
    logger.info({ service: 'TraineeService', operation: 'update', entityId: id, outcome: 'updated' }, 'Trainee updated')
    return updated
  }

  async delete(id: string): Promise<void> {
    logger.info({ service: 'TraineeService', operation: 'delete', entityId: id }, 'Deleting trainee')
    const existing = await this.repo.findById(id)
    if (!existing) throw new NotFoundError(id)
    const hasSessions = await this.repo.hasSessions(id)
    if (hasSessions) {
      logger.info({ service: 'TraineeService', operation: 'delete', entityId: id, outcome: 'blocked' }, 'Delete blocked — trainee has sessions')
      throw new DeleteBlockedError(id, 'trainee has training sessions')
    }
    await this.repo.delete(id)
    logger.info({ service: 'TraineeService', operation: 'delete', entityId: id, outcome: 'deleted' }, 'Trainee deleted')
  }
}
