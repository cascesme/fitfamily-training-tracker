import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-[#E85D26] text-white hover:bg-[#d05020]',
      secondary: 'border border-[rgba(255,255,255,0.08)] text-white hover:bg-[#1A1A1A]',
      ghost: 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[#1A1A1A]',
      danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
    }
    const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
