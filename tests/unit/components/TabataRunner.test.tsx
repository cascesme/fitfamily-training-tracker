import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TabataRunner } from '@/components/TabataRunner'
import type { TabataExercise } from '@/components/TabataRunner'

const SESSION_TRANSLATIONS: Record<string, string> = {
  tabataBadge: 'TABATA',
  tabataRound: 'Round {current} of {total}',
  tabataExercise: 'Exercise {current} of {total}',
  stopAndNext: 'Stop & Next Exercise',
  restTitle: 'REST',
}

jest.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string, params?: Record<string, unknown>) => {
    const map = ns === 'sessionRunner' ? { viewMedia: 'View Media' } : SESSION_TRANSLATIONS
    const template = map[key] ?? key
    if (!params) return template
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      template,
    )
  },
}))

jest.mock('@/lib/audio', () => ({
  playTick: jest.fn(),
  playTimeUp: jest.fn(),
}))

jest.mock('@/components/MediaViewer', () => ({
  MediaViewer: () => null,
}))

Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate: jest.fn() },
  writable: true,
})

const exercises: TabataExercise[] = [
  { id: 'item-1', exerciseId: 'ex-1', name: 'Push Ups', media: [] },
  { id: 'item-2', exerciseId: 'ex-2', name: 'Pull Ups', media: [] },
]

function makeProps(overrides?: Partial<Parameters<typeof TabataRunner>[0]>) {
  return {
    exercises,
    totalRounds: 2,
    workTimeSecs: 20,
    restTimeSecs: 10,
    onExerciseDone: jest.fn().mockResolvedValue(undefined),
    onComplete: jest.fn(),
    ...overrides,
  }
}

describe('TabataRunner', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('shows first exercise, round 1, exercise 1 of 2 on mount', () => {
    render(<TabataRunner {...makeProps()} />)
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Round 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop & Next Exercise' })).toBeInTheDocument()
  })

  it('work timer counts down from workTimeSecs', () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 10 })} />)
    act(() => { jest.advanceTimersByTime(3000) })
    expect(screen.getByText('0:07')).toBeInTheDocument()
  })

  it('calls onExerciseDone with full workTimeSecs when work timer expires', async () => {
    const onExerciseDone = jest.fn().mockResolvedValue(undefined)
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, onExerciseDone })} />)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(onExerciseDone).toHaveBeenCalledWith('ex-1', 1, 5)
  })

  it('shows REST phase after work timer expires', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5 })} />)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(screen.getByText('REST')).toBeInTheDocument()
  })

  it('advances to next exercise after rest timer expires', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, restTimeSecs: 3 })} />)
    await act(async () => { jest.advanceTimersByTime(5000) }) // work done
    await act(async () => { jest.advanceTimersByTime(3000) }) // rest done
    expect(screen.getByText('Pull Ups')).toBeInTheDocument()
    expect(screen.getByText('Exercise 2 of 2')).toBeInTheDocument()
  })

  it('increments round after all exercises complete', async () => {
    render(<TabataRunner {...makeProps({ workTimeSecs: 5, restTimeSecs: 3 })} />)
    // exercise 1 work + rest
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // exercise 2 work + rest (end of round 1)
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // should now be on exercise 1 of round 2
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Round 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument()
  })

  it('calls onComplete directly after last exercise of last round — no rest', async () => {
    const onComplete = jest.fn()
    render(<TabataRunner {...makeProps({ totalRounds: 1, workTimeSecs: 5, restTimeSecs: 3, onComplete })} />)
    // exercise 1 work + rest
    await act(async () => { jest.advanceTimersByTime(5000) })
    await act(async () => { jest.advanceTimersByTime(3000) })
    // exercise 2 work (last of last round)
    await act(async () => { jest.advanceTimersByTime(5000) })
    expect(onComplete).toHaveBeenCalled()
    expect(screen.queryByText('REST')).not.toBeInTheDocument()
  })

  it('Stop & Next calls onExerciseDone with elapsed time and shows REST', async () => {
    const onExerciseDone = jest.fn().mockResolvedValue(undefined)
    render(<TabataRunner {...makeProps({ workTimeSecs: 20, onExerciseDone })} />)
    act(() => { jest.advanceTimersByTime(8000) }) // 8 seconds elapsed
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Next Exercise' }))
    await act(async () => {})
    expect(onExerciseDone).toHaveBeenCalledWith('ex-1', 1, 8)
    expect(screen.getByText('REST')).toBeInTheDocument()
  })

  it('Stop & Next on last exercise of last round calls onComplete immediately', async () => {
    const onComplete = jest.fn()
    render(<TabataRunner {...makeProps({ totalRounds: 1, workTimeSecs: 20, restTimeSecs: 10, onComplete })} />)
    // complete exercise 1 naturally (work + rest)
    await act(async () => { jest.advanceTimersByTime(20000) })
    await act(async () => { jest.advanceTimersByTime(10000) })
    // now on exercise 2 (last of last round) — stop early
    act(() => { jest.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Next Exercise' }))
    await act(async () => {})
    expect(onComplete).toHaveBeenCalled()
  })

  it('Stop button is disabled while onExerciseDone is in-flight', async () => {
    let resolve!: () => void
    const onExerciseDone = jest.fn().mockReturnValue(new Promise<void>((r) => { resolve = r }))
    render(<TabataRunner {...makeProps({ workTimeSecs: 20, onExerciseDone })} />)
    act(() => { jest.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Next Exercise' }))
    expect(screen.getByRole('button', { name: 'Stop & Next Exercise' })).toBeDisabled()
    resolve()
    await act(async () => {})
  })
})
