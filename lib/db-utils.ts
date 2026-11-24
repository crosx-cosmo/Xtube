/**
 * Pure database validation, error classification, and safe SQL helper utilities.
 * Zero side effects — directly unit-testable with node:test.
 */

export class DatabaseNotConfiguredError extends Error {
  readonly code = 'DB_NOT_CONFIGURED';
  constructor(
    message = 'Database connection is not configured. Set DATABASE_URL to your Neon PostgreSQL connection string.'
  ) {
    super(message);
    this.name = 'DatabaseNotConfiguredError';
  }
}

export class DatabaseUnavailableError extends Error {
  readonly code = 'DB_UNAVAILABLE';
  constructor(
    message = 'Database is temporarily unavailable. Please try again in a moment.'
  ) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export function isValidPostgresUrl(url: string | undefined | null): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Escapes PostgreSQL LIKE/ILIKE wildcard characters (%, _, \) so user search
 * queries cannot perform expensive wildcard scans or unintended pattern matching.
 */
export function escapeLikePattern(input: string): string {
  return input
    .trim()
    .slice(0, 120)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

export function buildIlikeSearchPattern(input: string | undefined | null): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  return `%${escapeLikePattern(trimmed)}%`;
}

const VIEWER_ID_PATTERN = /^viewer-[a-f0-9-]{8,36}$/i;

export function isValidViewerId(candidate: string | undefined | null): candidate is string {
  if (!candidate) return false;
  return VIEWER_ID_PATTERN.test(candidate.trim());
}

export function isDatabaseNotConfiguredError(error: unknown): boolean {
  return error instanceof DatabaseNotConfiguredError;
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  return error instanceof DatabaseUnavailableError;
}

const MISSING_SCHEMA_PG_CODES = new Set(['42P01', '42703']);
const MISSING_SCHEMA_MESSAGE_PATTERN =
  /\b(?:relation|table)\s+"[^"]+"\s+does not exist\b|\bcolumn\s+"[^"]+"(?:\s+of relation\s+"[^"]+")?\s+does not exist\b/i;

/**
 * Detects PostgreSQL undefined_table (42P01) or undefined_column (42703) errors
 * (including wrapped NeonDbError / cause chains) so the server can self-heal
 * when a database is reset or tables are dropped while the process is warm.
 */
export function isMissingSchemaError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const record = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
      sourceError?: unknown;
    };

    if (typeof record.code === 'string' && MISSING_SCHEMA_PG_CODES.has(record.code)) {
      return true;
    }

    if (
      typeof record.message === 'string' &&
      MISSING_SCHEMA_MESSAGE_PATTERN.test(record.message)
    ) {
      return true;
    }

    current = record.cause ?? record.sourceError ?? null;
  }

  return false;
}

/**
 * Maps internal database/runtime errors into safe, sanitized HTTP status codes
 * and user-facing messages without leaking SQL, hostnames, or credentials.
 */
export function mapApiError(
  error: unknown,
  fallbackMessage: string
): { status: number; message: string } {
  if (error instanceof DatabaseNotConfiguredError) {
    return {
      status: 503,
      message: 'Database is not configured. Set DATABASE_URL to connect PostgreSQL.',
    };
  }
  if (error instanceof DatabaseUnavailableError) {
    return {
      status: 503,
      message: 'Database is temporarily unavailable. Please retry shortly.',
    };
  }
  return {
    status: 500,
    message: fallbackMessage,
  };
}
