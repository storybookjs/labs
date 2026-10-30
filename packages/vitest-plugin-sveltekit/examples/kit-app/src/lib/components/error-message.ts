/** The message of an error thrown by a remote function (`error(404, '...')` on the server). */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const body = (error as { body?: { message?: unknown } }).body;
    if (typeof body?.message === 'string') return body.message;
    if (error instanceof Error) return error.message;
  }
  return 'Something went wrong';
}
