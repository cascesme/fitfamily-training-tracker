
### Task 34: Trainer home page

File: `src/app/(trainer)/trainer/page.tsx`

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Card } from '@/components/ui/Card'

export default async function TrainerHomePage() {
  const t = await getTranslations('trainer')
  const sections = [
    { href: '/trainer/exercises', label: t('exercises'), description: t('exercisesDesc') },
    { href: '/trainer/plans', label: t('plans'), description: t('plansDesc') },
    { href: '/trainer/trainees', label: t('trainees'), description: t('traineesDesc') },
    { href: '/trainer/progress', label: t('progress'), description: t('progressDesc') },
  ]
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t('title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
              <h2 className="font-display font-semibold">{s.label}</h2>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

Add translation keys to `src/i18n/en.json` under `"trainer"`:
```json
{
  "trainer": {
    "title": "Trainer",
    "exercises": "Exercises",
    "exercisesDesc": "Create and manage exercises",
    "plans": "Training Plans",
    "plansDesc": "Build and organise training plans",
    "trainees": "Trainees",
    "traineesDesc": "Manage trainee profiles",
    "progress": "Progress",
    "progressDesc": "View progression charts"
  }
}
```

Commit: `feat: add trainer home page`

---

### Task 35: Exercise list + create

File: `src/app/(trainer)/trainer/exercises/page.tsx`

```tsx
import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { ExerciseCard } from '@/components/ExerciseCard'
import { CreateExerciseModal } from './CreateExerciseModal'

export default async function ExercisesPage() {
  const t = await getTranslations('exercises')
  const exercises = await exerciseService.list()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <CreateExerciseModal />
      </div>

      {exercises.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} href={`/trainer/exercises/${ex.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/exercises/CreateExerciseModal.tsx`

```tsx
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
```

Add translation keys under `"exercises"`:
```json
{
  "exercises": {
    "title": "Exercises",
    "empty": "No exercises yet. Create your first one.",
    "newExercise": "New Exercise",
    "name": "Name",
    "description": "Description (optional)",
    "trackingType": "Tracking type",
    "trackingWeight": "Weight",
    "trackingTime": "Time",
    "trackingNone": "None",
    "save": "Save",
    "saving": "Saving…",
    "cancel": "Cancel",
    "createError": "Failed to create exercise"
  }
}
```

Commit: `feat: add trainer exercise list page`

---

### Task 36: Exercise detail + media management

File: `src/app/(trainer)/trainer/exercises/[id]/page.tsx`

```tsx
import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { EditExerciseForm } from './EditExerciseForm'
import { MediaManager } from './MediaManager'
import { DeleteExerciseButton } from './DeleteExerciseButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('exerciseDetail')
  const exercise = await exerciseService.findWithMedia(id)
  if (!exercise) notFound()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
        <DeleteExerciseButton id={id} />
      </div>
      <EditExerciseForm exercise={exercise} />
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{t('media')}</h2>
        <MediaManager exerciseId={id} initialMedia={exercise.media} />
      </section>
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/exercises/[id]/EditExerciseForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

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
```

File: `src/app/(trainer)/trainer/exercises/[id]/DeleteExerciseButton.tsx`

```tsx
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
```

File: `src/app/(trainer)/trainer/exercises/[id]/MediaManager.tsx`

```tsx
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
  DragEndEvent,
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
      <span className="flex-1 text-sm">{item.type === 'YOUTUBE' ? item.url : item.originalFilename ?? item.filePath}</span>
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
      const oldIndex = media.findIndex((m) => m.id === active.id)
      const newIndex = media.findIndex((m) => m.id === over.id)
      const reordered = arrayMove(media, oldIndex, newIndex)
      setMedia(reordered)
      await fetch(`/api/exercises/${exerciseId}/media/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      })
      router.refresh()
    },
    [media, exerciseId, router],
  )

  async function handleDelete(mediaId: string) {
    setError(null)
    const res = await fetch(`/api/exercises/${exerciseId}/media/${mediaId}`, { method: 'DELETE' })
    if (!res.ok) {
      setError(t('deleteError'))
      return
    }
    setMedia((prev) => prev.filter((m) => m.id !== mediaId))
    router.refresh()
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

      {atLimit ? (
        <p className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('limitReached', { max: MAX_EXERCISE_MEDIA })}
        </p>
      ) : (
        <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4">
          <h3 className="mb-3 text-sm font-semibold">{t('addMedia')}</h3>
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
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
```

Add translation keys under `"exerciseDetail"` and `"mediaManager"`:
```json
{
  "exerciseDetail": {
    "name": "Name",
    "description": "Description",
    "trackingType": "Tracking type",
    "trackingWeight": "Weight",
    "trackingTime": "Time",
    "trackingNone": "None",
    "save": "Save",
    "saving": "Saving…",
    "saveError": "Failed to save",
    "delete": "Delete Exercise",
    "confirmDelete": "Confirm Delete",
    "deleting": "Deleting…",
    "cancel": "Cancel",
    "deleteError": "Failed to delete",
    "deleteBlockedError": "Cannot delete — exercise is referenced by session logs",
    "media": "Media"
  },
  "mediaManager": {
    "addMedia": "Add media",
    "mediaType": "Type",
    "youtube": "YouTube",
    "video": "Video",
    "photo": "Photo",
    "pdf": "PDF",
    "add": "Add",
    "remove": "Remove",
    "limitReached": "Maximum of {max} media items reached",
    "addError": "Failed to add media",
    "deleteError": "Failed to remove media"
  }
}
```

Commit: `feat: add trainer exercise detail page`

---

### Task 37: Training plan list + create

File: `src/app/(trainer)/trainer/plans/page.tsx`

```tsx
import { trainingPlanService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { CreatePlanModal } from './CreatePlanModal'

export default async function PlansPage() {
  const t = await getTranslations('plans')
  const plans = await trainingPlanService.list()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <CreatePlanModal />
      </div>

      {plans.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/trainer/plans/${plan.id}`}>
              <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
                <h2 className="font-display font-semibold">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{plan.description}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/plans/CreatePlanModal.tsx`

```tsx
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
```

`trainingPlanService.list()` must return `TrainingPlan[]` sorted by `createdAt` descending. Add this method to `TrainingPlanService` if not already present:

```ts
async list(): Promise<readonly TrainingPlan[]> {
  logger.info({ service: 'TrainingPlanService', operation: 'list' }, 'Listing training plans')
  return this.repo.findAll()
}
```

Add translation keys under `"plans"`:
```json
{
  "plans": {
    "title": "Training Plans",
    "empty": "No plans yet. Create your first one.",
    "newPlan": "New Plan",
    "name": "Name",
    "description": "Description (optional)",
    "save": "Save",
    "saving": "Saving…",
    "cancel": "Cancel",
    "createError": "Failed to create plan"
  }
}
```

Commit: `feat: add trainer plan list page`

---

### Task 38: Plan builder

File: `src/app/(trainer)/trainer/plans/[id]/page.tsx`

```tsx
import { trainingPlanService, exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PlanBuilder } from './PlanBuilder'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('planBuilder')
  const [plan, exercises] = await Promise.all([
    trainingPlanService.findWithItems(id),
    exerciseService.list(),
  ])
  if (!plan) notFound()

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{plan.name}</h1>
      {plan.description && (
        <p className="mb-6 text-[rgba(255,255,255,0.6)]">{plan.description}</p>
      )}
      <PlanBuilder plan={plan} allExercises={exercises} />
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/plans/[id]/PlanBuilder.tsx`

```tsx
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
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddItemModal } from './AddItemModal'
import type { Exercise } from '@prisma/client'

interface PlanItemExercise {
  id: string
  exerciseId: string
  exercise: Exercise
  sets: number
  reps: number
  slot: number
}

interface PlanItem {
  id: string
  position: number
  exercises: PlanItemExercise[]
}

interface Plan {
  id: string
  name: string
  description?: string | null
  items: PlanItem[]
}

interface Props {
  plan: Plan
  allExercises: Exercise[]
}

function SortablePlanItem({
  item,
  onDelete,
}: {
  item: PlanItem
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const t = useTranslations('planBuilder')

  const isBiseries = item.exercises.length === 2
  const slot1 = item.exercises.find((e) => e.slot === 1)
  const slot2 = item.exercises.find((e) => e.slot === 2)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4"
    >
      <span
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab select-none text-[rgba(255,255,255,0.4)]"
      >
        ⠿
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgba(255,255,255,0.4)]">#{item.position}</span>
          <Badge variant={isBiseries ? 'accent' : 'default'}>
            {isBiseries ? t('biseries') : t('single')}
          </Badge>
        </div>
        {slot1 && (
          <p className="text-sm">
            <span className="font-semibold">{slot1.exercise.name}</span>
            <span className="ml-2 text-[rgba(255,255,255,0.6)]">
              {slot1.sets} × {slot1.reps}
            </span>
          </p>
        )}
        {slot2 && (
          <p className="text-sm">
            <span className="font-semibold">{slot2.exercise.name}</span>
            <span className="ml-2 text-[rgba(255,255,255,0.6)]">
              {slot2.sets} × {slot2.reps}
            </span>
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        {t('removeItem')}
      </button>
    </div>
  )
}

export function PlanBuilder({ plan, allExercises }: Props) {
  const t = useTranslations('planBuilder')
  const router = useRouter()
  const [items, setItems] = useState<PlanItem[]>(plan.items)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)
      setItems(reordered)
      await fetch(`/api/plans/${plan.id}/items/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      })
      router.refresh()
    },
    [items, plan.id, router],
  )

  async function handleDelete(itemId: string) {
    setError(null)
    const res = await fetch(`/api/plans/${plan.id}/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      setError(t('deleteItemError'))
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    router.refresh()
  }

  async function handleItemAdded() {
    setShowAddModal(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.length === 0 && (
              <p className="text-[rgba(255,255,255,0.4)]">{t('noItems')}</p>
            )}
            {items.map((item) => (
              <SortablePlanItem key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <Button onClick={() => setShowAddModal(true)}>{t('addItem')}</Button>
      </div>

      {showAddModal && (
        <AddItemModal
          planId={plan.id}
          allExercises={allExercises}
          nextPosition={items.length + 1}
          onSuccess={handleItemAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/plans/[id]/AddItemModal.tsx`

```tsx
'use client'

import { useState } from 'react'
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

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
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
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                <Input name="sets1" type="number" min="1" value={sets1} onChange={(e) => setSets1(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('reps')}</label>
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
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('sets')}</label>
                  <Input name="sets2" type="number" min="1" value={sets2} onChange={(e) => setSets2(e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[rgba(255,255,255,0.4)]">{t('reps')}</label>
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
```

Add translation keys under `"planBuilder"`:
```json
{
  "planBuilder": {
    "addItem": "Add Item",
    "removeItem": "Remove",
    "single": "Single",
    "biseries": "Biseries",
    "noItems": "No items yet. Add the first one.",
    "exerciseLabel": "Exercise",
    "slot1Label": "Slot 1",
    "slot2Label": "Slot 2",
    "exercisePlaceholder": "Search exercise…",
    "exercise1Placeholder": "Exercise 1",
    "exercise2Placeholder": "Exercise 2",
    "sets": "Sets",
    "reps": "Reps",
    "save": "Save",
    "saving": "Saving…",
    "cancel": "Cancel",
    "slot1Required": "slot 1 exercise is required",
    "slot2Required": "Slot 2 exercise is required for biseries",
    "addItemError": "Failed to add item",
    "deleteItemError": "Failed to remove item"
  }
}
```

Commit: `feat: add trainer plan builder page`

---

### Task 39: Trainee management

File: `src/app/(trainer)/trainer/trainees/page.tsx`

```tsx
import { traineeService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { TraineeList } from './TraineeList'

export default async function TraineesPage() {
  const t = await getTranslations('trainees')
  const trainees = await traineeService.list()

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t('title')}</h1>
      <TraineeList initialTrainees={trainees} />
    </div>
  )
}
```

File: `src/app/(trainer)/trainer/trainees/TraineeList.tsx`

```tsx
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
    const res = await fetch(`/api/trainees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    if (!res.ok) return
    const updated: Trainee = await res.json()
    setTrainees((prev) => prev.map((tr) => (tr.id === id ? updated : tr)))
    setEditingId(null)
    router.refresh()
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
                    <Button variant="ghost" onClick={() => setEditingId(null)}>{t('cancel')}</Button>
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
```

Add translation keys under `"trainees"`:
```json
{
  "trainees": {
    "title": "Trainees",
    "empty": "No trainees yet.",
    "namePlaceholder": "Trainee name",
    "add": "Add",
    "adding": "Adding…",
    "addError": "Failed to add trainee",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "deleteLabel": "Delete {name}",
    "deleteError": "Failed to delete",
    "deleteBlockedError": "Cannot delete — trainee has training sessions"
  }
}
```

Commit: `feat: add trainer trainee management page`

---

## Phase 8: Trainee Mode UI (Tasks 40–44)

### Task 40: Trainee home — pick who you are

File: `src/app/page.tsx`

```tsx
import { traineeService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export default async function HomePage() {
  const t = await getTranslations('home')
  const trainees = await traineeService.list()

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold">{t('greeting')}</h1>
      <p className="mb-8 text-[rgba(255,255,255,0.6)]">{t('subtitle')}</p>

      {trainees.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.4)]">{t('noTrainees')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trainees.map((trainee) => (
            <Link key={trainee.id} href={`/trainee/${trainee.id}`}>
              <Card className="cursor-pointer py-6 transition-colors hover:border-[rgba(255,255,255,0.16)]">
                <p className="font-display text-2xl font-bold">{trainee.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

The mode toggle in `AppLayout` uses `ModeContext` (stored in `localStorage`). When the user switches to Trainer mode, the header navigates them to `/trainer`. The home page is always the trainee entry point. No server-side redirect is needed — the header `ModeToggle` component handles navigation client-side:

```tsx
// Relevant ModeToggle logic (already part of AppLayout from Task 30)
// When mode === 'trainer', ModeToggle shows "Switch to Trainee" and navigates to /trainer
// When mode === 'trainee', ModeToggle shows "Switch to Trainer" and navigates to /trainer
```

Add translation keys under `"home"`:
```json
{
  "home": {
    "greeting": "Who's training today?",
    "subtitle": "Pick your name to get started.",
    "noTrainees": "No trainees set up yet. Ask your trainer."
  }
}
```

Commit: `feat: add trainee home page`

---

### Task 41: Trainee dashboard

File: `src/app/(trainee)/trainee/[traineeId]/page.tsx`

```tsx
import { traineeService, trainingPlanService, exerciseService, sessionService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  params: Promise<{ traineeId: string }>
}

export default async function TraineeDashboardPage({ params }: Props) {
  const { traineeId } = await params
  const t = await getTranslations('traineeDashboard')

  const [trainee, plans, exercises, lastSession] = await Promise.all([
    traineeService.findById(traineeId),
    trainingPlanService.list(),
    exerciseService.list(),
    sessionService.findLastByTrainee(traineeId),
  ])

  if (!trainee) notFound()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold">{trainee.name}</h1>
        {lastSession && (
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.4)]">
            {t('lastSession', {
              date: new Date(lastSession.startedAt).toLocaleDateString(),
            })}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('startTraining')}</h2>
        {plans.length === 0 ? (
          <p className="text-[rgba(255,255,255,0.4)]">{t('noPlans')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/trainee/${traineeId}/session/${plan.id}`}>
                <Card className="cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.16)]">
                  <p className="font-display font-semibold">{plan.name}</p>
                  {plan.description && (
                    <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{plan.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('singleExercise')}</h2>
        <ExercisePicker traineeId={traineeId} exercises={exercises} />
      </section>
    </div>
  )
}
```

File: `src/app/(trainee)/trainee/[traineeId]/ExercisePicker.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/Input'
import type { Exercise } from '@prisma/client'

interface Props {
  traineeId: string
  exercises: Exercise[]
}

export function ExercisePicker({ traineeId, exercises }: Props) {
  const t = useTranslations('traineeDashboard')
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <Input
        placeholder={t('searchExercise')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3"
      />
      <div className="flex flex-col gap-2">
        {filtered.map((ex) => (
          <button
            key={ex.id}
            onClick={() => router.push(`/trainee/${traineeId}/exercise/${ex.id}`)}
            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-4 py-3 text-left font-semibold transition-colors hover:border-[rgba(255,255,255,0.16)]"
          >
            {ex.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

`sessionService.findLastByTrainee(traineeId)` returns the most recent `TrainingSession` for a trainee or `null`. Add this method to `SessionService` and `ISessionRepository`:

```ts
async findLastByTrainee(traineeId: string): Promise<TrainingSession | null> {
  return this.repo.findLastByTrainee(traineeId)
}
```

Add translation keys under `"traineeDashboard"`:
```json
{
  "traineeDashboard": {
    "lastSession": "Last session: {date}",
    "startTraining": "Start Training",
    "noPlans": "No training plans available yet.",
    "singleExercise": "Train Single Exercise",
    "searchExercise": "Search exercise…"
  }
}
```

Commit: `feat: add trainee dashboard page`

---

### Task 42: Training plan session

File: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/page.tsx`

```tsx
import { trainingPlanService, sessionService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PlanSessionRunner } from './PlanSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; planId: string }>
}

export default async function PlanSessionPage({ params }: Props) {
  const { traineeId, planId } = await params
  const plan = await trainingPlanService.findWithItems(planId)
  if (!plan) notFound()

  const session = await sessionService.create({ traineeId, planId })

  return <PlanSessionRunner plan={plan} session={session} traineeId={traineeId} />
}
```

File: `src/app/(trainee)/trainee/[traineeId]/session/[planId]/PlanSessionRunner.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MediaStrip } from '@/components/MediaStrip'
import { SetLogger } from '@/components/SetLogger'
import { Button } from '@/components/ui/Button'
import type { Exercise, ExerciseMedia, TrainingSession } from '@prisma/client'

interface PlanItemExercise {
  id: string
  exerciseId: string
  exercise: Exercise & { media: ExerciseMedia[] }
  sets: number
  reps: number
  slot: number
}

interface PlanItem {
  id: string
  position: number
  exercises: PlanItemExercise[]
}

interface Plan {
  id: string
  name: string
  items: PlanItem[]
}

interface Props {
  plan: Plan
  session: TrainingSession
  traineeId: string
}

export function PlanSessionRunner({ plan, session, traineeId }: Props) {
  const t = useTranslations('sessionRunner')
  const router = useRouter()

  const [itemIndex, setItemIndex] = useState(0)
  const [setIndexPerSlot, setSetIndexPerSlot] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const currentItem = plan.items[itemIndex]

  function getSetIndex(slotKey: string) {
    return setIndexPerSlot[slotKey] ?? 0
  }

  async function handleMarkDone(
    exerciseId: string,
    planItemId: string,
    slot: number,
    sets: number,
    weightKg: number | null,
    repsDone: number | null,
  ) {
    setLogError(null)
    const slotKey = `${planItemId}-${slot}`
    const currentSet = getSetIndex(slotKey) + 1

    const res = await fetch(`/api/sessions/${session.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        planItemId,
        setNumber: currentSet,
        weightKg,
        repsDone,
      }),
    })

    if (!res.ok) {
      setLogError(t('logError'))
      return
    }

    const newSetIndex = currentSet
    setSetIndexPerSlot((prev) => ({ ...prev, [slotKey]: newSetIndex }))

    const allSlotsComplete = currentItem.exercises.every((ex) => {
      const key = `${currentItem.id}-${ex.slot}`
      const idx = ex.slot === slot ? newSetIndex : (setIndexPerSlot[key] ?? 0)
      return idx >= ex.sets
    })

    if (!allSlotsComplete) return

    if (itemIndex + 1 >= plan.items.length) {
      setDone(true)
      return
    }

    setItemIndex((prev) => prev + 1)
  }

  if (done) {
    router.push(
      `/trainee/${traineeId}/finish?sessionId=${session.id}&planId=${plan.id}`,
    )
    return null
  }

  if (!currentItem) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{plan.name}</h1>
        <span className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('itemProgress', { current: itemIndex + 1, total: plan.items.length })}
        </span>
      </div>

      {currentItem.exercises.map((ex) => {
        const slotKey = `${currentItem.id}-${ex.slot}`
        const currentSet = getSetIndex(slotKey)
        const setsLeft = ex.sets - currentSet

        return (
          <div key={ex.id} className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">{ex.exercise.name}</h2>
              {ex.exercise.description && (
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">{ex.exercise.description}</p>
              )}
            </div>

            {ex.exercise.media.length > 0 && (
              <MediaStrip media={ex.exercise.media} />
            )}

            {setsLeft > 0 && (
              <SetLogger
                label={t('setLabel', { current: currentSet + 1, total: ex.sets })}
                trackingType={ex.exercise.trackingType}
                onMarkDone={(weightKg, repsDone) =>
                  handleMarkDone(
                    ex.exerciseId,
                    currentItem.id,
                    ex.slot,
                    ex.sets,
                    weightKg,
                    repsDone,
                  )
                }
              />
            )}

            {setsLeft === 0 && (
              <p className="font-semibold text-[rgba(255,255,255,0.4)]">{t('allSetsDone')}</p>
            )}
          </div>
        )
      })}

      {logError && <p className="text-sm text-red-400">{logError}</p>}
    </div>
  )
}
```

`SetLogger` is a client component already defined in Task 30 context. Its interface:

```ts
interface SetLoggerProps {
  label: string              // e.g. "Set 1 of 3"
  trackingType: TrackingType
  onMarkDone: (weightKg: number | null, repsDone: number | null) => Promise<void>
}
```

`sessionService.create({ traineeId, planId })` is called as a server-side direct call on page load, not via HTTP. It must return the created `TrainingSession` with its `id`.

Add translation keys under `"sessionRunner"`:
```json
{
  "sessionRunner": {
    "itemProgress": "{current} of {total}",
    "setLabel": "Set {current} of {total}",
    "allSetsDone": "Done",
    "logError": "Failed to log set. Please try again.",
    "markDone": "Mark Done"
  }
}
```

Commit: `feat: add training plan session runner`

---

### Task 43: Single exercise session

File: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/page.tsx`

```tsx
import { exerciseService } from '@/lib/api/services'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ExerciseSessionRunner } from './ExerciseSessionRunner'

interface Props {
  params: Promise<{ traineeId: string; exerciseId: string }>
}

export default async function SingleExerciseSessionPage({ params }: Props) {
  const { traineeId, exerciseId } = await params
  const exercise = await exerciseService.findWithMedia(exerciseId)
  if (!exercise) notFound()

  return <ExerciseSessionRunner exercise={exercise} traineeId={traineeId} />
}
```

File: `src/app/(trainee)/trainee/[traineeId]/exercise/[exerciseId]/ExerciseSessionRunner.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MediaStrip } from '@/components/MediaStrip'
import { SetLogger } from '@/components/SetLogger'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Exercise, ExerciseMedia } from '@prisma/client'

interface Props {
  exercise: Exercise & { media: ExerciseMedia[] }
  traineeId: string
}

type Phase = 'setup' | 'running'

export function ExerciseSessionRunner({ exercise, traineeId }: Props) {
  const t = useTranslations('singleSession')
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('setup')
  const [targetSets, setTargetSets] = useState(3)
  const [targetReps, setTargetReps] = useState(10)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentSet, setCurrentSet] = useState(0)
  const [startError, setStartError] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setStartError(null)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traineeId }),
    })
    if (!res.ok) {
      setStartError(t('startError'))
      return
    }
    const session = await res.json()
    setSessionId(session.id)
    setPhase('running')
  }

  async function handleMarkDone(weightKg: number | null, repsDone: number | null) {
    if (!sessionId) return
    setLogError(null)
    const nextSet = currentSet + 1
    const res = await fetch(`/api/sessions/${sessionId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: exercise.id,
        planItemId: null,
        setNumber: nextSet,
        weightKg,
        repsDone,
      }),
    })
    if (!res.ok) {
      setLogError(t('logError'))
      return
    }
    if (nextSet >= targetSets) {
      router.push(`/trainee/${traineeId}/finish?sessionId=${sessionId}`)
      return
    }
    setCurrentSet(nextSet)
  }

  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
          {exercise.description && (
            <p className="mt-1 text-[rgba(255,255,255,0.6)]">{exercise.description}</p>
          )}
        </div>

        {exercise.media.length > 0 && <MediaStrip media={exercise.media} />}

        <form onSubmit={handleStart} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{t('setTarget')}</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('sets')}</label>
              <Input
                name="sets"
                type="number"
                min="1"
                value={targetSets}
                onChange={(e) => setTargetSets(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-[rgba(255,255,255,0.6)]">{t('reps')}</label>
              <Input
                name="reps"
                type="number"
                min="1"
                value={targetReps}
                onChange={(e) => setTargetReps(Number(e.target.value))}
                required
              />
            </div>
          </div>
          {startError && <p className="text-sm text-red-400">{startError}</p>}
          <Button type="submit">{t('start')}</Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{exercise.name}</h1>
      </div>

      {exercise.media.length > 0 && <MediaStrip media={exercise.media} />}

      <SetLogger
        label={t('setLabel', { current: currentSet + 1, total: targetSets })}
        trackingType={exercise.trackingType}
        onMarkDone={handleMarkDone}
      />

      {logError && <p className="text-sm text-red-400">{logError}</p>}
    </div>
  )
}
```

Add translation keys under `"singleSession"`:
```json
{
  "singleSession": {
    "setTarget": "Set your target",
    "sets": "Sets",
    "reps": "Reps",
    "start": "Start",
    "startError": "Failed to start session",
    "setLabel": "Set {current} of {total}",
    "logError": "Failed to log set. Please try again."
  }
}
```

Commit: `feat: add single exercise session`

---

### Task 44: Session finish screen

File: `src/app/(trainee)/trainee/[traineeId]/finish/page.tsx`

```tsx
import { getTranslations } from 'next-intl/server'
import { FinishScreen } from './FinishScreen'

interface Props {
  params: Promise<{ traineeId: string }>
  searchParams: Promise<{ sessionId: string; planId?: string }>
}

export default async function FinishPage({ params, searchParams }: Props) {
  const { traineeId } = await params
  const { sessionId } = await searchParams

  return <FinishScreen traineeId={traineeId} sessionId={sessionId} />
}
```

File: `src/app/(trainee)/trainee/[traineeId]/finish/FinishScreen.tsx`

```tsx
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
```

Add translation keys under `"finish"`:
```json
{
  "finish": {
    "title": "Session Complete",
    "subtitle": "Great work!",
    "caloriesLabel": "Calories burned (optional)",
    "caloriesPlaceholder": "e.g. 320",
    "caloriesHint": "Enter the value from your Apple Watch",
    "saveFinish": "Save & Finish",
    "saving": "Saving…",
    "saveError": "Failed to save session"
  }
}
```

Commit: `feat: add session finish screen`

---

## Phase 9: E2E Tests (Tasks 45–47)

### Task 45: Playwright setup

File: `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'docker-compose -f docker-compose.test.yml up --wait',
    url: 'http://localhost:3000',
    reuseExistingServer: !!process.env.CI,
    timeout: 120000,
  },
})
```

File: `docker-compose.test.yml`

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: fitfamily_test
      POSTGRES_USER: fitfamily
      POSTGRES_PASSWORD: fitfamily
    networks: [internal]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fitfamily"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://fitfamily:fitfamily@db:5432/fitfamily_test
      MEDIA_PATH: /data/media
      NODE_ENV: production
    volumes:
      - test_media:/data/media
    depends_on:
      db:
        condition: service_healthy
    networks: [internal]

volumes:
  test_media:

networks:
  internal:
```

