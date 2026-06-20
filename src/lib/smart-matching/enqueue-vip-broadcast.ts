import { runVipBroadcast } from './vip-broadcast';
import { isSmartMatchingEnabled } from './env';

/**
 * Trigger VIP broadcast after moderation approve.
 * Uses local lib when Nest is unavailable; Nest internal route also calls same logic.
 */
export async function enqueueVipBroadcast(requestId: string): Promise<void> {
  if (!isSmartMatchingEnabled()) return;

  const base =
    process.env.NEST_API_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_NEST_API_URL?.replace(/\/$/, '') ||
    '';

  if (base) {
    try {
      const res = await fetch(`${base}/api/smart-matching/internal/needs/${requestId}/vip-broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.SMART_MATCHING_INTERNAL_SECRET ?? 'smart-matching-internal-dev',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return;
      console.warn('[vip-broadcast] Nest returned', res.status);
    } catch (err) {
      console.warn('[vip-broadcast] Nest call failed, running locally:', err);
    }
  }

  void runVipBroadcast(requestId).catch((err) => console.error('[vip-broadcast] local failed:', err));
}
