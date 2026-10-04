/** Default handle for new accounts — every user gets a searchable ID from day
 * one (social layer); users can change it later in profile settings. */
const USERNAME_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateDefaultUsername(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += USERNAME_ALPHABET[Math.floor(Math.random() * USERNAME_ALPHABET.length)];
  }
  return `user_${suffix}`;
}

/** 3-20 chars, lowercase latin letters, digits, dot or underscore; must start
 * with a letter. Mirrors common social-network handle rules. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,19}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
