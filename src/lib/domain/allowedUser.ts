import { z } from 'zod'
import type { AllowedUser as PrismaAllowedUser } from '@prisma/client'

export type AllowedUser = PrismaAllowedUser

export const CreateAllowedUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['trainer', 'trainee']),
})
export type CreateAllowedUserInput = z.infer<typeof CreateAllowedUserSchema>

export interface IAllowedUserRepository {
  findByEmail(email: string): Promise<AllowedUser | null>
  create(data: CreateAllowedUserInput): Promise<AllowedUser>
}
