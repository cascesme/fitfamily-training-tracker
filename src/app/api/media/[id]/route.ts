/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete a media item by ID
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Media not found
 */
import { NextResponse } from 'next/server'
import { exerciseMediaService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await exerciseMediaService.deleteMedia(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/media/${id}`)
  }
}
