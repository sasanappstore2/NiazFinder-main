import { db } from '@/lib/db';
import { queueNeedRagIndex } from '@/lib/rag/queue';
import { getVipTtlMs } from './env';

const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Flip need to PUBLIC when VIP window ends. Idempotent. */
export async function flipNeedToPublic(requestId: string) {
  const need = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, needAccessStatus: true, status: true },
  });

  if (!need) return { skipped: 'not_found' as const };
  if (need.needAccessStatus !== 'PRIVATE') return { skipped: 'not_private' as const };
  if (need.status !== 'OPEN') return { skipped: 'not_open' as const };

  const updated = await db.serviceRequest.updateMany({
    where: { id: requestId, needAccessStatus: 'PRIVATE', status: 'OPEN' },
    data: { needAccessStatus: 'PUBLIC' },
  });

  if (updated.count > 0) {
    queueNeedRagIndex(requestId, 'UPSERT');
    return { flipped: true as const };
  }
  return { skipped: 'race' as const };
}

/** Schedule expiry via Nest BullMQ when available; fallback to in-process timer. */
export async function scheduleNeedExpiry(requestId: string) {
  const base =
    process.env.NEST_API_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_NEST_API_URL?.replace(/\/$/, '') ||
    '';

  if (base) {
    try {
      await fetch(`${base}/api/smart-matching/internal/needs/${requestId}/schedule-expiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.SMART_MATCHING_INTERNAL_SECRET ?? 'smart-matching-internal-dev',
        },
        signal: AbortSignal.timeout(5000),
      });
      return;
    } catch (err) {
      console.warn('[need-expiry] Nest enqueue failed, using local timer:', err);
    }
  }

  const delay = getVipTtlMs();
  const existing = expiryTimers.get(requestId);
  if (existing) clearTimeout(existing);

  expiryTimers.set(
    requestId,
    setTimeout(() => {
      expiryTimers.delete(requestId);
      void flipNeedToPublic(requestId).catch(console.error);
    }, delay)
  );
}

/** Safety-net cron helper: flip expired PRIVATE needs. */
export async function flipExpiredPrivateNeeds() {
  const now = new Date();
  const expired = await db.serviceRequest.findMany({
    where: {
      needAccessStatus: 'PRIVATE',
      status: 'OPEN',
      vipExpiresAt: { lt: now },
    },
    select: { id: true },
    take: 100,
  });

  let flipped = 0;
  for (const row of expired) {
    const r = await flipNeedToPublic(row.id);
    if ('flipped' in r && r.flipped) flipped++;
  }
  return { scanned: expired.length, flipped };
}

export async function getNeedVisibility(requestId: string) {
  const need = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      needAccessStatus: true,
      vipExpiresAt: true,
      status: true,
    },
  });
  if (!need) return null;

  const now = Date.now();
  const expiresAt = need.vipExpiresAt?.getTime() ?? null;
  const remainingMs =
    need.needAccessStatus === 'PRIVATE' && expiresAt ? Math.max(0, expiresAt - now) : 0;

  return {
    needAccessStatus: need.needAccessStatus,
    vipExpiresAt: need.vipExpiresAt?.toISOString() ?? null,
    status: need.status,
    remainingMs,
  };
}
