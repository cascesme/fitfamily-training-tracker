'use client'
import { useEffect, useRef, useState } from 'react'

export type StepperStatus = 'completed' | 'current' | 'locked'

interface UseSessionStepperResult {
  viewIndex: number
  goPrev: () => void
  goNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  status: StepperStatus
}

export function useSessionStepper(activeIndex: number, maxIndex: number): UseSessionStepperResult {
  const [viewIndex, setViewIndex] = useState(activeIndex)
  const prevActiveIndex = useRef(activeIndex)

  useEffect(() => {
    if (activeIndex > prevActiveIndex.current) {
      setViewIndex(activeIndex)
    }
    prevActiveIndex.current = activeIndex
  }, [activeIndex])

  const goPrev = () => setViewIndex((i) => Math.max(0, i - 1))
  const goNext = () => setViewIndex((i) => Math.min(maxIndex, i + 1))

  const status: StepperStatus =
    viewIndex < activeIndex ? 'completed' : viewIndex > activeIndex ? 'locked' : 'current'

  return {
    viewIndex,
    goPrev,
    goNext,
    canGoPrev: viewIndex > 0,
    canGoNext: viewIndex < maxIndex,
    status,
  }
}
