/**
 * @swagger
 * /api/exercises/{id}/media:
 *   get:
 *     summary: List media for an exercise
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of media items
 *       404:
 *         description: Exercise not found
 *   post:
 *     summary: Upload or attach media to exercise
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [VIDEO, PHOTO, PDF, YOUTUBE]
 *               file:
 *                 type: string
 *                 format: binary
 *               url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Media item created
 *       404:
 *         description: Exercise not found
 *       422:
 *         description: Media limit reached
 */
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { exerciseService, exerciseMediaService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const exercise = await exerciseService.findWithMedia(id)
    if (!exercise) return NextResponse.json({ error: `Entity ${id} not found` }, { status: 404 })
    return NextResponse.json(exercise.media ?? [])
  } catch (error) {
    return handleError(error, `/api/exercises/${id}/media`)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const formData = await request.formData()
    const type = formData.get('type') as string

    if (!['VIDEO', 'PHOTO', 'PDF', 'YOUTUBE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
    }

    if (type === 'YOUTUBE') {
      const url = formData.get('url') as string
      if (!url) return NextResponse.json({ error: 'URL required for YOUTUBE type' }, { status: 400 })
      const media = await exerciseMediaService.addMedia({ exerciseId: id, type: 'YOUTUBE', url })
      return NextResponse.json(media, { status: 201 })
    }

    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const ext = extname(file.name)
    const filename = `${randomUUID()}${ext}`
    const mediaPath = process.env.MEDIA_PATH ?? '/data/media'
    const dir = join(mediaPath, id)
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const relativePath = `${id}/${filename}`
    const media = await exerciseMediaService.addMedia({
      exerciseId: id,
      type: type as 'VIDEO' | 'PHOTO' | 'PDF',
      filePath: relativePath,
      originalFilename: file.name,
    })
    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/exercises/${id}/media`)
  }
}
