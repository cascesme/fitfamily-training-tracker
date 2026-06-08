import { PrismaClient } from '@prisma/client'
import type {
  IExerciseRepository,
  CreateExerciseInput,
  UpdateExerciseInput,
  Exercise,
} from '@/lib/domain/exercise'

export class ExerciseRepository implements IExerciseRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(): Promise<Exercise[]> {
    return this.prisma.exercise.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({ where: { id } })
  }

  findWithMedia(id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({
      where: { id },
      include: { media: { orderBy: { position: 'asc' } } },
    })
  }

  create(data: CreateExerciseInput): Promise<Exercise> {
    return this.prisma.exercise.create({ data })
  }

  update(id: string, data: UpdateExerciseInput): Promise<Exercise> {
    return this.prisma.exercise.update({ where: { id }, data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.exercise.delete({ where: { id } }).then(() => undefined)
  }

  async hasSessionLogs(id: string): Promise<boolean> {
    const count = await this.prisma.trainingSessionLog.count({ where: { exerciseId: id } })
    return count > 0
  }
}
