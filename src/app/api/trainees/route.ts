/**
 * @swagger
 * /api/trainees:
 *   get:
 *     summary: List all trainees
 *     tags: [Trainees]
 *     responses:
 *       200:
 *         description: Array of trainees
 *   post:
 *     summary: Create trainee
 *     tags: [Trainees]
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
 */
import { NextResponse } from 'next/server'
import { traineeService } from '@/lib/api/services'
import { CreateTraineeSchema } from '@/lib/domain/trainee'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    const trainees = await traineeService.list()
    return NextResponse.json(trainees)
  } catch (error) {
    return handleError(error, '/api/trainees')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateTraineeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const trainee = await traineeService.create(parsed.data)
    return NextResponse.json(trainee, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/trainees')
  }
}
