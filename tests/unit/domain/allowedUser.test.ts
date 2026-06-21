import { CreateAllowedUserSchema } from '@/lib/domain/allowedUser'

describe('CreateAllowedUserSchema', () => {
  it('accepts valid email + trainer role', () => {
    const result = CreateAllowedUserSchema.safeParse({ email: 'alice@example.com', role: 'trainer' })
    expect(result.success).toBe(true)
  })

  it('accepts valid email + trainee role', () => {
    const result = CreateAllowedUserSchema.safeParse({ email: 'bob@example.com', role: 'trainee' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = CreateAllowedUserSchema.safeParse({ email: 'not-an-email', role: 'trainer' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = CreateAllowedUserSchema.safeParse({ email: 'alice@example.com', role: 'admin' })
    expect(result.success).toBe(false)
  })
})
