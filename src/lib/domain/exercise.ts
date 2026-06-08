import { z } from 'zod'
import type { Exercise as PrismaExercise, ExerciseMedia, TrackingType, MediaType } from '@prisma/client'

export type { TrackingType, MediaType }
export type Exercise = PrismaExercise & { media?: ExerciseMedia[] }

export const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trackingType: z.enum(['WEIGHT', 'TIME', 'NONE']).default('WEIGHT'),
})
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>
export const UpdateExerciseSchema = CreateExerciseSchema.partial()
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseSchema>

export interface IExerciseRepository {
  findAll(): Promise<Exercise[]>
  findById(id: string): Promise<Exercise | null>
  findWithMedia(id: string): Promise<Exercise | null>
  create(data: CreateExerciseInput): Promise<Exercise>
  update(id: string, data: UpdateExerciseInput): Promise<Exercise>
  delete(id: string): Promise<void>
  hasSessionLogs(id: string): Promise<boolean>
}

export const CreateMediaSchema = z.object({
  type: z.enum(['VIDEO', 'PHOTO', 'PDF', 'YOUTUBE']),
  url: z.string().url().optional(),
  originalFilename: z.string().optional(),
})
export type CreateMediaInput = z.infer<typeof CreateMediaSchema> & {
  exerciseId: string
  filePath?: string
  position: number
}

export interface IExerciseMediaRepository {
  create(data: CreateMediaInput): Promise<ExerciseMedia>
  delete(id: string): Promise<void>
  countByExercise(exerciseId: string): Promise<number>
  reorder(exerciseId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findByExercise(exerciseId: string): Promise<ExerciseMedia[]>
}
