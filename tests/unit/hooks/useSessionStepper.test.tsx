import { renderHook, act } from '@testing-library/react'
import { useSessionStepper } from '@/lib/hooks/useSessionStepper'

describe('useSessionStepper', () => {
  it('defaults viewIndex to activeIndex with status current', () => {
    const { result } = renderHook(() => useSessionStepper(2, 5))
    expect(result.current.viewIndex).toBe(2)
    expect(result.current.status).toBe('current')
  })

  it('goPrev decrements viewIndex and reports completed status', () => {
    const { result } = renderHook(() => useSessionStepper(2, 5))
    act(() => result.current.goPrev())
    expect(result.current.viewIndex).toBe(1)
    expect(result.current.status).toBe('completed')
  })

  it('goPrev clamps at 0', () => {
    const { result } = renderHook(() => useSessionStepper(0, 5))
    act(() => result.current.goPrev())
    expect(result.current.viewIndex).toBe(0)
    expect(result.current.canGoPrev).toBe(false)
  })

  it('goNext increments viewIndex and reports locked status', () => {
    const { result } = renderHook(() => useSessionStepper(0, 5))
    act(() => result.current.goNext())
    expect(result.current.viewIndex).toBe(1)
    expect(result.current.status).toBe('locked')
  })

  it('goNext clamps at maxIndex', () => {
    const { result } = renderHook(() => useSessionStepper(5, 5))
    act(() => result.current.goNext())
    expect(result.current.viewIndex).toBe(5)
    expect(result.current.canGoNext).toBe(false)
  })

  it('viewIndex follows activeIndex forward when activeIndex advances', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSessionStepper(active, 5),
      { initialProps: { active: 0 } },
    )
    rerender({ active: 1 })
    expect(result.current.viewIndex).toBe(1)
    expect(result.current.status).toBe('current')
  })

  it('does not move viewIndex backward when activeIndex stays the same across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSessionStepper(active, 5),
      { initialProps: { active: 2 } },
    )
    act(() => result.current.goPrev())
    rerender({ active: 2 })
    expect(result.current.viewIndex).toBe(1)
  })
})
