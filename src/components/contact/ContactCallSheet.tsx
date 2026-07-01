'use client';

import Image from 'next/image';
import { Loader2, Phone, PhoneCall, Signal, Wifi } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserContactInfo } from '@/lib/contact/fetch-contact';
import {
  formatPhoneDisplayFa,
  isolatePhoneDisplay,
  phoneToTelHref,
} from '@/lib/chat/contact-share';

export type ContactCallSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  inAppLoading?: boolean;
  contact: UserContactInfo | null;
  displayName?: string;
  avatarUrl?: string | null;
  onInAppCall: () => void;
};

function ContactAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-2xl object-cover ring-2 ring-border/40"
      />
    );
  }
  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-sm font-bold text-muted-foreground ring-2 ring-border/40"
      aria-hidden
    >
      {name.slice(0, 2)}
    </div>
  );
}

function OptionSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/50 bg-muted/30 p-4">
      <div className="mb-3 size-11 rounded-xl bg-muted" />
      <div className="mb-2 h-4 w-2/3 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted/80" />
    </div>
  );
}

export function ContactCallSheet({
  open,
  onOpenChange,
  loading = false,
  inAppLoading = false,
  contact,
  displayName,
  avatarUrl,
  onInAppCall,
}: ContactCallSheetProps) {
  const title = displayName ?? contact?.displayName ?? 'تماس';
  const phone = contact?.phone?.trim() ?? '';
  const canPhone = Boolean(contact?.hasPhone && phone);
  const phoneDisplay = phone ? isolatePhoneDisplay(formatPhoneDisplayFa(phone)) : '';
  const telHref = phone ? phoneToTelHref(phone) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'max-h-[min(88vh,32rem)] rounded-t-3xl border-t border-border/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2',
          'sheet-safe-area-lg sm:mx-auto sm:max-w-lg'
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />

        <SheetHeader className="space-y-3 text-right">
          <div className="flex items-center gap-3">
            <ContactAvatar name={title} avatarUrl={avatarUrl} />
            <div className="min-w-0 flex-1 text-right">
              <SheetTitle className="truncate text-base font-semibold">{title}</SheetTitle>
              <SheetDescription className="text-xs leading-relaxed sm:text-sm">
                روش تماس را انتخاب کنید
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {loading ? (
            <>
              <OptionSkeleton />
              <OptionSkeleton />
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={inAppLoading || !contact}
                onClick={onInAppCall}
                className={cn(
                  'group relative flex min-h-[8.5rem] flex-col items-start gap-3 rounded-2xl border-2 p-4 text-right transition-all',
                  'border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent',
                  'hover:border-primary/45 hover:shadow-md hover:shadow-primary/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  'disabled:pointer-events-none disabled:opacity-60',
                  'active:scale-[0.99]'
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary/20">
                  {inAppLoading ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : (
                    <PhoneCall className="size-5" aria-hidden />
                  )}
                </span>
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-foreground">تماس درون‌برنامه‌ای</span>
                  <span className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <Wifi className="size-3 shrink-0" aria-hidden />
                    رایگان با اینترنت
                  </span>
                  <span className="block text-[11px] leading-relaxed text-muted-foreground/90">
                    تماس صوتی امن داخل نیازفایندر
                  </span>
                </span>
              </button>

              {canPhone && telHref ? (
                <a
                  href={telHref}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'group relative flex min-h-[8.5rem] flex-col items-start gap-3 rounded-2xl border-2 p-4 text-right transition-all',
                    'border-border/70 bg-card hover:border-emerald-500/35 hover:bg-emerald-500/5',
                    'hover:shadow-md hover:shadow-emerald-500/10',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35',
                    'active:scale-[0.99]'
                  )}
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500/15 dark:text-emerald-400">
                    <Phone className="size-5" aria-hidden />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-foreground">تماس تلفنی</span>
                    <span
                      className="block text-sm font-medium tracking-wide text-foreground/90"
                      dir="ltr"
                    >
                      {phoneDisplay}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <Signal className="size-3 shrink-0" aria-hidden />
                      از خط یا سیم‌کارت خود تماس بگیرید
                    </span>
                  </span>
                </a>
              ) : (
                <div
                  className="flex min-h-[8.5rem] flex-col items-start gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-right"
                  aria-disabled
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Phone className="size-5 opacity-50" aria-hidden />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-muted-foreground">تماس تلفنی</span>
                    <span className="block text-[11px] leading-relaxed text-muted-foreground">
                      شمارهٔ تماس ثبت نشده — از تماس درون‌برنامه‌ای یا چت استفاده کنید.
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          تماس‌های درون‌برنامه‌ای برای حفظ امنیت و سوابق ارتباط در پلتفرم انجام می‌شود.
        </p>
      </SheetContent>
    </Sheet>
  );
}
