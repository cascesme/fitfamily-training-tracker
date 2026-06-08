'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreateExerciseModal() {
  const t = useTranslations('exercises')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trackingType, setTrackingType] = useState<'WEIGHT' | 'TIME' | 'NONE'>('WEIGHT')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, trackingType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('createError'))
        return
      }
      setOpen(false)
      setName('')
      setDescription('')
      setTrackingType('WEIGHT')
      router.refresh()
    } catch {
      setError(t('createError'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>{t('newExercise')}</Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('newExercise')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('name')}</label>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('description')}</label>
            <Input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('trackingType')}</label>
            <select
              name="trackingType"
              value={trackingType}
              onChange={(e) => setTrackingType(e.target.value as 'WEIGHT' | 'TIME' | 'NONE')}
              className="w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-3 py-2 text-white"
            >
              <option value="WEIGHT">{t('trackingWeight')}</option>
              <option value="TIME">{t('trackingTime')}</option>
              <option value="NONE">{t('trackingNone')}</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
