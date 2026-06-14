import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BiSeriesSetLogger } from '@/components/BiSeriesSetLogger'
import type { BiSeriesExercise } from '@/components/BiSeriesSetLogger'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

const exerciseA: BiSeriesExercise = {
  id: 'a1',
  name: 'Bench Press',
  targetReps: 10,
  trackingType: 'WEIGHT',
}
const exerciseB: BiSeriesExercise = {
  id: 'b1',
  name: 'Barbell Row',
  targetReps: 10,
  trackingType: 'WEIGHT',
}

describe('BiSeriesSetLogger', () => {
  it('renders both exercise cards with names', () => {
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('button is disabled when WEIGHT exercise has no weight filled', () => {
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeDisabled()
  })

  it('button is enabled when all required inputs filled', () => {
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })

  it('calls onMarkDone with correct data for both exercises', async () => {
    const onMarkDone = jest.fn().mockResolvedValue(undefined)
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={exerciseA}
        exerciseB={exerciseB}
        onMarkDone={onMarkDone}
      />,
    )
    fireEvent.change(screen.getByLabelText('Bench Press weight kg'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Bench Press reps done'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Barbell Row weight kg'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Barbell Row reps done'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'markSetDone' }))
    await waitFor(() => {
      expect(onMarkDone).toHaveBeenCalledWith(
        { weightKg: 80, repsDone: 10 },
        { weightKg: 60, repsDone: 10 },
      )
    })
  })

  it('renders duration input for TIME tracking type', () => {
    const timeExA: BiSeriesExercise = { ...exerciseA, trackingType: 'TIME' }
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={timeExA}
        exerciseB={exerciseB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByLabelText('Bench Press duration seconds')).toBeInTheDocument()
  })

  it('NONE tracking type: button enabled with only reps pre-filled', () => {
    const noneExA: BiSeriesExercise = { ...exerciseA, trackingType: 'NONE' }
    const noneExB: BiSeriesExercise = { ...exerciseB, trackingType: 'NONE' }
    render(
      <BiSeriesSetLogger
        setNumber={1}
        totalSets={3}
        exerciseA={noneExA}
        exerciseB={noneExB}
        onMarkDone={jest.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'markSetDone' })).toBeEnabled()
  })
})
