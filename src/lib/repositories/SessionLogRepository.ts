import { PrismaClient } from '@prisma/client'
import type { ISessionLogRepository } from '@/lib/domain/session'
import type { TrainingSessionLog } from '@prisma/client'

export class SessionLogRepository implements ISessionLogRepository {
  constructor(private prisma: PrismaClient) {}

  create(data: {
    sessionId: string
    exerciseId: string
    setNumber: number
    weightKg?: number
    durationSecs?: number
    repsDone?: number
    planItemId?: string
  }): Promise<TrainingSessionLog> {
    return this.prisma.trainingSessionLog.create({ data })
  }

  findBySessionAndExercise(sessionId: string, exerciseId: string): Promise<TrainingSessionLog[]> {
    return this.prisma.trainingSessionLog.findMany({
      where: { sessionId, exerciseId },
      orderBy: { setNumber: 'asc' },
    })
  }

  findBySession(sessionId: string): Promise<TrainingSessionLog[]> {
    return this.prisma.trainingSessionLog.findMany({
      where: { sessionId },
      orderBy: { completedAt: 'asc' },
    })
  }
}
