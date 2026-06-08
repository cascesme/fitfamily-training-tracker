/**
 * @swagger
 * /api/sessions/{id}/finish:
 *   put:
 *     summary: Finish a training session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caloriesBurned:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Session finished
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sessionService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

const FinishSchema = z.object({ caloriesBurned: z.number().int().positive().optional() })

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = FinishSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const session = await sessionService.finishSession(id, {
      finishedAt: new Date(),
      caloriesBurned: parsed.data.caloriesBurned,
    })
    return NextResponse.json(session)
  } catch (error) {
    return handleError(error, `/api/sessions/${id}/finish`)
  }
}
