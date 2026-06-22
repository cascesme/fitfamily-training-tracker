import { CreateTraineeSchema, UpdateTraineeSchema } from '@/lib/domain/trainee'

describe('CreateTraineeSchema', () => {
  it('accepts valid name and email', () => {
    const result = CreateTraineeSchema.safeParse({ name: 'Alex', email: 'alex@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreateTraineeSchema.safeParse({ name: '', email: 'alex@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = CreateTraineeSchema.safeParse({ name: 'a'.repeat(101), email: 'alex@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name field', () => {
    const result = CreateTraineeSchema.safeParse({ email: 'alex@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CreateTraineeSchema.safeParse({ name: 'Alex', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = CreateTraineeSchema.safeParse({ name: 'Alex' })
    expect(result.success).toBe(false)
  })
})

describe('UpdateTraineeSchema', () => {
  it('accepts partial input with just name', () => {
    const result = UpdateTraineeSchema.safeParse({ name: 'Alex Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdateTraineeSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects empty string name in update', () => {
    const result = UpdateTraineeSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
