import { z } from 'zod'
import { MAX_SERIES_EXERCISES } from '@/lib/domain/constants'
import type {
  TrainingPlan as PrismaTrainingPlan,
  TrainingPlanItem as PrismaTrainingPlanItem,
  TrainingPlanItemExercise as PrismaTrainingPlanItemExercise,
  Exercise as PrismaExercise,
  ExerciseMedia,
} from '@prisma/client'

export type TrainingPlanItemExercise = PrismaTrainingPlanItemExercise
export type TrainingPlanItem = PrismaTrainingPlanItem & { exercises?: TrainingPlanItemExercise[] }
export type TrainingPlan = PrismaTrainingPlan & { items?: TrainingPlanItem[] }

export type TrainingPlanItemExerciseWithDetails = PrismaTrainingPlanItemExercise & {
  exercise: PrismaExercise & { media: ExerciseMedia[] }
  alternativeExercise: (PrismaExercise & { media: ExerciseMedia[] }) | null
}
export type TrainingPlanItemWithDetails = PrismaTrainingPlanItem & {
  exercises: TrainingPlanItemExerciseWithDetails[]
}
export type TrainingPlanWithDetails = PrismaTrainingPlan & {
  items: TrainingPlanItemWithDetails[]
}

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>
export const UpdatePlanSchema = CreatePlanSchema.partial()
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>

export const AddPlanItemSchema = z.object({
  position: z.number().int().positive(),
  isTabata: z.boolean().optional().default(false),
  workTimeSecs: z.number().int().positive().optional(),
  restTimeSecs: z.number().int().positive().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      sets: z.number().int().positive(),
      reps: z.number().int().nonnegative(),
      order: z.number().int().min(1).max(MAX_SERIES_EXERCISES),
      alternativeExerciseId: z.string().min(1).optional(),
      alternativeSets: z.number().int().positive().optional(),
      alternativeReps: z.number().int().positive().optional(),
    }).superRefine((ex, ctx) => {
      const hasAlt = !!ex.alternativeExerciseId
      const hasSets = ex.alternativeSets !== undefined
      const hasReps = ex.alternativeReps !== undefined
      if (hasAlt && !hasSets) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeSets required when alternativeExerciseId is set', path: ['alternativeSets'] })
      }
      if (hasAlt && !hasReps) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeReps required when alternativeExerciseId is set', path: ['alternativeReps'] })
      }
      if (!hasAlt && (hasSets || hasReps)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeExerciseId required when alternativeSets or alternativeReps is set', path: ['alternativeExerciseId'] })
      }
      if (hasAlt && ex.alternativeExerciseId === ex.exerciseId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'alternativeExerciseId must differ from exerciseId', path: ['alternativeExerciseId'] })
      }
    }),
  ).min(1).max(MAX_SERIES_EXERCISES),
}).superRefine((val, ctx) => {
  if (!val.isTabata) {
    val.exercises.forEach((ex, i) => {
      if (ex.reps === 0) {
        ctx.addIssue({ code: 'custom', path: ['exercises', i, 'reps'], message: 'reps must be positive for non-tabata exercises' })
      }
    })
    return
  }
  if (val.exercises.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['exercises'], message: 'tabata requires at least 2 exercises' })
  }
  if (!val.workTimeSecs) {
    ctx.addIssue({ code: 'custom', path: ['workTimeSecs'], message: 'workTimeSecs required for tabata' })
  }
  if (!val.restTimeSecs) {
    ctx.addIssue({ code: 'custom', path: ['restTimeSecs'], message: 'restTimeSecs required for tabata' })
  }
})
export type AddPlanItemInput = z.infer<typeof AddPlanItemSchema>

export const ReorderItemsSchema = z.object({
  positions: z.array(z.object({ id: z.string(), position: z.number().int().positive() })),
})
export type ReorderItemsInput = z.infer<typeof ReorderItemsSchema>

export interface ITrainingPlanRepository {
  findAll(): Promise<TrainingPlan[]>
  findById(id: string): Promise<TrainingPlan | null>
  findWithItems(id: string): Promise<TrainingPlan | null>
  findForSession(id: string): Promise<TrainingPlanWithDetails | null>
  create(data: CreatePlanInput): Promise<TrainingPlan>
  update(id: string, data: UpdatePlanInput): Promise<TrainingPlan>
  delete(id: string): Promise<void>
  addItem(
    planId: string,
    position: number,
    exercises: Array<{
      exerciseId: string
      sets: number
      reps: number
      order: number
      alternativeExerciseId?: string
      alternativeSets?: number
      alternativeReps?: number
    }>,
    tabataConfig?: { workTimeSecs: number; restTimeSecs: number },
  ): Promise<TrainingPlanItem>
  removeItem(itemId: string): Promise<void>
  reorderItems(planId: string, positions: Array<{ id: string; position: number }>): Promise<void>
  findItemAtOrder(itemId: string, order: number): Promise<TrainingPlanItemExercise | null>
}
