import { PrismaClient } from '@prisma/client'
import type {
  ITraineeRepository,
  CreateTraineeInput,
  UpdateTraineeInput,
  Trainee,
} from '@/lib/domain/trainee'

export class TraineeRepository implements ITraineeRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(): Promise<Trainee[]> {
    return this.prisma.trainee.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<Trainee | null> {
    return this.prisma.trainee.findUnique({ where: { id } })
  }

  findByClerkUserId(clerkUserId: string): Promise<Trainee | null> {
    return this.prisma.trainee.findUnique({ where: { clerkUserId } })
  }

  findByEmail(email: string): Promise<Trainee | null> {
    return this.prisma.trainee.findUnique({ where: { email } })
  }

  create(data: CreateTraineeInput): Promise<Trainee> {
    return this.prisma.trainee.create({ data })
  }

  async createWithAllowedUser(data: CreateTraineeInput): Promise<Trainee> {
    return this.prisma.$transaction(async (tx) => {
      await tx.allowedUser.create({ data: { email: data.email, role: 'trainee' } })
      return tx.trainee.create({ data: { name: data.name, email: data.email } })
    })
  }

  async linkClerkUser(email: string, clerkUserId: string): Promise<void> {
    await this.prisma.trainee.update({ where: { email }, data: { clerkUserId } })
  }

  update(id: string, data: UpdateTraineeInput): Promise<Trainee> {
    return this.prisma.trainee.update({ where: { id }, data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.trainee.delete({ where: { id } }).then(() => undefined)
  }

  async hasSessions(id: string): Promise<boolean> {
    const count = await this.prisma.trainingSession.count({ where: { traineeId: id } })
    return count > 0
  }
}
