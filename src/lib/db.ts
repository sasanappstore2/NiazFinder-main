import type { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Known model delegates that must exist after recent schema changes. */
const REQUIRED_DELEGATES = [
  'user',
  'wallet',
  'conversation',
  'message',
  'userBlock',
  'businessContactPoint',
  'agentUserMemory',
  'agentConversationSummary',
] as const;

function createPrismaClient(): PrismaClient {
  // Prefer static import path for stability; dynamic require only when needed in CJS.
  const { PrismaClient: Client } = require('@prisma/client') as typeof import('@prisma/client');
  return new Client({
    log: process.env.NODE_ENV === 'production' ? [] : ['error'],
  });
}

function hasRequiredDelegates(client: PrismaClient): boolean {
  for (const name of REQUIRED_DELEGATES) {
    if (typeof (client as unknown as Record<string, unknown>)[name] === 'undefined') {
      return false;
    }
  }
  return true;
}

/**
 * Replace the global client without racing `$disconnect` on in-flight queries.
 * Old engines are left to GC; disconnecting mid-request causes
 * "Engine is not yet connected" panics under Next.js HMR / parallel API calls.
 */
function replacePrismaClient(): PrismaClient {
  const previous = globalForPrisma.prisma;
  const next = createPrismaClient();
  globalForPrisma.prisma = next;
  if (previous) {
    // Deferred disconnect — never block or race active requests.
    setTimeout(() => {
      void previous.$disconnect().catch(() => {});
    }, 5_000);
  }
  return next;
}

export function getDb(): PrismaClient {
  let client = globalForPrisma.prisma;
  if (!client || !hasRequiredDelegates(client)) {
    client = replacePrismaClient();
  }
  return client;
}

/**
 * Soft refresh for rare cases after `prisma generate` in a long-lived process.
 * Safe to call; does not disconnect the active client immediately.
 */
export function resetPrismaClientForDev(): void {
  if (process.env.NODE_ENV === 'production') return;
  replacePrismaClient();
}

/** Stable singleton — do not Proxy-reset on every property access. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = getDb();
}
