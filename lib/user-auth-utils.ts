import crypto from 'node:crypto';

export const USER_SESSION_COOKIE_NAME = 'kinship_user_session';
export const USER_SESSION_TOKEN_HEADER = 'x-user-session-token';
export const USER_SESSION_TTL_DAYS = 30;
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * USER_SESSION_TTL_DAYS;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SCRYPT_KEY_LENGTH = 64;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_REGEX.test(normalized);
}

export interface AuthValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalized: {
    name?: string;
    email: string;
    password: string;
  };
}

export function validateSignUpInput(input: {
  name?: string;
  email?: string;
  password?: string;
}): AuthValidationResult {
  const errors: Record<string, string> = {};
  const name = (input.name ?? '').trim();
  const email = normalizeEmail(input.email ?? '');
  const password = input.password ?? '';

  if (name.length < 2) {
    errors.name = 'Enter your full name (at least 2 characters).';
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (!email || !isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.';
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must include at least one letter and one number.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { name, email, password },
  };
}

export function validateSignInInput(input: {
  email?: string;
  password?: string;
}): AuthValidationResult {
  const errors: Record<string, string> = {};
  const email = normalizeEmail(input.email ?? '');
  const password = input.password ?? '';

  if (!email || !isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { email, password },
  };
}

export interface PasswordResetRequestValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalized: {
    email: string;
  };
}

export function validatePasswordResetRequestInput(input: {
  email?: string;
}): PasswordResetRequestValidationResult {
  const errors: Record<string, string> = {};
  const email = normalizeEmail(typeof input.email === 'string' ? input.email : '');

  if (!email || !isValidEmail(email)) {
    errors.email = 'Enter a valid administrator email address.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { email },
  };
}

export interface PasswordResetOtpConfirmValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalized: {
    email: string;
    otp: string;
    newPassword: string;
  };
}

export function validatePasswordResetOtpConfirmInput(input: {
  email?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
}): PasswordResetOtpConfirmValidationResult {
  const errors: Record<string, string> = {};
  const email = normalizeEmail(typeof input.email === 'string' ? input.email : '');
  const rawOtp = typeof input.otp === 'string' ? input.otp : '';
  const otp = rawOtp.replace(/[\s-]+/g, '').trim();
  const newPassword = typeof input.newPassword === 'string' ? input.newPassword : '';
  const confirmPassword =
    typeof input.confirmPassword === 'string' ? input.confirmPassword : undefined;

  if (!email || !isValidEmail(email)) {
    errors.email = 'Enter a valid administrator email address.';
  }

  if (!otp || otp.length < 4) {
    errors.otp = 'Enter the 6-digit OTP code sent to your email.';
  } else if (otp.length > 12 || !/^[A-Za-z0-9]+$/.test(otp)) {
    errors.otp = 'Enter a valid verification OTP code (numbers or letters only).';
  }

  if (newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters long.';
  } else if (newPassword.length > 128) {
    errors.newPassword = 'New password must be 128 characters or fewer.';
  } else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    errors.newPassword = 'New password must include at least one letter and one number.';
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { email, otp, newPassword },
  };
}

export function sanitizeResetQueryParam(
  value: string | string[] | undefined,
  maxLength = 512
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

export function formatResetErrorQueryMessage(
  errorCode: string | null | undefined
): string | null {
  if (!errorCode) return null;
  const upper = errorCode.trim().toUpperCase();
  if (!upper) return null;
  if (upper.includes('INVALID_TOKEN') || upper.includes('EXPIRED')) {
    return 'This password reset link is invalid or has expired. Request a new reset link below.';
  }
  return 'Could not complete password reset from that link. Please request a new reset link.';
}

/**
 * Hashes a user password with a unique 16-byte random salt using Node's built-in scrypt.
 * Format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash in constant time.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !password) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function generateUsernameSlug(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || 'member';
  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return cleaned || 'member';
}

export function getNeonAuthBaseUrl(baseUrl?: string | null): string | null {
  const raw = (
    baseUrl ??
    process.env.NEON_AUTH_BASE_URL ??
    process.env.NEON_AUTH_URL ??
    ''
  ).trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return raw.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function isNeonAuthServiceConfigured(baseUrl?: string | null): boolean {
  return getNeonAuthBaseUrl(baseUrl) !== null;
}
