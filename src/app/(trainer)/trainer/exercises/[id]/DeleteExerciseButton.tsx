'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

interface Props {
  id: string
}

export function DeleteExerciseButton({ id }: Props) {
  const t = useTranslations('exerciseDetail')
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t('deleteBlockedError'))
        setConfirming(false)
        return
      }
      if (!res.ok) {
        setError(t('deleteError'))
        setConfirming(false)
        return
      }
      router.push('/trainer/exercises')
      router.refresh()
    } catch {
      setError(t('deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!confirming ? (
        <Button variant="ghost" onClick={() => setConfirming(true)}>{t('delete')}</Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('deleting') : t('confirmDelete')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>{t('cancel')}</Button>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
