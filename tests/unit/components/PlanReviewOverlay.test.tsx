import React from 'react'
import { render, screen } from '@testing-library/react'
import { PlanReviewOverlay } from '@/components/PlanReviewOverlay'
import type { TrainingPlanWithDetails } from '@/lib/domain/plan'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      key,
    )
  },
}))

function buildPlan(): TrainingPlanWithDetails {
  return {
    id: 'plan1',
    name: 'Push Day',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item1',
        planId: 'plan1',
        position: 1,
        exercises: [
          {
            id: 'tpe1',
            itemId: 'item1',
            exerciseId: 'e1',
            sets: 3,
            reps: 10,
            slot: 1,
            exercise: {
              id: 'e1',
              name: 'Bench Press',
              description: 'Chest exercise',
              trackingType: 'WEIGHT',
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [
                {
                  id: 'm1',
                  exerciseId: 'e1',
                  type: 'PHOTO',
                  filePath: 'bench/1.jpg',
                  url: null,
                  originalFilename: null,
                  position: 1,
                  createdAt: new Date(),
                },
              ],
            },
          },
        ],
      },
      {
        id: 'item2',
        planId: 'plan1',
        position: 2,
        exercises: [
          {
            id: 'tpe2',
            itemId: 'item2',
            exerciseId: 'e2',
            sets: 4,
            reps: 8,
            slot: 1,
            exercise: {
              id: 'e2',
              name: 'Incline Press',
              description: null,
              trackingType: 'WEIGHT',
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [],
            },
          },
          {
            id: 'tpe3',
            itemId: 'item2',
            exerciseId: 'e3',
            sets: 4,
            reps: 8,
            slot: 2,
            exercise: {
              id: 'e3',
              name: 'Cable Fly',
              description: null,
              trackingType: 'WEIGHT',
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [],
            },
          },
        ],
      },
    ],
  }
}

describe('PlanReviewOverlay', () => {
  it('renders every exercise across all plan items', () => {
    render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Incline Press')).toBeInTheDocument()
    expect(screen.getByText('Cable Fly')).toBeInTheDocument()
  })

  it('shows sets x reps for each exercise', () => {
    render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(screen.getByText('3 × 10')).toBeInTheDocument()
    expect(screen.getAllByText('4 × 8')).toHaveLength(2)
  })

  it('groups a biseries pair under one Biseries badge', () => {
    render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(screen.getByText('biseries')).toBeInTheDocument()
  })

  it('does not show a Biseries badge for a single-exercise item', () => {
    const plan = buildPlan()
    plan.items = [plan.items[0]]
    render(<PlanReviewOverlay plan={plan} onClose={jest.fn()} />)
    expect(screen.queryByText('biseries')).not.toBeInTheDocument()
  })

  it('renders media for an exercise that has it', () => {
    const { container } = render(<PlanReviewOverlay plan={buildPlan()} onClose={jest.fn()} />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<PlanReviewOverlay plan={buildPlan()} onClose={onClose} />)
    screen.getByRole('button', { name: 'close' }).click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
