export const AGE_VERIFICATION_STORAGE_KEY = 'hey-lady-age-verified-v1';

/** 30-day verification validity window in milliseconds */
export const AGE_VERIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AgeVerificationPayload {
  verified: true;
  verifiedAt: number;
  expiresAt: number;
}

/**
 * Parses a stored JSON or legacy boolean string from storage and determines
 * whether the visitor has an active, non-expired 18+ age verification record.
 */
export function parseAgeVerificationRecord(
  raw: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!raw || typeof raw !== 'string') {
    return false;
  }

  const trimmed = raw.trim();
  if (trimmed === 'true' || trimmed === '1') {
    return true;
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<AgeVerificationPayload>;
    if (parsed && parsed.verified === true) {
      if (
        typeof parsed.expiresAt === 'number' &&
        Number.isFinite(parsed.expiresAt)
      ) {
        return nowMs < parsed.expiresAt;
      }
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Serializes a timestamped 18+ age verification record for localStorage persistence.
 */
export function serializeAgeVerificationRecord(
  nowMs: number = Date.now(),
  ttlMs: number = AGE_VERIFICATION_TTL_MS
): string {
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : AGE_VERIFICATION_TTL_MS;

  const payload: AgeVerificationPayload = {
    verified: true,
    verifiedAt: safeNow,
    expiresAt: safeNow + safeTtl,
  };

  return JSON.stringify(payload);
}
