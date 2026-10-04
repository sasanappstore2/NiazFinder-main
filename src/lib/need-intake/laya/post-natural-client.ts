'use client';

import {
  postNaturalAnalyzeResponseSchema,
  type PostNaturalAnalyzeRequest,
  type PostNaturalAnalyzeResponse,
} from './post-natural-contract';

export async function analyzePostNaturalText(
  payload: PostNaturalAnalyzeRequest,
  options: { signal?: AbortSignal } = {}
): Promise<PostNaturalAnalyzeResponse> {
  const response = await fetch('/api/post/natural-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options.signal,
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'تحلیل طبیعی موقتاً در دسترس نیست';
    throw new Error(message);
  }

  const parsed = postNaturalAnalyzeResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error('پاسخ تحلیل طبیعی معتبر نیست');
  return parsed.data;
}
