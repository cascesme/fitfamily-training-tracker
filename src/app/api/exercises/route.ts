/**
 * @swagger
 * /api/exercises:
 *   get:
 *     summary: List all exercises
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: Array of exercises
 *   post:
 *     summary: Create exercise
 *     tags: [Exercises]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExercise'
 *     responses:
 *       201:
 *         description: Created exercise
 *       400:
 *         description: Validation error
 */
import { NextResponse } from 'next/server'
import { exerciseService } from '@/lib/api/services'
import { CreateExerciseSchema } from '@/lib/domain/exercise'
import { handleError } from '@/lib/api/handleError'

export async function GET() {
  try {
    const exercises = await exerciseService.list()
    return NextResponse.json(exercises)
  } catch (error) {
    return handleError(error, '/api/exercises')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateExerciseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const exercise = await exerciseService.create(parsed.data)
    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/exercises')
  }
}
