import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
