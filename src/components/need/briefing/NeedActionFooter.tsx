'use client';

import { ChevronDown, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ContactActions } from '@/components/contact/ContactActions';
import { routeBuilder } from '@/config/routes';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NEED_OWNER_PROPOSALS_ANCHOR, registrantInitials } from './need-brief-utils';
import { NeedBusinessActions } from './NeedBusinessActions';

interface NeedActionFooterProps {
  request: ServiceRequest;
  authorName: string;
  isOwner: boolean;
  isBusinessUser: boolean;
  className?: string;
}

export function NeedActionFooter({
  request,
  authorName,
  isOwner,
  isBusinessUser,
  className,
}: NeedActionFooterProps) {
  const needPreview = {
    title: request.title,
    categoryName: request.categoryName,
    city: request.city,
  };
  const trimmedName = authorName.trim() || 'کاربر نیاز‌فایندر';

  return (
    <footer
      className={cn(
        'mt-5 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:p-4',
        className
      )}
      aria-label="ثبت‌کننده و اقدامات"
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar className="size-12 shrink-0 rounded-2xl border border-border/50">
          <AvatarImage src={request.user.avatar ?? undefined} alt={trimmedName} />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
            {registrantInitials(request.user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-overline text-muted-foreground">ثبت‌کننده نیاز</p>
          <p className="truncate text-base font-semibold text-foreground">{trimmedName}</p>
          {request.user.city ? (
            <p className="flex items-center gap-1 truncate text-caption text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {request.user.city}
            </p>
          ) : (
            <p className="text-caption text-muted-foreground">شهر ثبت نشده</p>
          )}
        </div>
        {isOwner && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-caption font-medium text-primary">
            آگهی شما
          </span>
        )}
      </div>

      {isOwner && (
        <Button variant="outline" className="w-full rounded-xl" asChild>
          <a href={`#${NEED_OWNER_PROPOSALS_ANCHOR}`}>
            <ChevronDown className="size-4 ml-1" aria-hidden />
            مشاهده پیشنهادهای دریافتی
          </a>
        </Button>
      )}

      {!isOwner && isBusinessUser && (
        <NeedBusinessActions
          otherUserId={request.user.id}
          requestId={request.id}
          displayName={authorName.trim() || undefined}
          needPreview={needPreview}
        />
      )}

      {!isOwner && !isBusinessUser && (
        <ContactActions
          otherUserId={request.user.id}
          requestId={request.id}
          displayName={authorName.trim() || undefined}
          needPreview={needPreview}
          chatLabel="پیام و گفتگو"
          variant="stacked"
          showProfile={false}
          className="hidden lg:flex [&>button]:h-11 [&>button]:min-h-11 [&>button]:rounded-xl"
        />
      )}

      {!isOwner && !isBusinessUser && (
        <p className="mt-2 text-center text-caption text-muted-foreground lg:hidden">
          برای هماهنگی از نوار پایین صفحه استفاده کنید
        </p>
      )}
    </footer>
  );
}
