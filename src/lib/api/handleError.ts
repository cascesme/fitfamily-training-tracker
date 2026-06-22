import { NextResponse } from 'next/server'
import { NotFoundError, DeleteBlockedError, ValidationError, MediaLimitError, ForbiddenError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export function handleError(error: unknown, path: string): NextResponse {
  if (error instanceof ForbiddenError) {
    logger.warn({ path, status: 403 }, 'Forbidden')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (error instanceof NotFoundError) {
    logger.warn({ path, status: 404, error: error.message }, 'Not found')
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error instanceof DeleteBlockedError) {
    logger.warn({ path, status: 409, error: error.message }, 'Delete blocked')
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
  if (error instanceof ValidationError) {
    logger.warn({ path, status: 400, error: error.message }, 'Validation error')
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (error instanceof MediaLimitError) {
    logger.warn({ path, status: 422, error: error.message }, 'Media limit')
    return NextResponse.json({ error: error.message }, { status: 422 })
  }
  logger.error({ path, status: 500, error: String(error) }, 'Internal server error')
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
