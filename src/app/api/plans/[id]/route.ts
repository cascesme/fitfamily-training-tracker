/**
 * @swagger
 * /api/plans/{id}:
 *   get:
 *     summary: Get training plan with items
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Training plan with items
 *       404:
 *         description: Plan not found
 *   put:
 *     summary: Update training plan
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
 *             $ref: '#/components/schemas/UpdatePlan'
 *     responses:
 *       200:
 *         description: Updated plan
 *       400:
 *         description: Validation error
 *       404:
 *         description: Plan not found
 *   delete:
 *     summary: Delete training plan
 *     tags: [Plans]
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
 *         description: Plan not found
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { UpdatePlanSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const plan = await trainingPlanService.findWithItems(id)
    if (!plan) return NextResponse.json({ error: `Entity ${id} not found` }, { status: 404 })
    return NextResponse.json(plan)
  } catch (error) {
    return handleError(error, `/api/plans/${id}`)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = UpdatePlanSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const plan = await trainingPlanService.update(id, parsed.data)
    return NextResponse.json(plan)
  } catch (error) {
    return handleError(error, `/api/plans/${id}`)
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await trainingPlanService.delete(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/plans/${id}`)
  }
}
