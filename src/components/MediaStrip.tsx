'use client'
import type { ExerciseMedia } from '@prisma/client'

interface MediaStripProps {
  media: ExerciseMedia[]
  className?: string
}

export function MediaStrip({ media, className }: MediaStripProps) {
  if (media.length === 0) return null
  return (
    <div className={`flex gap-3 overflow-x-auto pb-2 ${className ?? ''}`}>
      {media.map((item) => (
        <MediaItem key={item.id} item={item} />
      ))}
    </div>
  )
}

function MediaItem({ item }: { item: ExerciseMedia }) {
  if (item.type === 'PHOTO') {
    return (
      <img
        src={`/api/media/${item.filePath}`}
        alt=""
        className="h-32 w-32 flex-shrink-0 rounded-[8px] object-cover border border-[rgba(255,255,255,0.08)]"
      />
    )
  }
  if (item.type === 'VIDEO') {
    return (
      <video
        src={`/api/media/${item.filePath}`}
        controls
        className="h-32 w-48 flex-shrink-0 rounded-[8px] border border-[rgba(255,255,255,0.08)]"
      />
    )
  }
  if (item.type === 'YOUTUBE') {
    const videoId = new URL(item.url!).searchParams.get('v')
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="h-32 w-48 flex-shrink-0 rounded-[8px] border border-[rgba(255,255,255,0.08)]"
        allowFullScreen
      />
    )
  }
  if (item.type === 'PDF') {
    return (
      <a
        href={`/api/media/${item.filePath}`}
        download={item.originalFilename ?? 'document.pdf'}
        className="flex h-32 w-32 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] text-sm text-[rgba(255,255,255,0.6)] hover:text-white"
      >
        <span className="text-2xl">📄</span>
        <span className="truncate px-2 text-xs">{item.originalFilename ?? 'PDF'}</span>
      </a>
    )
  }
  return null
}
