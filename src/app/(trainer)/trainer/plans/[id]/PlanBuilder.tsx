'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { Badge } from '@/components/ui/Badge'
import { AddItemModal } from './AddItemModal'
import type { Exercise } from '@prisma/client'

interface PlanItemExercise {
  id: string
  itemId: string
  exerciseId: string
  sets: number
  reps: number
  order: number
}

interface PlanItem {
  id: string
  planId: string
  position: number
  exercises?: PlanItemExercise[]
}

interface Plan {
  id: string
  name: string
  description?: string | null
  items?: PlanItem[]
}

interface Props {
  plan: Plan
  allExercises: Exercise[]
}

function SortablePlanItem({
  item,
  allExercises,
  onDelete,
}: {
  item: PlanItem
  allExercises: Exercise[]
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const t = useTranslations('planBuilder')

  const exercises = (item.exercises ?? []).slice().sort((a, b) => a.order - b.order)
  const isSeries = exercises.length > 1

  function lookupName(exerciseId: string): string {
    return allExercises.find((e) => e.id === exerciseId)?.name ?? exerciseId
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4"
    >
      <span {...attributes} {...listeners} className="mt-1 cursor-grab select-none text-[rgba(255,255,255,0.4)]">
        ⠿
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgba(255,255,255,0.4)]">#{item.position}</span>
          <Badge variant={isSeries ? 'accent' : 'default'}>
            {isSeries ? t('series', { count: exercises.length }) : t('single')}
          </Badge>
        </div>
        {exercises.map((ex) => (
          <p key={ex.id} className="text-sm">
            <span className="font-semibold">{lookupName(ex.exerciseId)}</span>
            <span className="ml-2 text-[rgba(255,255,255,0.6)]">{ex.sets} × {ex.reps}</span>
          </p>
        ))}
      </div>
      <button onClick={() => onDelete(item.id)} className="text-sm text-red-400 hover:text-red-300">
        {t('removeItem')}
      </button>
    </div>
  )
}

export function PlanBuilder({ plan, allExercises }: Props) {
  const t = useTranslations('planBuilder')
  const router = useRouter()
  const [items, setItems] = useState<PlanItem[]>(plan.items ?? [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // intentional controlled sync of local state from prop change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(plan.items ?? [])
  }, [plan.items])

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const previous = items
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)
      setItems(reordered)
      try {
        const res = await fetch(`/api/plans/${plan.id}/items/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
        })
        if (!res.ok) {
          setItems(previous)
          setError(t('reorderError'))
          return
        }
        router.refresh()
      } catch {
        setItems(previous)
        setError(t('reorderError'))
      }
    },
    [items, plan.id, router, t],
  )

  async function handleDelete(itemId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/plans/${plan.id}/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) {
        setError(t('deleteItemError'))
        return
      }
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      router.refresh()
    } catch {
      setError(t('deleteItemError'))
    }
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
              <SortablePlanItem
                key={item.id}
                item={item}
                allExercises={allExercises}
                onDelete={handleDelete}
              />
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
