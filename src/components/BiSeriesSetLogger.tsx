'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export type SetLogData = {
  weightKg?: number | null
  repsDone?: number | null
  durationSecs?: number | null
}

export interface BiSeriesExercise {
  id: string
  name: string
  targetReps: number
  trackingType: 'WEIGHT' | 'TIME' | 'NONE'
}

interface ExerciseInputState {
  weight: string
  reps: string
  duration: string
}

function initialState(targetReps: number): ExerciseInputState {
  return { weight: '', reps: targetReps.toString(), duration: '' }
}

function isValid(state: ExerciseInputState, trackingType: 'WEIGHT' | 'TIME' | 'NONE'): boolean {
  if (trackingType === 'TIME') return state.duration.trim() !== ''
  if (trackingType === 'WEIGHT') return state.weight.trim() !== '' && state.reps.trim() !== ''
  return state.reps.trim() !== ''
}

function toLogData(state: ExerciseInputState, trackingType: 'WEIGHT' | 'TIME' | 'NONE'): SetLogData {
  if (trackingType === 'TIME') return { durationSecs: parseInt(state.duration) }
  return {
    weightKg: trackingType === 'WEIGHT' ? parseFloat(state.weight) : null,
    repsDone: parseInt(state.reps),
  }
}

interface BiSeriesSetLoggerProps {
  setNumber: number
  totalSets: number
  exerciseA: BiSeriesExercise
  exerciseB: BiSeriesExercise
  onMarkDone: (dataA: SetLogData, dataB: SetLogData) => Promise<void>
}

function ExerciseCard({
  exercise,
  state,
  onChange,
  t,
}: {
  exercise: BiSeriesExercise
  state: ExerciseInputState
  onChange: (updater: (s: ExerciseInputState) => ExerciseInputState) => void
  t: (key: string, params?: Record<string, string | number | Date>) => string
}) {
  return (
    <div className="border-l-2 border-[#E85D26] bg-[#111111] p-4">
      <h2 className="font-display text-lg font-bold">{exercise.name}</h2>
      <p className="mb-3 text-sm text-[rgba(255,255,255,0.6)]">
        {exercise.trackingType === 'TIME'
          ? t('targetDuration', { secs: exercise.targetReps })
          : t('targetReps', { reps: exercise.targetReps })}
      </p>
      <div className="flex gap-3">
        {exercise.trackingType === 'WEIGHT' && (
          <Input
            name="weightKg"
            aria-label={`${exercise.name} weight kg`}
            label={t('weightLabel')}
            type="number"
            step="0.5"
            min="0"
            value={state.weight}
            onChange={(e) => onChange((s) => ({ ...s, weight: e.target.value }))}
            className="w-24 text-2xl font-bold"
          />
        )}
        {exercise.trackingType === 'TIME' ? (
          <Input
            name="durationSecs"
            aria-label={`${exercise.name} duration seconds`}
            label={t('durationLabel')}
            type="number"
            min="1"
            value={state.duration}
            onChange={(e) => onChange((s) => ({ ...s, duration: e.target.value }))}
            className="w-24 text-2xl font-bold"
          />
        ) : (
          <Input
            name="repsDone"
            aria-label={`${exercise.name} reps done`}
            label={t('repsLabel')}
            type="number"
            min="1"
            value={state.reps}
            onChange={(e) => onChange((s) => ({ ...s, reps: e.target.value }))}
            className="w-20 text-2xl font-bold"
          />
        )}
      </div>
    </div>
  )
}

export function BiSeriesSetLogger({
  setNumber,
  totalSets,
  exerciseA,
  exerciseB,
  onMarkDone,
}: BiSeriesSetLoggerProps) {
  const t = useTranslations('session')
  const [stateA, setStateA] = useState<ExerciseInputState>(() => initialState(exerciseA.targetReps))
  const [stateB, setStateB] = useState<ExerciseInputState>(() => initialState(exerciseB.targetReps))
  const [loading, setLoading] = useState(false)

  const canSubmit = isValid(stateA, exerciseA.trackingType) && isValid(stateB, exerciseB.trackingType)

  const handleDone = async () => {
    setLoading(true)
    await onMarkDone(toLogData(stateA, exerciseA.trackingType), toLogData(stateB, exerciseB.trackingType))
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-[#E85D26] px-2 py-0.5 text-xs font-bold uppercase text-white">
          {t('biSeriesBadge')}
        </span>
        <span className="font-display text-xl font-bold">
          {t('currentSet', { current: setNumber, total: totalSets })}
        </span>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.08)]">
        <ExerciseCard exercise={exerciseA} state={stateA} onChange={setStateA} t={t} />
        <div className="h-px bg-[rgba(255,255,255,0.08)]" />
        <ExerciseCard exercise={exerciseB} state={stateB} onChange={setStateB} t={t} />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleDone}
        disabled={!canSubmit || loading}
      >
        {t('markSetDone')}
      </Button>
    </div>
  )
}
