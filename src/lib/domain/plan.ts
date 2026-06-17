import { z } from 'zod'
import { MAX_SERIES_EXERCISES } from '@/lib/domain/constants'
import type {
  TrainingPlan as PrismaTrainingPlan,
  TrainingPlanItem as PrismaTrainingPlanItem,
  TrainingPlanItemExercise as PrismaTrainingPlanItemExercise,
  Exercise as PrismaExercise,
  ExerciseMedia,
} from '@prisma/client'

export type TrainingPlanItemExercise = PrismaTrainingPlanItemExercise
export type TrainingPlanItem = PrismaTrainingPlanItem & { exercises?: TrainingPlanItemExercise[] }
export type TrainingPlan = PrismaTrainingPlan & { items?: TrainingPlanItem[] }

export type TrainingPlanItemExerciseWithDetails = PrismaTrainingPlanItemExercise & {
  exercise: PrismaExercise & { media: ExerciseMedia[] }
}
export type TrainingPlanItemWithDetails = PrismaTrainingPlanItem & {
  exercises: TrainingPlanItemExerciseWithDetails[]
}
export type TrainingPlanWithDetails = PrismaTrainingPlan & {
  items: TrainingPlanItemWithDetails[]
}

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>
export const UpdatePlanSchema = CreatePlanSchema.partial()
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>

export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
  })).min(1).max(MAX_SERIES_EXERCISES),
})
export type AddPlanItemInput = z.infer<typeof AddPlanItemSchema>

export const ReorderItemsSchema = z.object({
  positions: z.array(z.object({ id: z.string(), position: z.number().int().positive() })),
})
export type ReorderItemsInput = z.infer<typeof ReorderItemsSchema>

export interface ITrainingPlanRepository {
  findAll(): Promise<TrainingPlan[]>
  findById(id: string): Promise<TrainingPlan | null>
  findWithItems(id: string): Promise<TrainingPlan | null>
  findForSession(id: string): Promise<TrainingPlanWithDetails | null>
  create(data: CreatePlanInput): Promise<TrainingPlan>
  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan>
  delete(id: string): Promise<void>
  addItem(planId: string, position: number, exercises: Array<{ exerciseId: string; sets: number; reps: number; order: number }>): Promise<TrainingPlanItem>
  removeItem(itemId: string): Promise<void>
  reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null>
}
