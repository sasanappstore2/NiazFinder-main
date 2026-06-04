import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'crypto';

const SCRYPT_PREFIX = 'scrypt:';
const LEGACY_SALT = '_needfinder_salt';

function legacyHash(password: string): string {
  return createHash('sha256').update(password + LEGACY_SALT).digest('hex');
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}${salt}:${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string | null | undefined): boolean {
  if (!hashedPassword) return false;

  if (hashedPassword.startsWith(SCRYPT_PREFIX)) {
    const rest = hashedPassword.slice(SCRYPT_PREFIX.length);
    const [salt, expectedHex] = rest.split(':');
    if (!salt || !expectedHex) return false;
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  }

  // Legacy SHA256 — still accepted; rehash on successful login at call site
  return legacyHash(password) === hashedPassword;
}

/** True when stored hash uses deprecated SHA256 format. */
export function passwordNeedsRehash(hashedPassword: string | null | undefined): boolean {
  return Boolean(hashedPassword && !hashedPassword.startsWith(SCRYPT_PREFIX));
}

/** @deprecated use hashPassword — kept for imports */
export function simpleHash(password: string): string {
  return legacyHash(password);
}
