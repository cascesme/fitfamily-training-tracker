import { prisma } from '@/lib/db'
import { ExerciseRepository } from '@/lib/repositories/ExerciseRepository'
import { ExerciseMediaRepository } from '@/lib/repositories/ExerciseMediaRepository'
import { TrainingPlanRepository } from '@/lib/repositories/TrainingPlanRepository'
import { TraineeRepository } from '@/lib/repositories/TraineeRepository'
import { SessionRepository } from '@/lib/repositories/SessionRepository'
import { SessionLogRepository } from '@/lib/repositories/SessionLogRepository'
import { ExerciseService } from '@/lib/services/ExerciseService'
import { ExerciseMediaService } from '@/lib/services/ExerciseMediaService'
import { TrainingPlanService } from '@/lib/services/TrainingPlanService'
import { TraineeService } from '@/lib/services/TraineeService'
import { SessionService } from '@/lib/services/SessionService'
import { ProgressionService } from '@/lib/services/ProgressionService'

export const exerciseService = new ExerciseService(new ExerciseRepository(prisma))
export const exerciseMediaService = new ExerciseMediaService(new ExerciseMediaRepository(prisma), new ExerciseRepository(prisma))
export const trainingPlanService = new TrainingPlanService(new TrainingPlanRepository(prisma))
export const traineeService = new TraineeService(new TraineeRepository(prisma))
export const sessionService = new SessionService(new SessionRepository(prisma), new SessionLogRepository(prisma))
export const progressionService = new ProgressionService(new SessionRepository(prisma), new SessionLogRepository(prisma))
