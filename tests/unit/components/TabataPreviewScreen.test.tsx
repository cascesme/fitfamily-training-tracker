import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabataPreviewScreen } from '@/components/TabataPreviewScreen'
import type { TabataExercise } from '@/components/TabataRunner'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      tabataBadge: 'TABATA',
      tabataStart: 'Start Tabata',
      tabataPreviewParams: '{rounds} rounds · {work}s / {rest}s',
    }
    const template = map[key] ?? key
    if (!params) return template
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      template,
    )
  },
}))

jest.mock('@/components/MediaStrip', () => ({
  MediaStrip: ({ media }: { media: unknown[] }) => (
    <div data-testid="media-strip" data-count={media.length} />
  ),
}))

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

const exercises: TabataExercise[] = [
  { id: 'item-1', exerciseId: 'ex-1', name: 'Push Ups', media: [] },
  { id: 'item-2', exerciseId: 'ex-2', name: 'Pull Ups', media: [] },
]

function makeProps(overrides?: Partial<React.ComponentProps<typeof TabataPreviewScreen>>) {
  return {
    exercises,
    totalRounds: 3,
    workTimeSecs: 20,
    restTimeSecs: 10,
    onStart: jest.fn(),
    ...overrides,
  }
}

describe('TabataPreviewScreen', () => {
  it('renders TABATA badge', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByText('TABATA')).toBeInTheDocument()
  })

  it('renders params summary with rounds, work, rest', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByText('3 rounds · 20s / 10s')).toBeInTheDocument()
  })

  it('renders all exercise names', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('Pull Ups')).toBeInTheDocument()
  })

  it('renders a MediaStrip for each exercise', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getAllByTestId('media-strip')).toHaveLength(2)
  })

  it('renders Start Tabata button', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.getByRole('button', { name: 'Start Tabata' })).toBeInTheDocument()
  })

  it('calls onStart when Start Tabata clicked', () => {
    const onStart = jest.fn()
    render(<TabataPreviewScreen {...makeProps({ onStart })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start Tabata' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('does not render timer UI elements', () => {
    render(<TabataPreviewScreen {...makeProps()} />)
    expect(screen.queryByText('Round 1 of 3')).not.toBeInTheDocument()
    expect(screen.queryByText('Stop & Next Exercise')).not.toBeInTheDocument()
  })
})
