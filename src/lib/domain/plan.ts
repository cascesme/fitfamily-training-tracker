import { z } from 'zod'
import type {
  TrainingPlan as PrismaTrainingPlan,
  TrainingPlanItem as PrismaTrainingPlanItem,
  TrainingPlanItemExercise as PrismaTrainingPlanItemExercise,
} from '@prisma/client'

export type TrainingPlanItemExercise = PrismaTrainingPlanItemExercise
export type TrainingPlanItem = PrismaTrainingPlanItem & { exercises?: TrainingPlanItemExercise[] }
export type TrainingPlan = PrismaTrainingPlan & { items?: TrainingPlanItem[] }

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
    slot: z.number().int().min(1).max(2),
  })).min(1).max(2),
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
  create(data: CreatePlanInput): Promise<TrainingPlan>
  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan>
  delete(id: string): Promise<void>
  addItem(planId: string, position: number, exercises: Array<{ exerciseId: string; sets: number; reps: number; slot: number }>): Promise<TrainingPlanItem>
  removeItem(itemId: string): Promise<void>
  reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findItemSlot(itemId: string, slot: number): Promise<TrainingPlanItemExercise | null>
}
