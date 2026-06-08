/**
 * @swagger
 * /api/sessions/{id}/logs:
 *   post:
 *     summary: Log a set in a training session
 *     tags: [Sessions]
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
 *             $ref: '#/components/schemas/LogSet'
 *     responses:
 *       201:
 *         description: Set logged
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 */
import { NextResponse } from 'next/server'
import { sessionService } from '@/lib/api/services'
import { LogSetSchema } from '@/lib/domain/session'
import { handleError } from '@/lib/api/handleError'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = LogSetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const log = await sessionService.logSet(id, parsed.data)
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/sessions/${id}/logs`)
  }
}
