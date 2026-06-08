'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@/lib/domain/exercise'

interface Props {
  exercise: Exercise
}

export function EditExerciseForm({ exercise }: Props) {
  const t = useTranslations('exerciseDetail')
  const router = useRouter()
  const [name, setName] = useState(exercise.name)
  const [description, setDescription] = useState(exercise.description ?? '')
  const [trackingType, setTrackingType] = useState(exercise.trackingType)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/exercises/${exercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, trackingType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('saveError'))
        return
      }
      router.refresh()
    } catch {
      setError(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('name')}</label>
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('description')}</label>
        <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('trackingType')}</label>
        <select
          name="trackingType"
          value={trackingType}
          onChange={(e) => setTrackingType(e.target.value as typeof trackingType)}
          className="w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-3 py-2 text-white"
        >
          <option value="WEIGHT">{t('trackingWeight')}</option>
          <option value="TIME">{t('trackingTime')}</option>
          <option value="NONE">{t('trackingNone')}</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div>
        <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>
      </div>
    </form>
  )
}