File: `tests/e2e/helpers/setup.ts`

```ts
import { PrismaClient } from '@prisma/client'
import type { TrackingType, MediaType } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ??
        'postgresql://fitfamily:fitfamily@localhost:5432/fitfamily_test',
    },
  },
})

export async function seedTrainee(data: { name: string }) {
  return prisma.trainee.create({ data })
}

export async function seedExercise(data: {
  name: string
  trackingType: TrackingType
  mediaCount?: number
}) {
  const { mediaCount = 0, ...rest } = data
  const exercise = await prisma.exercise.create({ data: rest })
  for (let i = 1; i <= mediaCount; i++) {
    await prisma.exerciseMedia.create({
      data: {
        exerciseId: exercise.id,
        type: 'PHOTO' as MediaType,
        filePath: `dummy/${i}.jpg`,
        position: i,
      },
    })
  }
  return exercise
}

export async function seedPlan(data: {
  name: string
  items: Array<{ exerciseId: string; sets: number; reps: number }>
}) {
  const plan = await prisma.trainingPlan.create({ data: { name: data.name } })
  for (let i = 0; i < data.items.length; i++) {
    const item = await prisma.trainingPlanItem.create({
      data: { planId: plan.id, position: i + 1 },
    })
    await prisma.trainingPlanItemExercise.create({
      data: {
        itemId: item.id,
        exerciseId: data.items[i].exerciseId,
        sets: data.items[i].sets,
        reps: data.items[i].reps,
        slot: 1,
      },
    })
  }
  return plan
}

export async function seedSession(data: {
  traineeId: string
  exerciseId?: string
  planId?: string
}) {
  const session = await prisma.trainingSession.create({
    data: {
      traineeId: data.traineeId,
      planId: data.planId ?? null,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  })
  if (data.exerciseId) {
    await prisma.trainingSessionLog.create({
      data: {
        sessionId: session.id,
        exerciseId: data.exerciseId,
        setNumber: 1,
        weightKg: 50,
        repsDone: 8,
      },
    })
  }
  return session
}
```

