import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync } from 'fs'
import { join, extname } from 'path'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const filePath = join(process.env.MEDIA_PATH ?? '/data/media', ...path)
  try {
    const stat = statSync(filePath)
    const stream = createReadStream(filePath)
    const contentType = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
