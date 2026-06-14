import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RestTimerScreen } from '@/components/RestTimerScreen'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

jest.mock('@/lib/audio', () => ({
  playTick: jest.fn(),
  playTimeUp: jest.fn(),
  playSetComplete: jest.fn(),
}))

Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate: jest.fn() },
  writable: true,
})

describe('RestTimerScreen', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('renders with default 60s duration', () => {
    render(<RestTimerScreen onComplete={jest.fn()} />)
    expect(screen.getByLabelText('rest duration seconds')).toHaveValue(60)
    expect(screen.getByText('60s')).toBeInTheDocument()
  })

  it('skip button fires onComplete immediately', () => {
    const onComplete = jest.fn()
    render(<RestTimerScreen onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'skipRest' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('custom duration updates displayed time', () => {
    render(<RestTimerScreen onComplete={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('rest duration seconds'), { target: { value: '90' } })
    expect(screen.getByText('90s')).toBeInTheDocument()
  })

  it('start button begins countdown', () => {
    render(<RestTimerScreen onComplete={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('rest duration seconds'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'startRest' }))
    act(() => { jest.advanceTimersByTime(2000) })
    expect(screen.getByText('3s')).toBeInTheDocument()
  })

  it('fires onComplete after countdown ends', () => {
    const onComplete = jest.fn()
    render(<RestTimerScreen onComplete={onComplete} />)
    fireEvent.change(screen.getByLabelText('rest duration seconds'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'startRest' }))
    act(() => { jest.advanceTimersByTime(5000) })
    act(() => { jest.advanceTimersByTime(1000) }) // flush setTimeout(800)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
