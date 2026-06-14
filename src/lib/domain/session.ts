import { z } from 'zod'
import type {
  TrainingSession as PrismaTrainingSession,
  TrainingSessionLog as PrismaTrainingSessionLog,
} from '@prisma/client'

export type TrainingSession = PrismaTrainingSession & { logs?: TrainingSessionLog[] }
export type TrainingSessionLog = PrismaTrainingSessionLog

export const StartSessionSchema = z.object({
  traineeId: z.string().min(1),
  planId: z.string().min(1).optional(),
})
export type StartSessionInput = z.infer<typeof StartSessionSchema>

export const LogSetSchema = z.object({
  exerciseId: z.string().min(1),
  planItemId: z.string().min(1).optional(),
  setNumber: z.number().int().positive(),
  weightKg: z.number().positive().nullable().optional(),
  durationSecs: z.number().int().positive().nullable().optional(),
  repsDone: z.number().int().positive().nullable().optional(),
})
export type LogSetInput = z.infer<typeof LogSetSchema>

export const FinishSessionSchema = z.object({
  finishedAt: z.date().optional(),
  caloriesBurned: z.number().int().positive().optional(),
})
export type FinishSessionInput = z.infer<typeof FinishSessionSchema>

export interface ISessionRepository {
  create(data: StartSessionInput): Promise<TrainingSession>
  findById(id: string): Promise<TrainingSession | null>
  findWithLogs(id: string): Promise<TrainingSession | null>
  findByTrainee(traineeId: string): Promise<TrainingSession[]>
  findLastByTrainee(traineeId: string): Promise<TrainingSession | null>
  finish(id: string, data: FinishSessionInput): Promise<TrainingSession>
}

export interface ISessionLogRepository {
  create(data: {
    sessionId: string
    exerciseId: string
    setNumber: number
    weightKg?: number
    durationSecs?: number
    repsDone?: number
    planItemId?: string
  }): Promise<TrainingSessionLog>
  findBySession(sessionId: string): Promise<TrainingSessionLog[]>
  findBySessionAndExercise(sessionId: string, exerciseId: string): Promise<TrainingSessionLog[]>
}
