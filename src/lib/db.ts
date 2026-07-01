import type { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function bustPrismaModuleCache(): void {
  if (typeof require === 'undefined') return;
  try {
    const req = require as NodeRequire & { cache: Record<string, unknown> };
    for (const key of Object.keys(req.cache)) {
      if (key.includes('@prisma/client') || key.includes('.prisma/client')) {
        delete req.cache[key];
      }
    }
  } catch {
    // ignore — ESM-only runtimes
  }
}

function createPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV !== 'production') {
    bustPrismaModuleCache();
  }
  // Dynamic require so dev picks up `prisma generate` without a full restart.
   
  const { PrismaClient: FreshClient } = require('@prisma/client') as typeof import('@prisma/client');
  return new FreshClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error'],
  });
}

function prismaClientIsStale(client: PrismaClient): boolean {
  if (typeof (client as PrismaClient & { userBlock?: unknown }).userBlock === 'undefined') {
    return true;
  }
  if (
    typeof (client as PrismaClient & { businessContactPoint?: unknown }).businessContactPoint ===
    'undefined'
  ) {
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
  const messageFields =
    (
      client as unknown as {
        _runtimeDataModel?: { models?: { Message?: { fields?: { name: string }[] } } };
      }
    )._runtimeDataModel?.models?.Message?.fields?.map((f) => f.name) ?? [];
  if (!messageFields.includes('isPinned')) return true;
  const scraperFields =
    (
      client as unknown as {
        _runtimeDataModel?: { models?: { RegionalFilingScraper?: { fields?: { name: string; isRequired?: boolean }[] } } };
      }
    )._runtimeDataModel?.models?.RegionalFilingScraper?.fields ?? [];
  const passwordEncField = scraperFields.find((f) => f.name === 'passwordEnc');
  if (passwordEncField?.isRequired === true) return true;
  if (!scraperFields.some((f) => f.name === 'failureCount')) return true;
  const filingFields =
    (
      client as unknown as {
        _runtimeDataModel?: { models?: { RegionalFiling?: { fields?: { name: string }[] } } };
      }
    )._runtimeDataModel?.models?.RegionalFiling?.fields?.map((f) => f.name) ?? [];
  if (!filingFields.includes('totalFloors')) return true;
  if (!filingFields.includes('dataCompleteness')) return true;
  if (!filingFields.includes('detailUrl')) return true;
  return false;
}

/** Model delegates missing after `prisma generate` + migrate without dev restart. */
function missingModelDelegate(client: PrismaClient, prop: string | symbol): boolean {
  if (typeof prop !== 'string' || prop.startsWith('$') || prop.startsWith('_')) {
    return false;
  }
  return Reflect.get(client, prop) === undefined;
}

function resetPrismaClient(): void {
  const existing = globalForPrisma.prisma;
  if (existing) {
    void existing.$disconnect().catch(() => {});
  }
  globalForPrisma.prisma = undefined;
  if (process.env.NODE_ENV !== 'production') {
    bustPrismaModuleCache();
  }
}

export function getDb(): PrismaClient {
  let client = globalForPrisma.prisma;

  if (client && prismaClientIsStale(client)) {
    resetPrismaClient();
    client = undefined;
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
    let client = getDb();
    let value = Reflect.get(client, prop, receiver);

    if (missingModelDelegate(client, prop)) {
      resetPrismaClient();
      client = getDb();
      value = Reflect.get(client, prop, receiver);
    }

    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

if (process.env.NODE_ENV !== 'production') {
  const existing = globalForPrisma.prisma;
  if (existing && prismaClientIsStale(existing)) {
    resetPrismaClient();
  }
  globalForPrisma.prisma = getDb();
}
