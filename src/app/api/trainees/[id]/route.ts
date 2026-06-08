/**
 * @swagger
 * /api/trainees/{id}:
 *   get:
 *     summary: Get trainee by ID
 *     tags: [Trainees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trainee
 *       404:
 *         description: Trainee not found
 *   put:
 *     summary: Update trainee
 *     tags: [Trainees]
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
 *             $ref: '#/components/schemas/UpdateTrainee'
 *     responses:
 *       200:
 *         description: Updated trainee
 *       400:
 *         description: Validation error
 *       404:
 *         description: Trainee not found
 *   delete:
 *     summary: Delete trainee
 *     tags: [Trainees]
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
 *         description: Trainee not found
 *       409:
 *         description: Delete blocked — trainee has sessions
 */
import { NextResponse } from 'next/server'
import { traineeService } from '@/lib/api/services'
import { UpdateTraineeSchema } from '@/lib/domain/trainee'
import { handleError } from '@/lib/api/handleError'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const trainee = await traineeService.findById(id)
    return NextResponse.json(trainee)
  } catch (error) {
    return handleError(error, `/api/trainees/${id}`)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = UpdateTraineeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const trainee = await traineeService.update(id, parsed.data)
    return NextResponse.json(trainee)
  } catch (error) {
    return handleError(error, `/api/trainees/${id}`)
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await traineeService.delete(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, `/api/trainees/${id}`)
  }
}
