import { Observable, throwError } from 'rxjs';

/** Error with the backend's own message and the HTTP status (401 = session over, 403 = not allowed, 0 = no connection). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Turns an HttpErrorResponse into an ApiError that carries the contract's message `{ status, message, errors }`. */
export function toApiError(err: unknown): Observable<never> {
  const e = err as { status?: number; error?: { message?: string; errors?: Record<string, string> } };
  const status = e?.status ?? 0;
  let message = e?.error?.message;
  if (e?.error?.errors) {
    const details = Object.values(e.error.errors).join(' ');
    if (details) message = details;
  }
  if (!message) {
    message =
      status === 0
        ? 'Cannot reach the server. Check your connection and try again.'
        : 'Something went wrong. Please try again.';
  }
  return throwError(() => new ApiError(message, status));
}
