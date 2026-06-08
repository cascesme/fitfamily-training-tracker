/**
 * @swagger
 * /api/plans/{id}/items/{itemId}:
 *   delete:
 *     summary: Remove item from training plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Item removed
 *       404:
 *         description: Item not found
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { handleError } from '@/lib/api/handleError'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params
  try {
    await trainingPlanService.removeItem(itemId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/plans/${id}/items/${itemId}`)
  }
}
