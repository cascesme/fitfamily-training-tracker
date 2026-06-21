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
 *         description: Training plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [position, exercises]
 *             properties:
 *               position:
 *                 type: integer
 *                 minimum: 1
 *                 description: Slot position of this item within the plan
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 7
 *                 items:
 *                   type: object
 *                   required: [exerciseId, sets, reps, order]
 *                   properties:
 *                     exerciseId:
 *                       type: string
 *                       description: Primary exercise ID
 *                     sets:
 *                       type: integer
 *                       minimum: 1
 *                     reps:
 *                       type: integer
 *                       minimum: 0
 *                       description: 0 allowed for tabata (time-based)
 *                     order:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 7
 *                       description: Position within series; must be contiguous from 1
 *                     alternativeExerciseId:
 *                       type: string
 *                       description: Optional alternative exercise ID (must differ from exerciseId)
 *                     alternativeSets:
 *                       type: integer
 *                       minimum: 1
 *                       description: Required when alternativeExerciseId is set
 *                     alternativeReps:
 *                       type: integer
 *                       minimum: 1
 *                       description: Required when alternativeExerciseId is set
 *               isTabata:
 *                 type: boolean
 *                 description: True for tabata-style timed intervals
 *               workTimeSecs:
 *                 type: integer
 *                 minimum: 1
 *                 description: Required when isTabata is true
 *               restTimeSecs:
 *                 type: integer
 *                 minimum: 1
 *                 description: Required when isTabata is true
 *     responses:
 *       201:
 *         description: Plan item created
 *       400:
 *         description: Validation error (invalid exercise fields, non-contiguous order, unequal sets in series, alternative exercise same as primary, missing alternativeSets/alternativeReps when alternativeExerciseId provided)
 *       404:
 *         description: Plan or alternative exercise not found
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
    const tabataConfig = parsed.data.isTabata
      ? { workTimeSecs: parsed.data.workTimeSecs!, restTimeSecs: parsed.data.restTimeSecs! }
      : undefined
    const item = await trainingPlanService.addItem(id, parsed.data.position, parsed.data.exercises, tabataConfig)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleError(error, `/api/plans/${id}/items`)
  }
}
