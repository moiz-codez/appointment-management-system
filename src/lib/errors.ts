import { ZodError } from 'zod';

export type ErrorCode =
  | 'SLOT_FULL'
  | 'DUPLICATE_APPOINTMENT'
  | 'DUPLICATE_TOKEN'
  | 'LIMIT_REACHED'
  | 'INVALID_TRANSITION'
  | 'OUTSIDE_CHECKIN_WINDOW'
  | 'OUTSIDE_WORKING_HOURS'
  | 'SERVICE_CLOSED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION';

// `message` is shown to end users as-is, so write it for them.
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode | 'INTERNAL'; message: string } };

// Server actions never throw to the client: AppError/ZodError become { ok: false }.
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: { code: error.code, message: error.message } };
    if (error instanceof ZodError) {
      return { ok: false, error: { code: 'VALIDATION', message: error.issues[0]?.message ?? 'Invalid input' } };
    }
    // Next.js uses thrown errors for redirect()/notFound(); let those through.
    if (error instanceof Error && 'digest' in error && String(error.digest).startsWith('NEXT_')) throw error;
    console.error(error);
    return { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } };
  }
}
