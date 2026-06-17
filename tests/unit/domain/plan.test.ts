import { CreatePlanSchema, UpdatePlanSchema, AddPlanItemSchema } from '@/lib/domain/plan'

describe('CreatePlanSchema', () => {
  it('accepts valid input', () => {
    const result = CreatePlanSchema.safeParse({ name: 'Full Body' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreatePlanSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts name with optional description', () => {
    const result = CreatePlanSchema.safeParse({ name: 'Push Day', description: 'Upper body focus' })
    expect(result.success).toBe(true)
  })

  it('rejects name longer than 100 chars', () => {
    const result = CreatePlanSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('UpdatePlanSchema', () => {
  it('accepts partial input', () => {
    const result = UpdatePlanSchema.safeParse({ description: 'Updated description' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdatePlanSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('AddPlanItemSchema', () => {
  it('accepts single exercise item', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, order: 1 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts series item with two exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 2,
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: 10, order: 1 },
        { exerciseId: 'ex2', sets: 3, reps: 10, order: 2 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts series item with five exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 3,
      exercises: [1, 2, 3, 4, 5].map((order) => ({ exerciseId: `ex${order}`, sets: 3, reps: 10, order })),
    })
    expect(result.success).toBe(true)
  })

  it('rejects series item with six exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [1, 2, 3, 4, 5, 6].map((order) => ({ exerciseId: `ex${order}`, sets: 3, reps: 10, order })),
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty exercises array', () => {
    const result = AddPlanItemSchema.safeParse({ position: 1, exercises: [] })
    expect(result.success).toBe(false)
  })

  it('rejects order value above MAX_SERIES_EXERCISES', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, order: 6 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative position', () => {
    const result = AddPlanItemSchema.safeParse({
      position: -1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, order: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero sets', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 0, reps: 10, order: 1 }],
    })
    expect(result.success).toBe(false)
  })
})
