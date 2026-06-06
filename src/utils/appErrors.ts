export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'RATE_LIMITED'
  | 'USAGE_LIMITED'
  | 'UPGRADE_REQUIRED'
  | 'AI_UNAVAILABLE'
  | 'VECTOR_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export interface StructuredAppError {
  code: AppErrorCode;
  message: string;
  recovery: string | null;
  details?: unknown;
}

const RECOVERY_HINTS: Record<string, string> = {
  AUTH_REQUIRED: 'Sign in again to continue.',
  RATE_LIMITED: 'Wait a moment and retry.',
  USAGE_LIMITED: 'Upgrade your plan or wait for the usage window to reset.',
  UPGRADE_REQUIRED: 'Open Billing to upgrade for this feature.',
  AI_UNAVAILABLE: 'AI is temporarily unavailable — retry shortly.',
  VECTOR_UNAVAILABLE: 'Semantic search is offline; keyword results still work.',
  VALIDATION_ERROR: 'Check your input and try again.',
  NOT_FOUND: 'This item may no longer exist.',
  NETWORK_ERROR: 'Check your connection and retry.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly recovery: string | null;
  readonly details?: unknown;

  constructor(message: string, code: AppErrorCode = 'INTERNAL_ERROR', options: { recovery?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recovery = options.recovery ?? RECOVERY_HINTS[code] ?? null;
    this.details = options.details;
  }
}

export function parseErrorMessage(message: string): StructuredAppError | null {
  const trimmed = String(message || '').trim();
  if (!trimmed) return null;

  if (trimmed === 'AUTH_REQUIRED') {
    return { code: 'AUTH_REQUIRED', message: trimmed, recovery: RECOVERY_HINTS.AUTH_REQUIRED };
  }
  if (trimmed === 'AI_UNAVAILABLE') {
    return { code: 'AI_UNAVAILABLE', message: trimmed, recovery: RECOVERY_HINTS.AI_UNAVAILABLE };
  }
  if (trimmed === 'VERIFICATION_REQUIRED') {
    return { code: 'VALIDATION_ERROR', message: trimmed, recovery: 'Verify your email to unlock this feature.' };
  }
  if (trimmed.startsWith('RATE_LIMITED:')) {
    return { code: 'RATE_LIMITED', message: trimmed, recovery: RECOVERY_HINTS.RATE_LIMITED };
  }
  if (trimmed.startsWith('USAGE_LIMITED:')) {
    return { code: 'USAGE_LIMITED', message: trimmed, recovery: RECOVERY_HINTS.USAGE_LIMITED };
  }
  if (trimmed.startsWith('UPGRADE_REQUIRED:')) {
    return { code: 'UPGRADE_REQUIRED', message: trimmed, recovery: RECOVERY_HINTS.UPGRADE_REQUIRED };
  }
  return null;
}

export function parseApiErrorBody(body: {
  error?: string;
  code?: string;
  recovery?: string;
  details?: unknown;
}, status: number): AppError {
  const code = (body.code as AppErrorCode) || inferCodeFromStatus(status, body.error);
  return new AppError(body.error || `Request failed (${status})`, code, {
    recovery: body.recovery,
    details: body.details,
  });
}

function inferCodeFromStatus(status: number, message?: string): AppErrorCode {
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 402) return 'UPGRADE_REQUIRED';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'AI_UNAVAILABLE';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400) return 'VALIDATION_ERROR';
  if (String(message || '').toLowerCase().includes('vector')) return 'VECTOR_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

export function getRecoveryHint(error: unknown): string | null {
  if (error instanceof AppError) return error.recovery;
  if (error instanceof Error) {
    const parsed = parseErrorMessage(error.message);
    return parsed?.recovery ?? null;
  }
  return null;
}
