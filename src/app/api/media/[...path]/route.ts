import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const filePath = join(process.env.MEDIA_PATH ?? '/data/media', ...path)
  try {
    const stat = statSync(filePath)
    const stream = createReadStream(filePath)
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: { 'Content-Length': stat.size.toString() },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
