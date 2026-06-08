import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-[rgba(255,255,255,0.6)]">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'h-10 px-3 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#E85D26] transition-colors',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'
