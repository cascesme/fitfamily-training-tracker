'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MAX_SERIES_EXERCISES } from '@/lib/domain/constants'
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

interface Row {
  exerciseId: string
  sets: string
  reps: string
}

const EMPTY_ROW: Row = { exerciseId: '', sets: '3', reps: '10' }

export function AddItemModal({ planId, allExercises, nextPosition, onSuccess, onClose }: Props) {
  const t = useTranslations('planBuilder')
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addRow() {
    if (rows.length >= MAX_SERIES_EXERCISES) return
    setRows((prev) => [...prev, { ...EMPTY_ROW, sets: prev[0].sets }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i === index) return { ...r, ...patch }
        if (index === 0 && patch.sets !== undefined) return { ...r, sets: patch.sets }
        return r
      }),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const missingIndex = rows.findIndex((r) => !r.exerciseId)
    if (missingIndex !== -1) {
      setError(t('exerciseRequired', { n: missingIndex + 1 }))
      return
    }

    setSaving(true)
    try {
      const body = {
        position: nextPosition,
        exercises: rows.map((r, i) => ({
          exerciseId: r.exerciseId,
          sets: Number(r.sets),
          reps: Number(r.reps),
          order: i + 1,
        })),
      }

      const res = await fetch(`/api/plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

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
          {rows.map((row, i) => {
            const selectedEx = allExercises.find((e) => e.id === row.exerciseId) ?? null
            return (
              <div key={i} className={i > 0 ? 'flex flex-col gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4' : 'flex flex-col gap-3'}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[rgba(255,255,255,0.6)]">{t('exerciseNLabel', { n: i + 1 })}</p>
                  {i > 0 && (
                    <button type="button" onClick={() => removeRow(i)} className="text-sm text-red-400 hover:text-red-300">
                      {t('removeItem')}
                    </button>
                  )}
                </div>
                <ExercisePicker
                  placeholder={t('exerciseNPlaceholder', { n: i + 1 })}
                  exercises={allExercises}
                  value={row.exerciseId}
                  onChange={(id) => updateRow(i, { exerciseId: id })}
                />
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                    <Input
                      name={`sets${i + 1}`}
                      type="number"
                      min="1"
                      value={row.sets}
                      onChange={(e) => updateRow(i, { sets: e.target.value })}
                      required
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">
                      {selectedEx?.trackingType === 'TIME' ? t('duration') : t('reps')}
                    </label>
                    <Input
                      name={`reps${i + 1}`}
                      type="number"
                      min="1"
                      value={row.reps}
                      onChange={(e) => updateRow(i, { reps: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {rows.length < MAX_SERIES_EXERCISES && (
            <Button type="button" variant="ghost" onClick={addRow}>
              {t('addExercise')}
            </Button>
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
