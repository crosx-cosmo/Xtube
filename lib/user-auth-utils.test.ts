import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatResetErrorQueryMessage,
  generateSessionToken,
  generateUsernameSlug,
  hashPassword,
  hashSessionToken,
  isNeonAuthServiceConfigured,
  isValidEmail,
  normalizeEmail,
  sanitizeResetQueryParam,
  validatePasswordResetConfirmInput,
  validatePasswordResetOtpConfirmInput,
  validatePasswordResetRequestInput,
  validateSignInInput,
  validateSignUpInput,
  verifyPassword,
} from './user-auth-utils';

test('normalizeEmail trims whitespace and lowercases addresses', () => {
  assert.equal(normalizeEmail('  Maya.Patel@Example.COM  '), 'maya.patel@example.com');
});

test('isValidEmail accepts standard emails and rejects malformed inputs', () => {
  assert.equal(isValidEmail('learner@kinship.edu'), true);
  assert.equal(isValidEmail('first.last+tag@sub.domain.org'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing@tld'), false);
  assert.equal(isValidEmail(''), false);
});

test('validateSignUpInput enforces name, email, and password strength rules', () => {
  const invalid = validateSignUpInput({
    name: 'A',
    email: 'bad',
    password: 'short',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);

  const lettersOnly = validateSignUpInput({
    name: 'Maya Patel',
    email: 'maya@example.com',
    password: 'onlyletters',
  });
  assert.equal(lettersOnly.valid, false);
  assert.match(lettersOnly.errors.password ?? '', /letter and one number/i);

  const valid = validateSignUpInput({
    name: '  Maya Patel ',
    email: '  MAYA@Example.com ',
    password: 'Password2026',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized.name, 'Maya Patel');
  assert.equal(valid.normalized.email, 'maya@example.com');
});

test('validateSignInInput validates email and non-empty password', () => {
  const missing = validateSignInInput({ email: '', password: '' });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.email);
  assert.ok(missing.errors.password);

  const valid = validateSignInInput({
    email: 'USER@Example.com',
    password: 'my-secret-password',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized.email, 'user@example.com');
});

test('validatePasswordResetRequestInput validates and normalizes admin email', () => {
  const missing = validatePasswordResetRequestInput({ email: '   ' });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.email);

  const invalid = validatePasswordResetRequestInput({ email: 'admin@invalid' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.email);

  const valid = validatePasswordResetRequestInput({ email: '  Admin@Kinship.Edu ' });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized.email, 'admin@kinship.edu');
});

test('validatePasswordResetConfirmInput enforces token, password rules, and matching confirmation', () => {
  const badAll = validatePasswordResetConfirmInput({
    token: '123',
    newPassword: 'short',
    confirmPassword: 'different',
  });
  assert.equal(badAll.valid, false);
  assert.ok(badAll.errors.token);
  assert.ok(badAll.errors.newPassword);
  assert.ok(badAll.errors.confirmPassword);

  const weakPassword = validatePasswordResetConfirmInput({
    token: 'reset-token-abcdef',
    newPassword: 'onlyletters',
    confirmPassword: 'onlyletters',
  });
  assert.equal(weakPassword.valid, false);
  assert.match(weakPassword.errors.newPassword ?? '', /letter and one number/i);

  const mismatch = validatePasswordResetConfirmInput({
    token: 'reset-token-abcdef',
    newPassword: 'NewPassword2026',
    confirmPassword: 'NewPassword2027',
  });
  assert.equal(mismatch.valid, false);
  assert.match(mismatch.errors.confirmPassword ?? '', /do not match/i);

  const valid = validatePasswordResetConfirmInput({
    token: '  reset-token-abcdef  ',
    newPassword: 'NewPassword2026',
    confirmPassword: 'NewPassword2026',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized.token, 'reset-token-abcdef');
  assert.equal(valid.normalized.newPassword, 'NewPassword2026');
});

test('validatePasswordResetOtpConfirmInput validates email, OTP code, and password rules', () => {
  const badAll = validatePasswordResetOtpConfirmInput({
    email: 'invalid-email',
    otp: '12',
    newPassword: 'short',
    confirmPassword: 'other',
  });
  assert.equal(badAll.valid, false);
  assert.ok(badAll.errors.email);
  assert.ok(badAll.errors.otp);
  assert.ok(badAll.errors.newPassword);
  assert.ok(badAll.errors.confirmPassword);

  const badOtpChars = validatePasswordResetOtpConfirmInput({
    email: 'admin@kinship.edu',
    otp: '1234!@',
    newPassword: 'NewPassword2026',
    confirmPassword: 'NewPassword2026',
  });
  assert.equal(badOtpChars.valid, false);
  assert.ok(badOtpChars.errors.otp);

  const valid = validatePasswordResetOtpConfirmInput({
    email: '  Admin@Kinship.Edu ',
    otp: ' 482-910 ',
    newPassword: 'NewPassword2026',
    confirmPassword: 'NewPassword2026',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized.email, 'admin@kinship.edu');
  assert.equal(valid.normalized.otp, '482910');
  assert.equal(valid.normalized.newPassword, 'NewPassword2026');
});

test('sanitizeResetQueryParam and formatResetErrorQueryMessage handle redirect parameters safely', () => {
  assert.equal(sanitizeResetQueryParam('  abc-123  '), 'abc-123');
  assert.equal(sanitizeResetQueryParam(['first-token', 'second']), 'first-token');
  assert.equal(sanitizeResetQueryParam('   '), null);
  assert.equal(sanitizeResetQueryParam(undefined), null);
  assert.equal(sanitizeResetQueryParam('x'.repeat(600)), null);

  assert.match(formatResetErrorQueryMessage('INVALID_TOKEN') ?? '', /invalid or has expired/i);
  assert.match(formatResetErrorQueryMessage('TOKEN_EXPIRED') ?? '', /invalid or has expired/i);
  assert.equal(formatResetErrorQueryMessage(null), null);
});

test('hashPassword and verifyPassword use salted scrypt and constant-time comparison', () => {
  const h1 = hashPassword('KinshipPass2026');
  const h2 = hashPassword('KinshipPass2026');

  assert.notEqual(h1, h2, 'each hash should have a unique random salt');
  assert.ok(h1.startsWith('scrypt$'));
  assert.equal(verifyPassword('KinshipPass2026', h1), true);
  assert.equal(verifyPassword('KinshipPass2026', h2), true);
  assert.equal(verifyPassword('WrongPass2026', h1), false);
  assert.equal(verifyPassword('KinshipPass2026', 'malformed-hash'), false);
  assert.equal(verifyPassword('KinshipPass2026', null), false);
});

test('session token generation and hashing are unique and deterministic', () => {
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();
  assert.equal(token1.length, 64);
  assert.notEqual(token1, token2);
  assert.equal(hashSessionToken(token1), hashSessionToken(`  ${token1}  `));
  assert.notEqual(hashSessionToken(token1), hashSessionToken(token2));
});

test('generateUsernameSlug derives clean slugs from name or email', () => {
  assert.equal(generateUsernameSlug('Dr. Elena Rostova', 'elena@kinship.edu'), 'dr-elena-rostova');
  assert.equal(generateUsernameSlug('', 'learner.test@example.com'), 'learner-test');
});

test('isNeonAuthServiceConfigured validates Neon Auth base URLs', () => {
  assert.equal(
    isNeonAuthServiceConfigured('https://ep-cool-123.neonauth.us-east-1.aws.neon.tech/neondb/auth'),
    true
  );
  assert.equal(isNeonAuthServiceConfigured(''), false);
  assert.equal(isNeonAuthServiceConfigured('not-a-url'), false);
});
