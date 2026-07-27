export class GridConversionError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GridConversionError'
    this.code = code
  }
}
