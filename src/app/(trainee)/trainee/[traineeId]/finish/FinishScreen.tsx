'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { staggerContainer } from '@/lib/animation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  traineeId: string
  sessionId: string
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const, duration: 0.4 } },
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
    <motion.div
      className="flex flex-col items-center gap-6 py-12 text-center"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* 1. Checkmark icon */}
      <motion.div variants={itemVariants}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" stroke="#E85D26" strokeWidth="2" />
          <path d="M20 32l9 9 15-18" stroke="#E85D26" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* 2. Title + subtitle */}
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-[rgba(255,255,255,0.6)]">{t('subtitle')}</p>
      </motion.div>

      {/* 3. Divider */}
      <motion.div variants={itemVariants} className="w-full max-w-xs">
        <hr className="border-[rgba(255,255,255,0.08)]" />
      </motion.div>

      {/* 4-5. Form (calories + button) */}
      <form onSubmit={handleSave} className="flex w-full max-w-xs flex-col gap-4">
        {/* 4. Calories input */}
        <motion.div variants={itemVariants}>
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
        </motion.div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* 5. Button */}
        <motion.div variants={itemVariants}>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t('saving') : t('saveFinish')}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  )
}
