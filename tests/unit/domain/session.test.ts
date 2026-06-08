import { StartSessionSchema, LogSetSchema, FinishSessionSchema } from '@/lib/domain/session'

describe('StartSessionSchema', () => {
  it('accepts traineeId with planId', () => {
    const result = StartSessionSchema.safeParse({ traineeId: 'tr1', planId: 'pl1' })
    expect(result.success).toBe(true)
  })

  it('accepts traineeId without planId (single exercise session)', () => {
    const result = StartSessionSchema.safeParse({ traineeId: 'tr1' })
    expect(result.success).toBe(true)
  })

  it('rejects empty traineeId', () => {
    const result = StartSessionSchema.safeParse({ traineeId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing traineeId', () => {
    const result = StartSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('LogSetSchema', () => {
  it('accepts full set log with weight and reps', () => {
    const result = LogSetSchema.safeParse({
      exerciseId: 'ex1',
      setNumber: 1,
      weightKg: 80.5,
      repsDone: 10,
    })
    expect(result.success).toBe(true)
  })

  it('accepts set log without weight (NONE tracking type)', () => {
    const result = LogSetSchema.safeParse({ exerciseId: 'ex1', setNumber: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects zero setNumber', () => {
    const result = LogSetSchema.safeParse({ exerciseId: 'ex1', setNumber: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative weightKg', () => {
    const result = LogSetSchema.safeParse({ exerciseId: 'ex1', setNumber: 1, weightKg: -5 })
    expect(result.success).toBe(false)
  })

  it('rejects missing exerciseId', () => {
    const result = LogSetSchema.safeParse({ setNumber: 1 })
    expect(result.success).toBe(false)
  })
})

describe('FinishSessionSchema', () => {
  it('accepts optional caloriesBurned', () => {
    const result = FinishSessionSchema.safeParse({ caloriesBurned: 350 })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (no calories)', () => {
    const result = FinishSessionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects negative calories', () => {
    const result = FinishSessionSchema.safeParse({ caloriesBurned: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer calories', () => {
    const result = FinishSessionSchema.safeParse({ caloriesBurned: 350.5 })
    expect(result.success).toBe(false)
  })
})
