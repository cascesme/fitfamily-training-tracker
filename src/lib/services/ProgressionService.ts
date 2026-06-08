import type { ISessionRepository, ISessionLogRepository } from '@/lib/domain/session'

interface ExerciseProgressionPoint {
  date: Date
  weightKg: number | null
  reps: number | null
}

interface WeeklyFrequency {
  week: string
  count: number
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export class ProgressionService {
  constructor(
    private sessionRepo: ISessionRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async getExerciseProgression(
    traineeId: string,
    exerciseId: string,
  ): Promise<ExerciseProgressionPoint[]> {
    const sessions = await this.sessionRepo.findByTrainee(traineeId)
    const points: ExerciseProgressionPoint[] = []

    for (const session of sessions) {
      const logs = await this.sessionLogRepo.findBySessionAndExercise(session.id, exerciseId)
      if (logs.length === 0) continue
      const maxWeightLog = logs.reduce((best, log) =>
        (log.weightKg ?? -Infinity) > (best.weightKg ?? -Infinity) ? log : best
      )
      points.push({
        date: session.startedAt,
        weightKg: maxWeightLog.weightKg ?? null,
        reps: maxWeightLog.repsDone ?? null,
      })
    }

    return points.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  async getSessionFrequency(traineeId: string): Promise<WeeklyFrequency[]> {
    const sessions = await this.sessionRepo.findByTrainee(traineeId)
    const weekCounts = new Map<string, number>()

    for (const session of sessions) {
      const week = isoWeek(session.startedAt)
      weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1)
    }

    return Array.from(weekCounts.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }
}
