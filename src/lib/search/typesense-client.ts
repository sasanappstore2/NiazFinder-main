import 'server-only';

import Typesense from 'typesense';

export const BUSINESS_PROFILES_COLLECTION = 'business_profiles';

type TypesenseConfig = {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  apiKey: string;
};

let client: InstanceType<typeof Typesense.Client> | null = null;
let lastHealthOk: boolean | null = null;
let lastHealthAt = 0;
const HEALTH_TTL_MS = 15_000;

function readConfig(): TypesenseConfig | null {
  const apiKey = process.env.TYPESENSE_API_KEY?.trim();
  if (!apiKey || process.env.TYPESENSE_ENABLED !== 'true') {
    return null;
  }

  const host = process.env.TYPESENSE_HOST?.trim() || '127.0.0.1';
  const port = Number(process.env.TYPESENSE_PORT ?? 8108);
  const protocol =
    process.env.TYPESENSE_PROTOCOL === 'https' ? 'https' : ('http' as const);

  return { host, port, protocol, apiKey };
}

/** Whether Typesense integration is configured. */
export function typesenseEnabled(): boolean {
  return readConfig() !== null;
}

/** Singleton Typesense client ? returns null when disabled. */
export function getTypesenseClient(): InstanceType<typeof Typesense.Client> | null {
  const config = readConfig();
  if (!config) return null;

  if (!client) {
    client = new Typesense.Client({
      nodes: [
        {
          host: config.host,
          port: config.port,
          protocol: config.protocol,
        },
      ],
      apiKey: config.apiKey,
      connectionTimeoutSeconds: 3,
      numRetries: 1,
      retryIntervalSeconds: 0.25,
    });
  }

  return client;
}

/** Lightweight health probe with short TTL cache. */
export async function isTypesenseHealthy(): Promise<boolean> {
  const ts = getTypesenseClient();
  if (!ts) return false;

  const now = Date.now();
  if (lastHealthOk !== null && now - lastHealthAt < HEALTH_TTL_MS) {
    return lastHealthOk;
  }

  try {
    const health = await ts.health.retrieve();
    lastHealthOk = health.ok === true;
  } catch {
    lastHealthOk = false;
  }
  lastHealthAt = now;
  return lastHealthOk;
}

export function resetTypesenseClientForTests() {
  client = null;
  lastHealthOk = null;
  lastHealthAt = 0;
}
