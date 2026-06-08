/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: List sessions for a trainee
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: traineeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of training sessions
 *       400:
 *         description: traineeId is required
 *   post:
 *     summary: Start a new training session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartSession'
 *     responses:
 *       201:
 *         description: Session started
 *       400:
 *         description: Validation error
 */
import { NextRequest, NextResponse } from 'next/server'
import { sessionService } from '@/lib/api/services'
import { StartSessionSchema } from '@/lib/domain/session'
import { handleError } from '@/lib/api/handleError'

export async function GET(request: NextRequest) {
  try {
    const traineeId = request.nextUrl.searchParams.get('traineeId')
    if (!traineeId) return NextResponse.json({ error: 'traineeId is required' }, { status: 400 })
    const sessions = await sessionService.listByTrainee(traineeId)
    return NextResponse.json(sessions)
  } catch (error) {
    return handleError(error, '/api/sessions')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = StartSessionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const session = await sessionService.start(parsed.data.traineeId, parsed.data.planId)
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    return handleError(error, '/api/sessions')
  }
}