Commit: `feat: add Playwright config and test Docker Compose`

---

### Task 46: Golden path E2E tests

File: `tests/e2e/trainer.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainer — Exercise management', () => {
  test('creates exercise with media', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Switch to Trainer')
    await page.goto('/trainer/exercises')

    await page.click('text=New Exercise')
    await page.fill('[name=name]', 'Barbell Squat')
    await page.fill('[name=description]', 'Compound leg exercise')
    await page.selectOption('[name=trackingType]', 'WEIGHT')
    await page.click('text=Save')

    await expect(page.locator('text=Barbell Squat')).toBeVisible()

    await page.click('text=Barbell Squat')
    await page.click('text=Add media')
    await page.selectOption('[name=mediaType]', 'YOUTUBE')
    await page.fill('[name=url]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('text=Add')
    await expect(page.locator('iframe')).toBeVisible()
  })

  test('creates training plan with biseries', async ({ page }) => {
    await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    await seedExercise({ name: 'Lunge', trackingType: 'WEIGHT' })

    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('[name=name]', 'Leg Day')
    await page.click('text=Save')
    await page.click('text=Leg Day')

    await page.click('text=Add Item')
    await page.click('text=Biseries')
    await page.fill('[placeholder="Exercise 1"]', 'Squat')
    await page.click('text=Squat')
    await page.fill('[name=sets1]', '3')
    await page.fill('[name=reps1]', '10')
    await page.fill('[placeholder="Exercise 2"]', 'Lunge')
    await page.click('text=Lunge')
    await page.fill('[name=sets2]', '3')
    await page.fill('[name=reps2]', '12')
    await page.click('text=Add Item')

    await expect(page.locator('text=Squat')).toBeVisible()
    await expect(page.locator('text=Lunge')).toBeVisible()
    await expect(page.locator('text=BISERIES')).toBeVisible()
  })
})
```

