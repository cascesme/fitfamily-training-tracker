import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompletedItemSummary } from '@/components/CompletedItemSummary'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), key)
  },
}))

describe('CompletedItemSummary', () => {
  it('renders exercise name and one row per logged set for a WEIGHT exercise', () => {
    render(
      <CompletedItemSummary
        exercises={[
          {
            id: 'ex1',
            name: 'Bench Press',
            trackingType: 'WEIGHT',
            media: [],
            loggedSets: [
              { setNumber: 1, weightKg: 80, repsDone: 10 },
              { setNumber: 2, weightKg: 82.5, repsDone: 8 },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    const labels = screen.getAllByText(/loggedSetLabel/)
    expect(labels).toHaveLength(2)
    expect(screen.getAllByText(/loggedSetWeight/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders both exercises for a biseries pair', () => {
    render(
      <CompletedItemSummary
        exercises={[
          { id: 'a1', name: 'Bench Press', trackingType: 'WEIGHT', media: [], loggedSets: [{ setNumber: 1, weightKg: 80, repsDone: 10 }] },
          { id: 'b1', name: 'Barbell Row', trackingType: 'WEIGHT', media: [], loggedSets: [{ setNumber: 1, weightKg: 60, repsDone: 10 }] },
        ]}
      />,
    )
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Barbell Row')).toBeInTheDocument()
  })

  it('renders a media button and opens the viewer when media exists', () => {
    render(
      <CompletedItemSummary
        exercises={[
          {
            id: 'ex1',
            name: 'Bench Press',
            trackingType: 'WEIGHT',
            media: [{ id: 'm1', type: 'PHOTO', filePath: 'a.jpg', url: null, originalFilename: null, position: 1, exerciseId: 'ex1', createdAt: new Date() } as never],
            loggedSets: [{ setNumber: 1, weightKg: 80, repsDone: 10 }],
          },
        ]}
      />,
    )
    fireEvent.click(screen.getByText(/viewMedia/))
    expect(screen.getByText(/mediaCount/)).toBeInTheDocument()
  })

  it('does not render a media button when there is no media', () => {
    render(
      <CompletedItemSummary
        exercises={[{ id: 'ex1', name: 'Pull-up', trackingType: 'NONE', media: [], loggedSets: [{ setNumber: 1, repsDone: 12 }] }]}
      />,
    )
    expect(screen.queryByText(/viewMedia/)).not.toBeInTheDocument()
  })
})
