'use client';

import { Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  formatPhoneDisplayFa,
  isolatePhoneDisplay,
  phoneToTelHref,
} from '@/lib/chat/contact-share';

interface ChatContactShareCardProps {
  phone: string;
  avatarSrc?: string | null;
  isOwn: boolean;
}

export function ChatContactShareCard({ phone, avatarSrc, isOwn }: ChatContactShareCardProps) {
  const display = formatPhoneDisplayFa(phone);
  const tel = phoneToTelHref(phone);

  return (
    <div
      className={cn(
        'w-full max-w-[min(100%,252px)] overflow-hidden rounded-xl border shadow-sm',
        isOwn
          ? 'border-white/65 bg-white/96 text-neutral-950 shadow-neutral-950/15 dark:border-zinc-100/15 dark:bg-zinc-950/94 dark:text-zinc-50 dark:shadow-black/30'
          : 'border-border/70 bg-muted/90 text-foreground'
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-3.5 sm:px-3.5 sm:py-3.5">
        <Avatar
          className={cn(
            'size-12 shrink-0 ring-2 ring-inset',
            isOwn ? 'ring-neutral-200 dark:ring-zinc-600' : 'ring-background'
          )}
        >
          {avatarSrc ? (
            <AvatarImage src={avatarSrc} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback
            className={cn(
              'rounded-full text-xs font-bold',
              isOwn
                ? 'bg-emerald-600/12 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300'
                : 'bg-primary/15 text-primary'
            )}
          >
            <Phone className="size-5 opacity-90" aria-hidden />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-start">
          <p
            className={cn(
              'text-[11px] font-medium tracking-wide',
              isOwn ? 'text-neutral-600 dark:text-zinc-400' : 'text-muted-foreground'
            )}
          >
            شماره تماس
          </p>
          <p
            dir="ltr"
            className={cn(
              'mt-0.5 truncate text-start text-base font-semibold tabular-nums leading-tight tracking-tight [unicode-bidi:isolate]',
              isOwn ? 'text-neutral-900 dark:text-zinc-100' : 'text-foreground'
            )}
          >
            {isolatePhoneDisplay(display)}
          </p>
        </div>
      </div>
      <div className={cn('h-px', isOwn ? 'bg-neutral-200 dark:bg-zinc-700' : 'bg-border/80')} />
      <a
        href={tel}
        className={cn(
          'flex w-full items-center justify-center py-2.5 text-sm font-semibold transition-colors',
          isOwn
            ? 'text-emerald-700 hover:bg-emerald-700/10 dark:text-emerald-400 dark:hover:bg-emerald-400/15'
            : 'hover:bg-muted'
        )}
      >
        تماس تلفنی
      </a>
    </div>
  );
}
