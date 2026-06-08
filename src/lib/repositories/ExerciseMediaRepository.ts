import { PrismaClient } from '@prisma/client'
import type { IExerciseMediaRepository, CreateMediaInput } from '@/lib/domain/exercise'
import type { ExerciseMedia } from '@prisma/client'

export class ExerciseMediaRepository implements IExerciseMediaRepository {
  constructor(private prisma: PrismaClient) {}

  create(data: CreateMediaInput): Promise<ExerciseMedia> {
    return this.prisma.exerciseMedia.create({ data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.exerciseMedia.delete({ where: { id } }).then(() => undefined)
  }

  async countByExercise(exerciseId: string): Promise<number> {
    return this.prisma.exerciseMedia.count({ where: { exerciseId } })
  }

  findByExercise(exerciseId: string): Promise<ExerciseMedia[]> {
    return this.prisma.exerciseMedia.findMany({
      where: { exerciseId },
      orderBy: { position: 'asc' },
    })
  }

  // Reorder uses negative temporary positions to avoid the @@unique([exerciseId, position])
  // constraint violation that would occur when swapping positions sequentially within
  // a single transaction.
  async reorder(exerciseId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Phase 1: move all items to negative temporary positions to vacate the target slots
      for (const { id, position } of positions) {
        await tx.exerciseMedia.update({ where: { id }, data: { position: -position } })
      }
      // Phase 2: assign final positions
      for (const { id, position } of positions) {
        await tx.exerciseMedia.update({ where: { id }, data: { position } })
      }
    })
  }
}
