import type {
  ListingPreview,
  NeedDraft,
  PreviewListingResponse,
  PublishNeedValidationResponse,
} from '@/contracts/need-intake';

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
): Promise<{ id: string; slug: string; title: string; message?: string; autoApproved?: boolean }> {
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
    const validation = data as PublishNeedValidationResponse & { error?: string };
    if (validation.errors?.length) {
      const msg = validation.errors.map((e) => e.message).join(' · ');
      throw new Error(msg || 'اطلاعات نیاز برای انتشار کامل نیست');
    }
    throw new Error(validation.error || 'خطا در ثبت نیاز');
  }
  return data as { id: string; slug: string; title: string; message?: string };
}
