import crypto from 'crypto';

export function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
}

export function verifyPassword(password: string, hashedPassword: string | null | undefined): boolean {
  if (!hashedPassword) return false;
  return simpleHash(password) === hashedPassword;
}