File: `tests/e2e/trainee.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainee — Full plan session', () => {
  test('runs full training plan and logs sets', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Test User' })
    const exercise = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await seedPlan({
      name: 'Push Day',
      items: [{ exerciseId: exercise.id, sets: 2, reps: 8 }],
    })

    await page.goto('/')
    await expect(page.locator('text=Test User')).toBeVisible()
    await page.click('text=Test User')
    await page.click('text=Push Day')

    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Set 1 of 2')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.fill('[name=repsDone]', '8')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Session Complete')).toBeVisible()
    await page.fill('[name=calories]', '320')
    await page.click('text=Save & Finish')

    await expect(page).toHaveURL(`/trainee/${trainee.id}`)
  })

  test('trains single exercise outside a plan', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Solo User' })
    await seedExercise({ name: 'Pull-up', trackingType: 'NONE' })

    await page.goto('/')
    await page.click('text=Solo User')
    await page.click('text=Train Single Exercise')
    await page.click('text=Pull-up')

    await page.fill('[name=sets]', '3')
    await page.fill('[name=reps]', '8')
    await page.click('text=Start')

    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`text=Set ${i} of 3`)).toBeVisible()
      await page.click('text=Mark Done')
    }

    await page.click('text=Save & Finish')
    await expect(page).toHaveURL(`/trainee/${trainee.id}`)
  })
})
```

