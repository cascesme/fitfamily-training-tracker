'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  traineeId: string
  sessionId: string
}

export function FinishScreen({ traineeId, sessionId }: Props) {
  const t = useTranslations('finish')
  const router = useRouter()
  const [calories, setCalories] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const body: { caloriesBurned?: number } = {}
      if (calories !== '') {
        body.caloriesBurned = Number(calories)
      }
      const res = await fetch(`/api/sessions/${sessionId}/finish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setError(t('saveError'))
        return
      }
      router.push(`/trainee/${traineeId}`)
    } catch {
      setError(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      <div>
        <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-[rgba(255,255,255,0.6)]">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSave} className="flex w-full max-w-xs flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm text-[rgba(255,255,255,0.6)]">
            {t('caloriesLabel')}
          </label>
          <Input
            name="calories"
            type="number"
            min="0"
            placeholder={t('caloriesPlaceholder')}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">{t('caloriesHint')}</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t('saving') : t('saveFinish')}
        </Button>
      </form>
    </div>
  )
}
