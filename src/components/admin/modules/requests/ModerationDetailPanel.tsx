'use client';

import { Loader2, User } from 'lucide-react';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { ModerationDetail } from './useModerationQueue';

function displayName(u: { displayName: string | null; firstName: string | null; lastName: string | null; phone?: string }) {
  return u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.phone || '—';
}

export function ModerationDetailPanel({
  detail,
  isLoading,
  canModerate,
  onApprove,
  onReject,
  onClaim,
}: {
  detail: ModerationDetail | null;
  isLoading: boolean;
  canModerate: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClaim: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-(--color-secondaryText)">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-(--color-secondaryText)">
        آیتمی انتخاب نشده
      </div>
    );
  }

  const dynamicEntries = Object.entries(detail.dynamicAnswers ?? {}).filter(
    ([k]) => !k.startsWith('_')
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{detail.title}</h2>
            <AdminBadge variant="info">{detail.moderationStatus}</AdminBadge>
          </div>
          <p className="mt-1 font-mono text-xs text-(--color-secondaryText)" dir="ltr">
            /{detail.slug}
          </p>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-(--color-secondaryText)">دسته: </span>
            {detail.subcategory?.name ?? detail.category?.name ?? '—'}
          </div>
          <div>
            <span className="text-(--color-secondaryText)">شهر: </span>
            {detail.city ?? '—'}
          </div>
        </div>

        <div className="rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg)/50 p-3">
          <p className="mb-1 text-xs font-semibold text-(--color-secondaryText)">توضیحات</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.description}</p>
        </div>

        {dynamicEntries.length > 0 && (
          <div className="rounded-lg border border-(--color-mainBorder) p-3">
            <p className="mb-2 text-xs font-semibold text-(--color-secondaryText)">فیلدهای اضافی</p>
            <div className="grid gap-1.5 text-sm">
              {dynamicEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-(--color-secondaryText)">{k}</span>
                  <span className="max-w-[60%] truncate text-left" dir="ltr">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-(--color-mainBorder) p-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-(--color-logoBg)/20">
            <User className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{displayName(detail.user)}</p>
            <p className="text-xs text-(--color-secondaryText)" dir="ltr">
              {detail.user.phone}
            </p>
          </div>
        </div>
      </div>

      {canModerate && detail.moderationStatus === 'PENDING' && (
        <div className="flex flex-wrap gap-2 border-t border-(--color-mainBorder) p-4">
          <Button className="admin-btn-primary flex-1" onClick={onApprove}>
            تأیید (A)
          </Button>
          <Button variant="outline" className="admin-input" onClick={onReject}>
            رد (R)
          </Button>
          {!detail.assignedToUserId && (
            <Button variant="ghost" size="sm" onClick={onClaim}>
              اختصاص به من
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
