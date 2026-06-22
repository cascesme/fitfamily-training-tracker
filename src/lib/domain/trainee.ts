import { z } from 'zod'
import type { Trainee as PrismaTrainee } from '@prisma/client'

export type Trainee = PrismaTrainee

export const CreateTraineeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
})
export type CreateTraineeInput = z.infer<typeof CreateTraineeSchema>

export const UpdateTraineeSchema = z.object({ name: z.string().min(1).max(100) }).partial()
export type UpdateTraineeInput = z.infer<typeof UpdateTraineeSchema>

export interface ITraineeRepository {
  findAll(): Promise<Trainee[]>
  findById(id: string): Promise<Trainee | null>
  findByClerkUserId(clerkUserId: string): Promise<Trainee | null>
  findByEmail(email: string): Promise<Trainee | null>
  create(data: CreateTraineeInput): Promise<Trainee>
  createWithAllowedUser(data: CreateTraineeInput): Promise<Trainee>
  linkClerkUser(email: string, clerkUserId: string): Promise<void>
  update(id: string, data: UpdateTraineeInput): Promise<Trainee>
  delete(id: string): Promise<void>
  hasSessions(id: string): Promise<boolean>
}
