'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreatePlanModal() {
  const t = useTranslations('plans')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('createError'))
        return
      }
      setOpen(false)
      setName('')
      setDescription('')
      router.refresh()
    } catch {
      setError(t('createError'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>{t('newPlan')}</Button>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('newPlan')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('name')}</label>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('description')}</label>
            <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
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
