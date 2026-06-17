'use client'

interface StepperNavProps {
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
  prevLabel: string
  nextLabel: string
}

export function StepperNav({ canGoPrev, canGoNext, onPrev, onNext, prevLabel, nextLabel }: StepperNavProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label={prevLabel}
        className="rounded-full p-1 text-[rgba(255,255,255,0.6)] hover:text-white disabled:opacity-30 disabled:hover:text-[rgba(255,255,255,0.6)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={nextLabel}
        className="rounded-full p-1 text-[rgba(255,255,255,0.6)] hover:text-white disabled:opacity-30 disabled:hover:text-[rgba(255,255,255,0.6)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
