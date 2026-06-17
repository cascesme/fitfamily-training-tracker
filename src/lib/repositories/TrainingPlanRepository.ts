import { PrismaClient } from '@prisma/client'
import type {
  ITrainingPlanRepository,
  CreatePlanInput,
  UpdatePlanInput,
  TrainingPlan,
  TrainingPlanItem,
  TrainingPlanItemExercise,
  TrainingPlanWithDetails,
} from '@/lib/domain/plan'

export class TrainingPlanRepository implements ITrainingPlanRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(): Promise<TrainingPlan[]> {
    return this.prisma.trainingPlan.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<TrainingPlan | null> {
    return this.prisma.trainingPlan.findUnique({ where: { id } })
  }

  findWithItems(id: string): Promise<TrainingPlan | null> {
    return this.prisma.trainingPlan.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            exercises: { orderBy: { order: 'asc' } },
          },
        },
      },
    })
  }

  async findForSession(id: string): Promise<TrainingPlanWithDetails | null> {
    return this.prisma.trainingPlan.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: {
                exercise: {
                  include: { media: { orderBy: { position: 'asc' } } },
                },
              },
            },
          },
        },
      },
    }) as Promise<TrainingPlanWithDetails | null>
  }

  create(data: CreatePlanInput): Promise<TrainingPlan> {
    return this.prisma.trainingPlan.create({ data })
  }

  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan> {
    return this.prisma.trainingPlan.update({ where: { id }, data })
  }

  delete(id: string): Promise<void> {
    return this.prisma.trainingPlan.delete({ where: { id } }).then(() => undefined)
  }

  async addItem(
    planId: string,
    position: number,
    exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>,
  ): Promise<TrainingPlanItem> {
    return this.prisma.trainingPlanItem.create({
      data: {
        planId,
        position,
        exercises: { create: exercises },
      },
      include: { exercises: true },
    })
  }

  async removeItem(itemId: string): Promise<void> {
    await this.prisma.trainingPlanItemExercise.deleteMany({ where: { itemId } })
    await this.prisma.trainingPlanItem.delete({ where: { id: itemId } })
  }

  async reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void> {
    // Two-phase update avoids unique(planId, position) collisions during reorder:
    // phase 1 shifts to large temporary positions, phase 2 applies the real ones.
    const OFFSET = 100_000
    await this.prisma.$transaction([
      ...positions.map(({ id, position }) =>
        this.prisma.trainingPlanItem.update({ where: { id }, data: { position: position + OFFSET } })
      ),
      ...positions.map(({ id, position }) =>
        this.prisma.trainingPlanItem.update({ where: { id }, data: { position } })
      ),
    ])
  }

  findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null> {
    return this.prisma.trainingPlanItemExercise.findUnique({
      where: { itemId_order: { itemId, order } },
    })
  }
}
