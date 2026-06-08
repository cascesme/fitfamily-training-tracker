import { CreateExerciseSchema, UpdateExerciseSchema, CreateMediaSchema } from '@/lib/domain/exercise'

describe('CreateExerciseSchema', () => {
  it('accepts valid input', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'Squat', trackingType: 'WEIGHT' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreateExerciseSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('defaults trackingType to WEIGHT', () => {
    const result = CreateExerciseSchema.parse({ name: 'Push-up' })
    expect(result.trackingType).toBe('WEIGHT')
  })

  it('rejects invalid trackingType', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'X', trackingType: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts TIME trackingType', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'Plank', trackingType: 'TIME' })
    expect(result.success).toBe(true)
  })

  it('rejects name longer than 100 chars', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects description longer than 500 chars', () => {
    const result = CreateExerciseSchema.safeParse({ name: 'Squat', description: 'x'.repeat(501) })
    expect(result.success).toBe(false)
  })
})

describe('UpdateExerciseSchema', () => {
  it('accepts partial input', () => {
    const result = UpdateExerciseSchema.safeParse({ description: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdateExerciseSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid trackingType in partial update', () => {
    const result = UpdateExerciseSchema.safeParse({ trackingType: 'BAD' })
    expect(result.success).toBe(false)
  })
})

describe('CreateMediaSchema', () => {
  it('accepts YOUTUBE type with url', () => {
    const result = CreateMediaSchema.safeParse({ type: 'YOUTUBE', url: 'https://youtube.com/watch?v=abc' })
    expect(result.success).toBe(true)
  })

  it('accepts VIDEO type without url', () => {
    const result = CreateMediaSchema.safeParse({ type: 'VIDEO' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid media type', () => {
    const result = CreateMediaSchema.safeParse({ type: 'GIF' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid url format', () => {
    const result = CreateMediaSchema.safeParse({ type: 'YOUTUBE', url: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})
