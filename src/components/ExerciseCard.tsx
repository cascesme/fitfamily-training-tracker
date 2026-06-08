import Link from 'next/link'
import type { Exercise } from '@prisma/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ExerciseCardProps {
  exercise: Exercise
  href?: string
  onClick?: () => void
}

export function ExerciseCard({ exercise, href, onClick }: ExerciseCardProps) {
  const content = (
    <Card className="cursor-pointer hover:border-[rgba(255,255,255,0.16)] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold">{exercise.name}</h3>
          {exercise.description && (
            <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)] line-clamp-2">{exercise.description}</p>
          )}
        </div>
        <Badge>{exercise.trackingType}</Badge>
      </div>
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  if (onClick) return <button onClick={onClick} className="w-full text-left">{content}</button>
  return content
}
