/**
 * @swagger
 * /api/plans/{id}/items/reorder:
 *   put:
 *     summary: Reorder items in a training plan
 *     tags: [Plans]
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
 *         description: Items reordered
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { ReorderItemsSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = ReorderItemsSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    await trainingPlanService.reorderItems(id, parsed.data.positions)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error, `/api/plans/${id}/items/reorder`)
  }
}
