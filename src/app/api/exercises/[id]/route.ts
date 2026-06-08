/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get exercise with media
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exercise with media array
 *       404:
 *         description: Exercise not found
 *   put:
 *     summary: Update exercise
 *     tags: [Exercises]
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
 *             $ref: '#/components/schemas/UpdateExercise'
 *     responses:
 *       200:
 *         description: Updated exercise
 *       400:
 *         description: Validation error
 *       404:
 *         description: Exercise not found
 *   delete:
 *     summary: Delete exercise
 *     tags: [Exercises]
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
 *         description: Exercise not found
 *       409:
 *         description: Delete blocked — exercise has session logs
 */
import { NextResponse } from 'next/server'
import { exerciseService } from '@/lib/api/services'
import { UpdateExerciseSchema } from '@/lib/domain/exercise'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const exercise = await exerciseService.findWithMedia(id)
    if (!exercise) return NextResponse.json({ error: `Entity ${id} not found` }, { status: 404 })
    return NextResponse.json(exercise)
  } catch (error) {
    return handleError(error, `/api/exercises/${id}`)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = UpdateExerciseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const exercise = await exerciseService.update(id, parsed.data)
    return NextResponse.json(exercise)
  } catch (error) {
    return handleError(error, `/api/exercises/${id}`)
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await exerciseService.delete(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/exercises/${id}`)
  }
}
