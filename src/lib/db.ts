import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error'],
  });
}

function prismaClientIsStale(client: PrismaClient): boolean {
  if (typeof (client as PrismaClient & { userBlock?: unknown }).userBlock === 'undefined') {
    return true;
  }
  const voiceCallFields =
    (
      client as unknown as {
        _runtimeDataModel?: { models?: { VoiceCall?: { fields?: { name: string }[] } } };
      }
    )._runtimeDataModel?.models?.VoiceCall?.fields?.map((f) => f.name) ?? [];
  if (!voiceCallFields.includes('signalingOffer')) return true;
  if (!voiceCallFields.includes('signalingAnswer')) return true;
  return false;
}

export function getDb(): PrismaClient {
  let client = globalForPrisma.prisma;

  if (client && prismaClientIsStale(client)) {
    void client.$disconnect().catch(() => {});
    client = undefined;
    globalForPrisma.prisma = undefined;
  }

  if (!client) {
    client = createPrismaClient();
    globalForPrisma.prisma = client;
  }

  return client;
}

/** Every property access resolves a fresh client (fixes stale Prisma after migrate in dev). */
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
  const existing = globalForPrisma.prisma;
  if (existing && prismaClientIsStale(existing)) {
    void existing.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }
  globalForPrisma.prisma = getDb();
}
