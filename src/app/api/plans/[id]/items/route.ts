/**
 * @swagger
 * /api/plans/{id}/items:
 *   post:
 *     summary: Add item to training plan
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
 *             $ref: '#/components/schemas/AddPlanItem'
 *     responses:
 *       201:
 *         description: Plan item created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Plan not found
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { AddPlanItemSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = AddPlanItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const item = await trainingPlanService.addItem(id, parsed.data.position, parsed.data.exercises)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/plans/${id}/items`)
  }
}
