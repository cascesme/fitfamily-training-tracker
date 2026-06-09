'use client'
import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { ExerciseMedia } from '@prisma/client'
import { SWIPE_THRESHOLD_PX } from '@/lib/domain/constants'

interface MediaViewerProps {
  media: ExerciseMedia[]
  startIndex?: number
  onClose: () => void
}

export function MediaViewer({ media, startIndex = 0, onClose }: MediaViewerProps) {
  const t = useTranslations('media')
  const [index, setIndex] = useState(startIndex)
  const dragStartX = useRef<number | null>(null)

  const prev = useCallback(() => setIndex((i) => (i - 1 + media.length) % media.length), [media.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % media.length), [media.length])

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return
    const delta = e.clientX - dragStartX.current
    if (delta > SWIPE_THRESHOLD_PX) prev()
    else if (delta < -SWIPE_THRESHOLD_PX) next()
    dragStartX.current = null
  }

  const item = media[index]

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-[rgba(255,255,255,0.4)]">
          {t('mediaCount', { current: index + 1, total: media.length })}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-[rgba(255,255,255,0.6)] hover:text-white"
          aria-label={t('closeViewer')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {media.length > 1 && (
          <button
            onClick={prev}
            aria-label={t('prevMedia')}
            className="absolute left-0 top-0 z-10 flex h-full w-1/4 items-center justify-start pl-4 text-[rgba(255,255,255,0.5)] hover:text-white"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="flex h-full w-full items-center justify-center px-16">
          <MediaContent item={item} t={t} />
        </div>

        {media.length > 1 && (
          <button
            onClick={next}
            aria-label={t('nextMedia')}
            className="absolute right-0 top-0 z-10 flex h-full w-1/4 items-center justify-end pr-4 text-[rgba(255,255,255,0.5)] hover:text-white"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex justify-center gap-2 py-4">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition-colors ${i === index ? 'bg-[#E85D26]' : 'bg-[rgba(255,255,255,0.3)]'}`}
              aria-label={t('goToMedia', { index: i + 1 })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MediaContent({ item, t }: { item: ExerciseMedia; t: ReturnType<typeof useTranslations> }) {
  if (item.type === 'PHOTO') {
    return (
      <div className="relative h-full w-full">
        <Image
          src={`/api/media/${item.filePath}`}
          alt=""
          fill
          className="object-contain"
        />
      </div>
    )
  }
  if (item.type === 'VIDEO') {
    return (
      <video
        src={`/api/media/${item.filePath}`}
        controls
        autoPlay
        className="max-h-full max-w-full rounded-[8px]"
      />
    )
  }
  if (item.type === 'YOUTUBE') {
    const videoId = new URL(item.url!).searchParams.get('v')
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        className="aspect-video w-full max-w-3xl rounded-[8px]"
        allowFullScreen
        allow="autoplay"
      />
    )
  }
  if (item.type === 'PDF') {
    return (
      <a
        href={`/api/media/${item.filePath}`}
        download={item.originalFilename ?? 'document.pdf'}
        className="flex flex-col items-center gap-4 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] px-8 py-12 text-center"
      >
        <span className="text-6xl">📄</span>
        <span className="text-lg font-semibold">{item.originalFilename ?? 'PDF'}</span>
        <span className="text-sm text-[rgba(255,255,255,0.5)]">{t('tapToDownload')}</span>
      </a>
    )
  }
  return null
}
