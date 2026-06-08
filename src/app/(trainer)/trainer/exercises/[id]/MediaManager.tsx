'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MAX_EXERCISE_MEDIA } from '@/lib/domain/constants'
import type { ExerciseMedia, MediaType } from '@prisma/client'

interface Props {
  exerciseId: string
  initialMedia: ExerciseMedia[]
}

function SortableMediaItem({
  item,
  onDelete,
}: {
  item: ExerciseMedia
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const t = useTranslations('mediaManager')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-3"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-[rgba(255,255,255,0.4)]"
      >
        ⠿
      </span>
      <span className="flex-1 text-sm">
        {item.type === 'YOUTUBE' ? item.url : item.originalFilename ?? item.filePath}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        {t('remove')}
      </button>
    </div>
  )
}

export function MediaManager({ exerciseId, initialMedia }: Props) {
  const t = useTranslations('mediaManager')
  const router = useRouter()
  const [media, setMedia] = useState<ExerciseMedia[]>(initialMedia)
  const [mediaType, setMediaType] = useState<MediaType>('YOUTUBE')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const atLimit = media.length >= MAX_EXERCISE_MEDIA

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const previous = media
      const oldIndex = media.findIndex((m) => m.id === active.id)
      const newIndex = media.findIndex((m) => m.id === over.id)
      const reordered = arrayMove(media, oldIndex, newIndex)
      setMedia(reordered)
      try {
        const res = await fetch(`/api/exercises/${exerciseId}/media/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
        })
        if (!res.ok) {
          setMedia(previous)
          setError(t('reorderError'))
          return
        }
        router.refresh()
      } catch {
        setMedia(previous)
        setError(t('reorderError'))
      }
    },
    [media, exerciseId, router, t],
  )

  async function handleDelete(mediaId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/media/${mediaId}`, { method: 'DELETE' })
      if (!res.ok) {
        setError(t('deleteError'))
        return
      }
      setMedia((prev) => prev.filter((m) => m.id !== mediaId))
      router.refresh()
    } catch {
      setError(t('deleteError'))
    }
  }

  async function handleAddYoutube(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploading(true)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'YOUTUBE', url: youtubeUrl }),
      })
      if (res.status === 422) {
        setError(t('limitReached', { max: MAX_EXERCISE_MEDIA }))
        return
      }
      if (!res.ok) {
        setError(t('addError'))
        return
      }
      const created: ExerciseMedia = await res.json()
      setMedia((prev) => [...prev, created])
      setYoutubeUrl('')
      router.refresh()
    } catch {
      setError(t('addError'))
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', mediaType)
      const res = await fetch(`/api/exercises/${exerciseId}/media`, {
        method: 'POST',
        body: form,
      })
      if (res.status === 422) {
        setError(t('limitReached', { max: MAX_EXERCISE_MEDIA }))
        return
      }
      if (!res.ok) {
        setError(t('addError'))
        return
      }
      const created: ExerciseMedia = await res.json()
      setMedia((prev) => [...prev, created])
      router.refresh()
    } catch {
      setError(t('addError'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={media.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {media.map((item) => (
              <SortableMediaItem key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4">
        <h3 className="mb-3 text-sm font-semibold">{t('addMedia')}</h3>
        {atLimit ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-[rgba(255,255,255,0.4)]">
              {t('limitReached', { max: MAX_EXERCISE_MEDIA })}
            </p>
            <Button type="button" disabled>{t('add')}</Button>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('mediaType')}</label>
              <select
                name="mediaType"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0A0A0A] px-3 py-2 text-white"
              >
                <option value="YOUTUBE">{t('youtube')}</option>
                <option value="VIDEO">{t('video')}</option>
                <option value="PHOTO">{t('photo')}</option>
                <option value="PDF">{t('pdf')}</option>
              </select>
            </div>
            {mediaType === 'YOUTUBE' ? (
              <form onSubmit={handleAddYoutube} className="flex gap-2">
                <Input
                  name="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={uploading}>{t('add')}</Button>
              </form>
            ) : (
              <input
                type="file"
                accept={
                  mediaType === 'VIDEO'
                    ? 'video/*'
                    : mediaType === 'PHOTO'
                    ? 'image/*'
                    : 'application/pdf'
                }
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-sm text-white"
              />
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