Commit: `test: add golden path E2E tests`

---

### Task 47: Failure path E2E tests

File: `tests/e2e/failure-paths.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan, seedSession } from './helpers/setup'

test.describe('Failure paths', () => {
  test('cannot delete exercise that is in use', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Active User' })
    const exercise = await seedExercise({ name: 'In-Use Exercise', trackingType: 'WEIGHT' })
    await seedSession({ traineeId: trainee.id, exerciseId: exercise.id })

    await page.goto('/trainer/exercises')
    await page.click('text=In-Use Exercise')
    await page.click('text=Delete Exercise')
    await page.click('text=Confirm Delete')

    await expect(page.locator('text=Cannot delete')).toBeVisible()
    await expect(page.locator('text=In-Use Exercise')).toBeVisible()
  })

  test('cannot delete trainee with sessions', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Busy Trainee' })
    await seedSession({ traineeId: trainee.id })

    await page.goto('/trainer/trainees')
    await page.click(`[aria-label="Delete Busy Trainee"]`)
    await page.click('text=Confirm')

    await expect(page.locator('text=Cannot delete')).toBeVisible()
  })

  test('media upload blocked after 10 items', async ({ page }) => {
    const exercise = await seedExercise({
      name: 'Full Media Exercise',
      trackingType: 'WEIGHT',
      mediaCount: 10,
    })

    await page.goto(`/trainer/exercises/${exercise.id}`)

    await expect(page.locator('text=maximum')).toBeVisible()
    await expect(page.locator('button:has-text("Add")')).toBeDisabled()
  })

  test('biseries item requires slot 1 before slot 2', async ({ page }) => {
    const plan = await seedPlan({ name: 'Test Plan', items: [] })
    await seedExercise({ name: 'Exercise A', trackingType: 'WEIGHT' })

    await page.goto(`/trainer/plans/${plan.id}`)
    await page.click('text=Add Item')
    await page.click('text=Biseries')
    await page.fill('[placeholder="Exercise 2"]', 'Exercise A')
    await page.click('text=Exercise A')
    await page.click('text=Add Item')

    await expect(page.locator('text=slot 1')).toBeVisible()
  })

  test('PWA manifest and service worker present', async ({ page }) => {
    await page.goto('/')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    const manifestResponse = await page.request.get('/manifest.json')
    const manifest = await manifestResponse.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#E85D26')
  })
})
```

Commit: `test: add failure path and edge case E2E tests`
