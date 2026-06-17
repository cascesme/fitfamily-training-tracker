import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepperNav } from '@/components/StepperNav'

describe('StepperNav', () => {
  it('fires onPrev and onNext when clicked', () => {
    const onPrev = jest.fn()
    const onNext = jest.fn()
    render(
      <StepperNav
        canGoPrev
        canGoNext
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Previous exercise"
        nextLabel="Next exercise"
      />,
    )
    fireEvent.click(screen.getByLabelText('Previous exercise'))
    fireEvent.click(screen.getByLabelText('Next exercise'))
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('disables prev button when canGoPrev is false', () => {
    render(
      <StepperNav
        canGoPrev={false}
        canGoNext
        onPrev={jest.fn()}
        onNext={jest.fn()}
        prevLabel="Previous exercise"
        nextLabel="Next exercise"
      />,
    )
    expect(screen.getByLabelText('Previous exercise')).toBeDisabled()
    expect(screen.getByLabelText('Next exercise')).not.toBeDisabled()
  })

  it('disables next button when canGoNext is false', () => {
    render(
      <StepperNav
        canGoPrev
        canGoNext={false}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        prevLabel="Previous exercise"
        nextLabel="Next exercise"
      />,
    )
    expect(screen.getByLabelText('Next exercise')).toBeDisabled()
  })
})
