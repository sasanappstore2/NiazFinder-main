// OTP storage — Redis when REDIS_URL is set, in-memory fallback for local dev.

interface OtpRecord {
  phone: string;
  code: string;
  type: string;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const OTP_PREFIX = 'otp:';
const memoryStore: OtpRecord[] = [];

let redisClient: import('ioredis').default | null = null;

async function getRedis(): Promise<import('ioredis').default | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (redisClient) return redisClient;
  try {
    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    if (redisClient.status !== 'ready') await redisClient.connect();
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

function redisKey(phone: string): string {
  return `${OTP_PREFIX}${phone}`;
}

function serialize(record: OtpRecord): string {
  return JSON.stringify({
    ...record,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  });
}

function deserialize(raw: string): OtpRecord {
  const p = JSON.parse(raw) as OtpRecord & { expiresAt: string; createdAt: string };
  return {
    ...p,
    expiresAt: new Date(p.expiresAt),
    createdAt: new Date(p.createdAt),
  };
}

async function readPhoneRecords(phone: string): Promise<OtpRecord[]> {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get(redisKey(phone)).catch(() => null);
    if (raw) return [deserialize(raw)];
    return [];
  }
  return memoryStore.filter((r) => r.phone === phone);
}

async function writePhoneRecord(record: OtpRecord): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    const ttlMs = record.expiresAt.getTime() - Date.now();
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    await redis.set(redisKey(record.phone), serialize(record), 'EX', ttlSec).catch(() => {});
    return;
  }
  for (let i = memoryStore.length - 1; i >= 0; i--) {
    if (memoryStore[i].phone === record.phone) {
      memoryStore.splice(i, 1);
    }
  }
  memoryStore.push(record);
}

export async function findValidOtp(phone: string, code: string): Promise<OtpRecord | null> {
  const records = await readPhoneRecords(phone);
  return (
    records
      .filter((r) => r.code === code && !r.verified && r.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null
  );
}

export async function findExistingOtp(phone: string): Promise<OtpRecord | null> {
  const records = await readPhoneRecords(phone);
  return (
    records
      .filter((r) => !r.verified && r.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null
  );
}

export async function createOtp(
  phone: string,
  code: string,
  type: string = 'auth',
  expiresMs: number = 2 * 60 * 1000
): Promise<OtpRecord> {
  const record: OtpRecord = {
    phone,
    code,
    type,
    verified: false,
    expiresAt: new Date(Date.now() + expiresMs),
    createdAt: new Date(),
  };
  await writePhoneRecord(record);
  return record;
}

export async function markOtpVerified(phone: string, code: string): Promise<OtpRecord | null> {
  const record = await findValidOtp(phone, code);
  if (record) {
    record.verified = true;
    await writePhoneRecord(record);
  }
  return record;
}

export async function findRecentlyVerifiedOtp(
  phone: string,
  code?: string,
  withinMs: number = 10 * 60 * 1000
): Promise<OtpRecord | null> {
  const cutoff = Date.now() - withinMs;
  const records = await readPhoneRecords(phone);
  return (
    records
      .filter(
        (r) =>
          r.verified &&
          r.createdAt.getTime() > cutoff &&
          (code == null || r.code === code)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null
  );
}
