'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

interface Props {
  traineeId: string
  exercises: Exercise[]
}

export function ExercisePicker({ traineeId, exercises }: Props) {
  const t = useTranslations('traineeDashboard')
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <Input
        placeholder={t('searchExercise')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3"
      />
      <div className="flex flex-col gap-2">
        {filtered.map((ex) => (
          <button
            key={ex.id}
            onClick={() => router.push(`/trainee/${traineeId}/exercise/${ex.id}`)}
            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-4 py-3 text-left font-semibold transition-colors hover:border-[rgba(255,255,255,0.16)]"
          >
            {ex.name}
          </button>
        ))}
      </div>
    </div>
  )
}
