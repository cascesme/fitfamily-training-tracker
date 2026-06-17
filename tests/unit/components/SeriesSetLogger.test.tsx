import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SeriesSetLogger } from '@/components/SeriesSetLogger'
import type { SeriesExercise } from '@/components/SeriesSetLogger'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

const exerciseA: SeriesExercise = { id: 'a1', name: 'Bench Press', targetReps: 10, trackingType: 'WEIGHT' }
const exerciseB: SeriesExercise = { id: 'b1', name: 'Barbell Row', targetReps: 10, trackingType: 'WEIGHT' }
const exerciseC: SeriesExercise = { id: 'c1', name: 'Lat Pulldown', targetReps: 12, trackingType: 'WEIGHT' }

describe('SeriesSetLogger', () => {
  it('renders all exercise cards with names for a 2-exercise series', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB]} onMarkDone={jest.fn()} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('renders all exercise cards with names for a 3-exercise series', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB, exerciseC]} onMarkDone={jest.fn()} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
    expect(screen.getByText('Lat Pulldown')).toBeInTheDocument()
  })

  it('button is disabled when any WEIGHT exercise has no weight filled', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB, exerciseC]} onMarkDone={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeDisabled()
  })

  it('button is enabled when all required inputs filled across all exercises', () => {
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB, exerciseC]} onMarkDone={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Lat Pulldown weight kg'), { target: { value: '40' } })
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })

  it('calls onMarkDone with an array of data matching exercise order', async () => {
    const onMarkDone = jest.fn().mockResolvedValue(undefined)
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[exerciseA, exerciseB]} onMarkDone={onMarkDone} />)
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Bench Press reps done'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Barbell Row reps done'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'markSetDone' }))
    await waitFor(() => {
      expect(onMarkDone).toHaveBeenCalledWith([
        { weightKg: 80, repsDone: 10 },
        { weightKg: 60, repsDone: 10 },
      ])
    })
  })

  it('renders duration input for TIME tracking type mixed with WEIGHT', () => {
    const timeExA: SeriesExercise = { ...exerciseA, trackingType: 'TIME' }
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[timeExA, exerciseB]} onMarkDone={jest.fn()} />)
    expect(screen.getByLabelText('Bench Press duration seconds')).toBeInTheDocument()
  })

  it('NONE tracking type: button enabled with only reps pre-filled', () => {
    const noneExA: SeriesExercise = { ...exerciseA, trackingType: 'NONE' }
    const noneExB: SeriesExercise = { ...exerciseB, trackingType: 'NONE' }
    render(<SeriesSetLogger setNumber={1} totalSets={3} exercises={[noneExA, noneExB]} onMarkDone={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })
})
