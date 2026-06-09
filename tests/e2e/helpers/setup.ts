import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import type { TrackingType, MediaType } from '@prisma/client'

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://fitfamily:fitfamily@localhost:5433/fitfamily_test'

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export async function cleanDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "TrainingSessionLog", "TrainingSession", "TrainingPlanItemExercise", "TrainingPlanItem", "TrainingPlan", "ExerciseMedia", "Exercise", "Trainee" CASCADE`
  )
}

export async function seedTrainee(data: { name: string }) {
  return prisma.trainee.create({ data })
}

export async function seedExercise(data: {
  name: string
  trackingType: TrackingType
  mediaCount?: number
}) {
  const { mediaCount = 0, ...rest } = data
  const exercise = await prisma.exercise.create({ data: rest })
  for (let i = 1; i <= mediaCount; i++) {
    await prisma.exerciseMedia.create({
      data: {
        exerciseId: exercise.id,
        type: 'PHOTO' as MediaType,
        filePath: `dummy/${i}.jpg`,
        position: i,
      },
    })
  }
  return exercise
}

export async function seedPlan(data: {
  name: string
  items: Array<{ exerciseId: string; sets: number; reps: number }>
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  for (let i = 0; i < data.items.length; i++) {
    const item = await prisma.trainingPlanItem.create({
      data: { planId: plan.id, position: i + 1 },
    })
    await prisma.trainingPlanItemExercise.create({
      data: {
        itemId: item.id,
        exerciseId: data.items[i].exerciseId,
        sets: data.items[i].sets,
        reps: data.items[i].reps,
        slot: 1,
      },
    })
  }
  return plan
}

export async function seedSession(data: {
  traineeId: string
  exerciseId?: string
  planId?: string
}) {
  const session = await prisma.trainingSession.create({
    data: {
      traineeId: data.traineeId,
      planId: data.planId ?? null,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  })
  if (data.exerciseId) {
    await prisma.trainingSessionLog.create({
      data: {
        sessionId: session.id,
        exerciseId: data.exerciseId,
        setNumber: 1,
        weightKg: 50,
        repsDone: 8,
      },
    })
  }
  return session
}
