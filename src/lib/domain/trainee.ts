import { z } from 'zod'
import type { Trainee as PrismaTrainee } from '@prisma/client'

export type Trainee = PrismaTrainee

export const CreateTraineeSchema = z.object({ name: z.string().min(1).max(100) })
export type CreateTraineeInput = z.infer<typeof CreateTraineeSchema>
export const UpdateTraineeSchema = CreateTraineeSchema.partial()
export type UpdateTraineeInput = z.infer<typeof UpdateTraineeSchema>

export interface ITraineeRepository {
  findAll(): Promise<Trainee[]>
  findById(id: string): Promise<Trainee | null>
  create(data: CreateTraineeInput): Promise<Trainee>
  update(id: string, data: UpdateTraineeInput): Promise<Trainee>
  delete(id: string): Promise<void>
  hasSessions(id: string): Promise<boolean>
}
