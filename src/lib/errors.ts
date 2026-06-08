export class NotFoundError extends Error {
  constructor(readonly entityId: string) {
    super(`Entity ${entityId} not found`)
    this.name = 'NotFoundError'
  }
}

export class DeleteBlockedError extends Error {
  constructor(readonly entityId: string, readonly reason: string) {
    super(`Cannot delete ${entityId}: ${reason}`)
    this.name = 'DeleteBlockedError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class MediaLimitError extends Error {
  constructor(readonly exerciseId: string) {
    super(`Exercise ${exerciseId} already has maximum media items`)
    this.name = 'MediaLimitError'
  }
}
