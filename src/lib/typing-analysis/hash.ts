import { createHash } from 'crypto';

export function hashTypingText(text: string): string {
  return createHash('sha256')
    .update(text.trim().toLowerCase().replace(/\s+/g, ' '))
    .digest('hex')
    .slice(0, 16);
}
