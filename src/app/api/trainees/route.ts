/**
 * @swagger
 * /api/trainees:
 *   get:
 *     summary: List all trainees
 *     tags: [Trainees]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: Array of trainees
 *       403:
 *         description: Forbidden — trainer role required
 *   post:
 *     summary: Create trainee (trainer only)
 *     tags: [Trainees]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTrainee'
 *     responses:
 *       201:
 *         description: Created trainee
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden — trainer role required
 */
import { NextResponse } from 'next/server'
import { traineeService } from '@/lib/api/services'
import { requireTrainerRole } from '@/lib/api/auth'
import { CreateTraineeSchema } from '@/lib/domain/trainee'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    await requireTrainerRole()
    const trainees = await traineeService.list()
    return NextResponse.json(trainees)
  } catch (error) {
    return handleError(error, '/api/trainees')
  }
}

export async function POST(request: Request) {
  try {
    await requireTrainerRole()
    const body = await request.json()
    const parsed = CreateTraineeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const trainee = await traineeService.create(parsed.data)
    return NextResponse.json(trainee, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/trainees')
  }
}
