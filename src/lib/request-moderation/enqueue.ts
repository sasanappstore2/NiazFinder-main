/**
 * Enqueue request for auto-moderation (Phase 2).
 * Falls back to no-op when Nest backend is unavailable.
 */
export function enqueueRequestModerationJob(requestId: string): void {
  const nestBase = process.env.NEST_BACKEND_URL || process.env.BACKEND_URL;
  if (nestBase) {
    void fetch(`${nestBase}/api/internal/enqueue-request-moderation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    }).catch(() => fallbackModeration(requestId));
    return;
  }
  fallbackModeration(requestId);
}

function fallbackModeration(requestId: string): void {
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  void fetch(`${origin}/api/internal/request-moderation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.INTERNAL_API_SECRET
        ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET }
        : {}),
    },
    body: JSON.stringify({ requestId }),
  }).catch(() => {});
}
