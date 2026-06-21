import { PrismaClient } from '@prisma/client'
import type { IAllowedUserRepository, CreateAllowedUserInput, AllowedUser } from '@/lib/domain/allowedUser'

export class AllowedUserRepository implements IAllowedUserRepository {
  constructor(private prisma: PrismaClient) {}

  findByEmail(email: string): Promise<AllowedUser | null> {
    return this.prisma.allowedUser.findUnique({ where: { email } })
  }

  create(data: CreateAllowedUserInput): Promise<AllowedUser> {
    return this.prisma.allowedUser.create({ data })
  }
}
