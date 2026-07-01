'use client';

import { Building2, MapPin, Phone } from 'lucide-react';
import { toPersianDigits } from '@/lib/format/digits';
import type { FilingSourceMeta } from '@/lib/filing/filing-view-model';
import { cn } from '@/lib/utils';

type Props = {
  sourceMeta: FilingSourceMeta;
  className?: string;
};

export function FilingBrokerPanel({ sourceMeta, className }: Props) {
  const hasBroker =
    sourceMeta.brokerOffice || sourceMeta.brokerPhone || sourceMeta.brokerAddress;
  const hasOwner = sourceMeta.ownerAddress || sourceMeta.ownerPhone;

  if (!hasBroker && !hasOwner) {
    return (
      <div className={cn('rounded-xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground', className)}>
        <Building2 className="mx-auto mb-2 size-8 opacity-50" />
        <p>اطلاعات تماس مشاور هنوز ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-card p-4 text-center shadow-sm', className)}>
      <p className="text-xs font-semibold text-muted-foreground">اطلاعات تماس</p>

      {sourceMeta.brokerOffice ? (
        <p className="mt-3 text-sm font-bold">{sourceMeta.brokerOffice}</p>
      ) : null}

      {sourceMeta.brokerAddress && !sourceMeta.ownerAddress ? (
        <p className="mt-2 inline-flex items-start justify-center gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span>{sourceMeta.brokerAddress}</span>
        </p>
      ) : null}

      {sourceMeta.brokerPhone ? (
        <p className="mt-3 inline-flex items-center justify-center gap-1 text-sm font-semibold tabular-nums">
          <Phone className="size-4 opacity-70" />
          {toPersianDigits(sourceMeta.brokerPhone)}
        </p>
      ) : null}

      {hasOwner ? (
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-right dark:border-orange-900/40 dark:bg-orange-950/30">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">آدرس مالک (عضو)</p>
          {sourceMeta.ownerAddress ? (
            <p className="mt-1 text-xs leading-relaxed">{sourceMeta.ownerAddress}</p>
          ) : null}
          {sourceMeta.ownerPhone ? (
            <p className="mt-2 text-sm font-semibold tabular-nums">{toPersianDigits(sourceMeta.ownerPhone)}</p>
          ) : null}
        </div>
      ) : null}

      {!sourceMeta.authenticated && hasBroker ? (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          برای مشاهده آدرس مالک از طریق ورود مشاورین املاک وارد شوید.
        </p>
      ) : null}
    </div>
  );
}
