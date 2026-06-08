import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'
import type { TrainingSession, TrainingSessionLog } from '@prisma/client'
import { logger } from '@/lib/logger'

interface LogSetInput {
  exerciseId: string
  setNumber: number
  weightKg?: number
  durationSecs?: number
  repsDone?: number
  planItemId?: string
}

interface FinishSessionInput {
  finishedAt: Date
  caloriesBurned?: number
}

export class SessionService {
  constructor(
    private sessionRepo: ISessionRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async startPlanSession(traineeId: string, planId: string): Promise<TrainingSession> {
    logger.info({ service: 'SessionService', operation: 'startPlanSession', entityId: traineeId }, 'Trainee starting plan session')
    const session = await this.sessionRepo.create({ traineeId, planId })
    logger.info({ service: 'SessionService', operation: 'startPlanSession', entityId: session.id, outcome: 'created' }, 'Plan session started')
    return session
  }

  async startExerciseSession(traineeId: string): Promise<TrainingSession> {
    logger.info({ service: 'SessionService', operation: 'startExerciseSession', entityId: traineeId }, 'Trainee starting exercise session')
    const session = await this.sessionRepo.create({ traineeId })
    logger.info({ service: 'SessionService', operation: 'startExerciseSession', entityId: session.id, outcome: 'created' }, 'Exercise session started')
    return session
  }

  async logSet(sessionId: string, data: LogSetInput): Promise<TrainingSessionLog> {
    logger.info({ service: 'SessionService', operation: 'logSet', entityId: sessionId }, 'Logging set')
    const log = await this.sessionLogRepo.create({ sessionId, ...data })
    logger.info({ service: 'SessionService', operation: 'logSet', entityId: log.id, outcome: 'created' }, 'Set logged')
    return log
  }

  async finishSession(sessionId: string, data: FinishSessionInput): Promise<TrainingSession> {
    logger.info({ service: 'SessionService', operation: 'finishSession', entityId: sessionId }, 'Finishing session')
    const session = await this.sessionRepo.finish(sessionId, data)
    logger.info({ service: 'SessionService', operation: 'finishSession', entityId: sessionId, outcome: 'finished' }, 'Session finished')
    return session
  }

  async listByTrainee(traineeId: string): Promise<TrainingSession[]> {
    return this.sessionRepo.findByTrainee(traineeId)
  }

  async start(traineeId: string, planId?: string): Promise<TrainingSession> {
    if (planId) return this.startPlanSession(traineeId, planId)
    return this.startExerciseSession(traineeId)
  }
}
