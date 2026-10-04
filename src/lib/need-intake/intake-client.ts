import type {
  ListingPreview,
  NeedDraft,
  PreviewListingResponse,
  PublishNeedValidationResponse,
} from '@/contracts/need-intake';

export type PublishNeedResult = {
  id: string;
  slug: string;
  title: string;
  message?: string;
  autoApproved?: boolean;
  status?: string;
  moderationStatus?: string;
};

async function pollPublishStatus(
  requestId: string,
  token?: string | null,
  maxAttempts = 60,
  intervalMs = 1500
): Promise<PublishNeedResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/need-intake/publish/status/${encodeURIComponent(requestId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = (await res.json()) as PublishNeedResult & {
      ready?: boolean;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || 'خطا در پیگیری وضعیت انتشار');
    }
    if (data.ready) {
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        message: data.message,
        autoApproved: data.autoApproved,
        status: data.status,
        moderationStatus: data.moderationStatus,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('پردازش آگهی بیش از حد طول کشید؛ لطفاً بعداً از داشبورد پیگیری کنید');
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
  options?: { linkToBusinessProfile?: boolean; idempotencyKey?: string }
): Promise<PublishNeedResult> {
  const snapshot = draft.publishSnapshot;
  const idempotencyKey =
    options?.idempotencyKey ?? snapshot?.idempotencyKey ?? globalThis.crypto.randomUUID();
  const res = await fetch('/api/need-intake/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      draft: snapshot?.draft ?? draft,
      listingPreview: snapshot?.listingPreview ?? listingPreview,
      snapshot,
      idempotencyKey,
      sessionId: sessionId ?? undefined,
      linkToBusinessProfile: options?.linkToBusinessProfile ?? false,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const validation = data as PublishNeedValidationResponse & { error?: string };
    if (validation.errors?.length) {
      const msg = validation.errors.map((e) => e.message).join(' · ');
      throw new Error(msg || 'اطلاعات نیاز برای انتشار کامل نیست');
    }
    throw new Error(validation.error || 'خطا در ثبت نیاز');
  }

  if (res.status === 202) {
    const accepted = data as { id: string; slug: string; title: string; message?: string };
    return pollPublishStatus(accepted.id, token);
  }

  return data as PublishNeedResult;
}
