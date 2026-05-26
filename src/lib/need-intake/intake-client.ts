import type {
  ChatTurnResponse,
  ListingPreview,
  NeedDraft,
  NextQuestionResponse,
  ParseIntentResponse,
  ParsedIntent,
  PreviewListingResponse,
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

export async function chatTurnApi(
  draft: NeedDraft,
  message: string
): Promise<ChatTurnResponse & { mergedIntent?: ParsedIntent | null }> {
  const res = await fetch('/api/need-intake/chat-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft, message }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در گفتگو');
  }
  return data as ChatTurnResponse & { mergedIntent?: ParsedIntent | null };
}

export async function previewListingApi(
  draft: NeedDraft,
  extras?: string[]
): Promise<PreviewListingResponse> {
  const res = await fetch('/api/need-intake/preview-listing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft, extras }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در ساخت پیش‌نمایش');
  }
  return data as PreviewListingResponse;
}

export async function publishNeedApi(
  draft: NeedDraft,
  token?: string | null,
  listingPreview?: ListingPreview,
  sessionId?: string | null,
  options?: { linkToBusinessProfile?: boolean }
): Promise<{ id: string; slug: string; title: string; message?: string }> {
  const res = await fetch('/api/need-intake/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      draft,
      listingPreview,
      sessionId: sessionId ?? undefined,
      linkToBusinessProfile: options?.linkToBusinessProfile ?? false,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در ثبت نیاز');
  }
  return data as { id: string; slug: string; title: string; message?: string };
}
