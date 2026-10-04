/**
 * Fire-and-forget heavy intake job on Nest (BullMQ intake-heavy).
 */
export async function enqueueIntakeHeavyJob(
  requestId: string,
  sessionId?: string
): Promise<void> {
  const base =
    process.env.NEST_API_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_NEST_API_URL?.replace(/\/$/, '') ||
    '';

  if (!base) return;

  try {
    await fetch(`${base}/api/intake-typing/heavy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, sessionId }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn('[intake-heavy] enqueue failed:', err);
  }
}
