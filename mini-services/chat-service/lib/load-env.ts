import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/** Load repo-root `.env` when chat-service runs from mini-services/chat-service. */
export function loadRootEnv(): void {
  const rootEnv = resolve(import.meta.dir, '../../../.env');
  if (!existsSync(rootEnv)) return;

  const text = readFileSync(rootEnv, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();
