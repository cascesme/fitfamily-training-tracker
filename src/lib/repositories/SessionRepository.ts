import { PrismaClient } from '@prisma/client'
import type { ISessionRepository } from '@/lib/domain/session'
import type { TrainingSession } from '@prisma/client'

export class SessionRepository implements ISessionRepository {
  constructor(private prisma: PrismaClient) {}

  create(data: { traineeId: string; planId?: string }): Promise<TrainingSession> {
    return this.prisma.trainingSession.create({ data })
  }

  finish(
    id: string,
    data: { finishedAt?: Date; caloriesBurned?: number },
  ): Promise<TrainingSession> {
    return this.prisma.trainingSession.update({ where: { id }, data })
  }

  findByTrainee(traineeId: string): Promise<TrainingSession[]> {
    return this.prisma.trainingSession.findMany({
      where: { traineeId },
      orderBy: { startedAt: 'desc' },
    })
  }

  findById(id: string): Promise<TrainingSession | null> {
    return this.prisma.trainingSession.findUnique({ where: { id } })
  }

  findWithLogs(id: string): Promise<(TrainingSession & { logs: import('@prisma/client').TrainingSessionLog[] }) | null> {
    return this.prisma.trainingSession.findUnique({
      where: { id },
      include: { logs: true },
    })
  }

  findLastByTrainee(traineeId: string): Promise<TrainingSession | null> {
    return this.prisma.trainingSession.findFirst({
      where: { traineeId },
      orderBy: { startedAt: 'desc' },
    })
  }
}
