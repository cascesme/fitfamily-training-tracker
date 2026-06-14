'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

interface Props {
  planId: string
  allExercises: Exercise[]
  nextPosition: number
  onSuccess: () => void
  onClose: () => void
}

interface ExercisePickerProps {
  placeholder: string
  exercises: Exercise[]
  value: string
  onChange: (id: string) => void
}

function ExercisePicker({ placeholder, exercises, value, onChange }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  )
  const selected = exercises.find((e) => e.id === value)

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={selected ? selected.name : query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && !selected && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A]">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.06)]"
              onClick={() => {
                onChange(ex.id)
                setQuery('')
                setOpen(false)
              }}
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AddItemModal({ planId, allExercises, nextPosition, onSuccess, onClose }: Props) {
  const t = useTranslations('planBuilder')
  const [type, setType] = useState<'single' | 'biseries'>('single')

  const [exerciseId1, setExerciseId1] = useState('')
  const [sets1, setSets1] = useState('3')
  const [reps1, setReps1] = useState('10')

  const [exerciseId2, setExerciseId2] = useState('')
  const [sets2, setSets2] = useState('3')
  const [reps2, setReps2] = useState('10')

  useEffect(() => {
    if (type === 'biseries') setSets2(sets1)
  }, [type])

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedEx1 = allExercises.find((e) => e.id === exerciseId1) ?? null
  const selectedEx2 = allExercises.find((e) => e.id === exerciseId2) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!exerciseId1) {
      setError(t('slot1Required'))
      return
    }
    if (type === 'biseries' && !exerciseId2) {
      setError(t('slot2Required'))
      return
    }

    setSaving(true)
    try {
      const body =
        type === 'single'
          ? {
              position: nextPosition,
              exercises: [
                { exerciseId: exerciseId1, sets: Number(sets1), reps: Number(reps1), slot: 1 },
              ],
            }
          : {
              position: nextPosition,
              exercises: [
                { exerciseId: exerciseId1, sets: Number(sets1), reps: Number(reps1), slot: 1 },
                { exerciseId: exerciseId2, sets: Number(sets2), reps: Number(reps2), slot: 2 },
              ],
            }

      const res = await fetch(`/api/plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 422) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('slot1Required'))
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('addItemError'))
        return
      }
      onSuccess()
    } catch {
      setError(t('addItemError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('addItem')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('single')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                type === 'single'
                  ? 'bg-[#E85D26] text-white'
                  : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
              }`}
            >
              {t('single')}
            </button>
            <button
              type="button"
              onClick={() => setType('biseries')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                type === 'biseries'
                  ? 'bg-[#E85D26] text-white'
                  : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
              }`}
            >
              {t('biseries')}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-[rgba(255,255,255,0.6)]">
              {type === 'biseries' ? t('slot1Label') : t('exerciseLabel')}
            </p>
            <ExercisePicker
              placeholder={type === 'biseries' ? t('exercise1Placeholder') : t('exercisePlaceholder')}
              exercises={allExercises}
              value={exerciseId1}
              onChange={setExerciseId1}
            />
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                <Input name="sets1" type="number" min="1" value={sets1} onChange={(e) => {
                  setSets1(e.target.value)
                  if (type === 'biseries') setSets2(e.target.value)
                }} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">
                  {selectedEx1?.trackingType === 'TIME' ? t('duration') : t('reps')}
                </label>
                <Input name="reps1" type="number" min="1" value={reps1} onChange={(e) => setReps1(e.target.value)} required />
              </div>
            </div>
          </div>

          {type === 'biseries' && (
            <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
              <p className="text-sm text-[rgba(255,255,255,0.6)]">{t('slot2Label')}</p>
              <ExercisePicker
                placeholder={t('exercise2Placeholder')}
                exercises={allExercises}
                value={exerciseId2}
                onChange={setExerciseId2}
              />
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                  <Input name="sets2" type="number" min="1" value={sets2} onChange={(e) => setSets2(e.target.value)} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">
                    {selectedEx2?.trackingType === 'TIME' ? t('duration') : t('reps')}
                  </label>
                  <Input name="reps2" type="number" min="1" value={reps2} onChange={(e) => setReps2(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? t('saving') : t('addItem')}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
