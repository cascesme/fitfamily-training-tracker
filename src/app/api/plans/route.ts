/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: List all training plans
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: Array of training plans
 *   post:
 *     summary: Create training plan
 *     tags: [Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlan'
 *     responses:
 *       201:
 *         description: Created plan
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { trainingPlanService } from '@/lib/api/services'
import { CreatePlanSchema } from '@/lib/domain/plan'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    const plans = await trainingPlanService.list()
    return NextResponse.json(plans)
  } catch (error) {
    return handleError(error, '/api/plans')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreatePlanSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const plan = await trainingPlanService.create(parsed.data)
    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/plans')
  }
}
