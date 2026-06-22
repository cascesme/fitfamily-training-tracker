import type { IAllowedUserRepository, AllowedUser } from '@/lib/domain/allowedUser'

export class AllowedUserService {
  constructor(private repo: IAllowedUserRepository) {}

  findByEmail(email: string): Promise<AllowedUser | null> {
    return this.repo.findByEmail(email)
  }
}
