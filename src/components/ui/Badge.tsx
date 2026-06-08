import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs',
        variant === 'default' && 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]',
        variant === 'accent' && 'border-[#E85D26]/30 text-[#E85D26]',
        className
      )}
    >
      {children}
    </span>
  )
}
