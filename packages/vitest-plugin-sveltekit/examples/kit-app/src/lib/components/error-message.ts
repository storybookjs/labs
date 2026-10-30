/** The message of an error thrown by a remote function (`error(404, '...')` on the server). */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const { body, message } = error as { body?: { message?: unknown }; message?: unknown };
    if (typeof body?.message === 'string') return body.message;
    if (typeof message === 'string') return message;
  }
  return 'Something went wrong';
}
