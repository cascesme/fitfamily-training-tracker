import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TimeSetLogger } from '@/components/TimeSetLogger'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

jest.mock('@/lib/audio', () => ({
  playTick: jest.fn(),
  playTimeUp: jest.fn(),
  playSetComplete: jest.fn(),
}))

jest.mock('framer-motion', () => {
  const R = jest.requireActual<typeof import('react')>('react')
  const MOTION_PROPS = new Set(['animate', 'transition', 'whileTap', 'initial', 'exit'])
  const stripped = (tag: string) =>
    R.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const rest = Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)))
      return R.createElement(tag, { ...rest, ref })
    })
  return {
    motion: {
      circle: stripped('circle'),
      div: stripped('div'),
      span: stripped('span'),
      p: stripped('p'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => R.createElement(R.Fragment, null, children),
  }
})

Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate: jest.fn() },
  writable: true,
})

const defaultProps = {
  setNumber: 1,
  totalSets: 3,
  targetReps: 30,
  trackingType: 'TIME' as const,
  onMarkDone: jest.fn(),
}

describe('TimeSetLogger', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('renders in idle state with timeLeft = targetReps', () => {
    render(<TimeSetLogger {...defaultProps} />)
    expect(screen.getByText('0:30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'tapToStart' })).toBeInTheDocument()
  })

  it('countdown ticks after start', () => {
    render(<TimeSetLogger {...defaultProps} targetReps={10} />)
    fireEvent.click(screen.getByRole('button', { name: 'tapToStart' }))
    act(() => { jest.advanceTimersByTime(3000) })
    expect(screen.getByText('0:07')).toBeInTheDocument()
  })

  it('shows done state when countdown reaches zero', () => {
    render(<TimeSetLogger {...defaultProps} targetReps={5} />)
    fireEvent.click(screen.getByRole('button', { name: 'tapToStart' }))
    act(() => { jest.advanceTimersByTime(5000) })
    expect(screen.getByText('countdownComplete')).toBeInTheDocument()
  })

  it('calls onMarkDone with elapsed duration when tapDone pressed mid-countdown', async () => {
    const onMarkDone = jest.fn().mockResolvedValue(undefined)
    render(<TimeSetLogger {...defaultProps} targetReps={10} onMarkDone={onMarkDone} />)
    fireEvent.click(screen.getByRole('button', { name: 'tapToStart' }))
    act(() => { jest.advanceTimersByTime(4000) })
    fireEvent.click(screen.getByRole('button', { name: 'tapDone' }))
    await act(async () => {})
    // elapsed = targetReps - timeLeft = 10 - 6 = 4
    expect(onMarkDone).toHaveBeenCalledWith({ durationSecs: 4 })
  })

  it('resets to idle on remount — key={currentSet} regression', () => {
    const { unmount } = render(<TimeSetLogger {...defaultProps} targetReps={30} setNumber={1} />)

    // Start countdown and let it run halfway
    fireEvent.click(screen.getByRole('button', { name: 'tapToStart' }))
    act(() => { jest.advanceTimersByTime(15000) })
    expect(screen.getByText('0:15')).toBeInTheDocument()

    // Parent applies new key for next set → unmount old, mount fresh
    unmount()
    render(<TimeSetLogger {...defaultProps} targetReps={30} setNumber={2} />)

    // Fresh mount must show idle with full targetReps — not the mid-run state
    expect(screen.getByText('0:30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'tapToStart' })).toBeInTheDocument()
  })
})
