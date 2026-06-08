'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { Trainee } from '@prisma/client'

interface Props {
  initialTrainees: Trainee[]
}

export function TraineeList({ initialTrainees }: Props) {
  const t = useTranslations('trainees')
  const router = useRouter()
  const [trainees, setTrainees] = useState<Trainee[]>(initialTrainees)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    try {
      const res = await fetch('/api/trainees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAddError(data.error ?? t('addError'))
        return
      }
      const created: Trainee = await res.json()
      setTrainees((prev) => [...prev, created])
      setNewName('')
      router.refresh()
    } catch {
      setAddError(t('addError'))
    } finally {
      setAdding(false)
    }
  }

  function startEdit(trainee: Trainee) {
    setEditingId(trainee.id)
    setEditName(trainee.name)
  }

  async function handleSaveEdit(id: string) {
    setEditError(null)
    try {
      const res = await fetch(`/api/trainees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      if (!res.ok) {
        setEditError(t('saveEditError'))
        return
      }
      const updated: Trainee = await res.json()
      setTrainees((prev) => prev.map((tr) => (tr.id === id ? updated : tr)))
      setEditingId(null)
      router.refresh()
    } catch {
      setEditError(t('saveEditError'))
    }
  }

  async function handleDelete(id: string) {
    setDeleteErrors((prev) => ({ ...prev, [id]: '' }))
    const res = await fetch(`/api/trainees/${id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}))
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: data.error ?? t('deleteBlockedError'),
      }))
      return
    }
    if (!res.ok) {
      setDeleteErrors((prev) => ({ ...prev, [id]: t('deleteError') }))
      return
    }
    setTrainees((prev) => prev.filter((tr) => tr.id !== id))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="flex gap-3">
        <Input
          name="name"
          placeholder={t('namePlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={adding}>{adding ? t('adding') : t('add')}</Button>
      </form>
      {addError && <p className="text-sm text-red-400">{addError}</p>}

      {trainees.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {trainees.map((trainee) => (
            <Card key={trainee.id}>
              <div className="flex items-center gap-3">
                {editingId === trainee.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button onClick={() => handleSaveEdit(trainee.id)}>{t('save')}</Button>
                    <Button variant="ghost" onClick={() => { setEditingId(null); setEditError(null) }}>{t('cancel')}</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-semibold">{trainee.name}</span>
                    <Button variant="ghost" onClick={() => startEdit(trainee)}>{t('edit')}</Button>
                    <button
                      aria-label={t('deleteLabel', { name: trainee.name })}
                      onClick={() => handleDelete(trainee.id)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      {t('delete')}
                    </button>
                  </>
                )}
              </div>
              {editingId === trainee.id && editError && (
                <p className="mt-2 text-sm text-red-400">{editError}</p>
              )}
              {deleteErrors[trainee.id] && (
                <p className="mt-2 text-sm text-red-400">{deleteErrors[trainee.id]}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
