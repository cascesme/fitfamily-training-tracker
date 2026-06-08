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
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, slot: 1 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts biseries item with two exercises', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 2,
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: 10, slot: 1 },
        { exerciseId: 'ex2', sets: 3, reps: 10, slot: 2 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty exercises array', () => {
    const result = AddPlanItemSchema.safeParse({ position: 1, exercises: [] })
    expect(result.success).toBe(false)
  })

  it('rejects slot value above 2', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, slot: 3 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative position', () => {
    const result = AddPlanItemSchema.safeParse({
      position: -1,
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, slot: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero sets', () => {
    const result = AddPlanItemSchema.safeParse({
      position: 1,
      exercises: [{ exerciseId: 'ex1', sets: 0, reps: 10, slot: 1 }],
    })
    expect(result.success).toBe(false)
  })
})
