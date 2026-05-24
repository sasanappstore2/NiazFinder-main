import type {
  NextQuestionResponse,
  ParseIntentResponse,
  ParsedIntent,
} from '@/contracts/need-intake';

export async function parseIntentApi(text: string): Promise<ParseIntentResponse> {
  const res = await fetch('/api/need-intake/parse-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در تحلیل نیاز');
  }
  return data as ParseIntentResponse;
}

export async function nextQuestionApi(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): Promise<NextQuestionResponse> {
  const res = await fetch('/api/need-intake/next-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intentType: parsed.intentType,
      parsedIntent: parsed,
      answers,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در بارگذاری سؤال');
  }
  return data as NextQuestionResponse;
}

export async function extractSlotsApi(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  lastAnswer?: { fieldKey: string; value: string | number }
): Promise<{ slots: Record<string, unknown> }> {
  const res = await fetch('/api/need-intake/extract-slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parsedIntent: parsed, answers, lastAnswer }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در استخراج اطلاعات');
  }
  return data as { slots: Record<string, unknown> };
}

export async function publishNeedApi(
  draft: { parsedIntent: ParsedIntent; answers: Record<string, unknown>; turns: unknown[] },
  token?: string | null
): Promise<{ id: string; slug: string; title: string }> {
  const res = await fetch('/api/need-intake/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ draft }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در ثبت نیاز');
  }
  return data as { id: string; slug: string; title: string };
}
