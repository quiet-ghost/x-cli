export class AppError extends Error {
  readonly detail?: string

  constructor(message: string, detail?: string) {
    super(message)
    this.name = "AppError"
    this.detail = detail
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.detail ? `${error.message} ${error.detail}` : error.message
  }
  if (error instanceof Error) return error.message
  return "An unknown error occurred."
}
