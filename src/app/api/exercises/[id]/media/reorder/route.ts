/**
 * @swagger
 * /api/exercises/{id}/media/reorder:
 *   post:
 *     summary: Reorder media items
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     position:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Media reordered
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { exerciseMediaService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

const ReorderSchema = z.object({
  positions: z.array(z.object({ id: z.string(), position: z.number().int().positive() })).min(1),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = ReorderSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    await exerciseMediaService.reorder(id, parsed.data.positions)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error, `/api/exercises/${id}/media/reorder`)
  }
}
