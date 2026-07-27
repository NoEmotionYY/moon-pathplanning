export class MazeImportWorkerError extends Error {
  readonly code: string
  readonly requestId?: string

  constructor(
    code: string,
    message: string,
    requestId?: string,
  ) {
    super(message)
    this.name = 'MazeImportWorkerError'
    this.code = code
    this.requestId = requestId
  }
}
