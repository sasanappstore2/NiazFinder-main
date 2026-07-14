'use client';

import { ChevronDown, Clock, ClipboardList, Loader2, MapPin, MessageCircle, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { routeBuilder } from '@/config/routes';
import { getTimeAgo } from '@/lib/constants';
import { formatCollaborationCardCopy } from '@/lib/business/workspace/collaboration-card-display';
import {
  startConversation,
  syncAndNavigateToConversation,
  ContactAuthRequiredError,
} from '@/lib/contact/start-conversation';
import { savePendingContact } from '@/lib/contact/pending-contact';
import { useAppStore } from '@/lib/store';
import { useBusinessContact } from '@/hooks/use-business-contact';
import { useContactCallSheet } from '@/components/contact/use-contact-call-sheet';
import { cn } from '@/lib/utils';
import type { WorkspaceCollaborationItem } from '../../types';

const PRIORITY_LABEL: Record<WorkspaceCollaborationItem['priority'], string> = {
  normal: 'عادی',
  important: 'مهم',
  urgent: 'فوری',
};

const PRIORITY_CLASS: Record<WorkspaceCollaborationItem['priority'], string> = {
  normal: 'bg-muted text-muted-foreground',
  important: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  urgent: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

const SCOPE_LABEL = {
  regional: 'منطقه‌ای',
  cross_regional: 'فرامنطقه‌ای',
} as const;

function authorInitials(name: string): string {
  const primary = name.split('|')[0]?.trim() || name.trim();
  return primary.slice(0, 2) || '؟';
}

function shortAuthorName(name: string): string {
  return name.split('|')[0]?.trim() || name.trim();
}

function WorkspaceCardContactRow({
  item,
  expanded = false,
}: {
  item: WorkspaceCollaborationItem;
  expanded?: boolean;
}) {
  const router = useRouter();
  const { openBusinessContact, picker } = useBusinessContact();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const currentUserId = useAppStore((s) => s.currentUser?.id);
  const { openCallSheet, sheet: callSheet } = useContactCallSheet();
  const [chatLoading, setChatLoading] = useState(false);
  const [callLoading, setCallLoading] = useState(false);

  const userId = item.authorUserId;
  if (!userId || currentUserId === userId) return null;

  const profileHref = item.authorSlug
    ? routeBuilder.businessProfile(item.authorSlug)
    : routeBuilder.pro(userId);

  const requireAuth = (action: 'chat' | 'call') => {
    savePendingContact({
      action,
      otherUserId: userId,
      returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    setAuthModalOpen(true);
  };

  const handleChat = async () => {
    if (!isAuthenticated || !authToken) {
      requireAuth('chat');
      return;
    }
    setChatLoading(true);
    try {
      if (item.authorSlug) {
        await openBusinessContact({
          businessSlug: item.authorSlug,
          returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
        return;
      }
      const result = await startConversation({ otherUserId: userId }, authToken);
      syncAndNavigateToConversation(router, result);
    } catch (err) {
      if (err instanceof ContactAuthRequiredError) {
        requireAuth('chat');
        return;
      }
      toast.error('شروع چت ناموفق بود');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCall = async () => {
    if (!isAuthenticated || !authToken) {
      requireAuth('call');
      return;
    }
    setCallLoading(true);
    try {
      await openCallSheet({ otherUserId: userId, displayName: item.businessName });
    } finally {
      setCallLoading(false);
    }
  };

  return (
    <>
      {picker}
      {callSheet}
      <div
        className={cn(
          expanded ? 'flex flex-col gap-1.5' : 'grid grid-cols-3 gap-1',
          'w-full'
        )}
        role="group"
        aria-label={`ارتباط با ${item.businessName}`}
      >
        {item.chatEnabled !== false ? (
          <Button
            type="button"
            variant={expanded ? 'default' : 'secondary'}
            size={expanded ? 'sm' : 'icon'}
            className={cn(
              expanded ? 'h-8 w-full justify-start text-xs' : 'size-8 w-full min-w-0 shrink'
            )}
            disabled={chatLoading}
            aria-label="شروع چت"
            onClick={() => void handleChat()}
          >
            {chatLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MessageCircle className={cn('size-3.5', expanded && 'ml-1.5')} />
            )}
            {expanded ? `شروع چت با ${shortAuthorName(item.businessName)}` : null}
          </Button>
        ) : expanded ? null : (
          <span />
        )}
        {item.hasPhone ? (
          <Button
            type="button"
            variant="outline"
            size={expanded ? 'sm' : 'icon'}
            className={cn(
              expanded ? 'h-8 w-full justify-start text-xs' : 'size-8 w-full min-w-0 shrink'
            )}
            disabled={callLoading}
            aria-label="تماس"
            onClick={() => void handleCall()}
          >
            {callLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Phone className={cn('size-3.5', expanded && 'ml-1.5')} />
            )}
            {expanded ? 'تماس' : null}
          </Button>
        ) : expanded ? null : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          size={expanded ? 'sm' : 'icon'}
          className={cn(
            expanded ? 'h-8 w-full justify-start text-xs' : 'size-8 w-full min-w-0 shrink'
          )}
          aria-label="پروفایل"
          asChild
        >
          <Link href={profileHref}>
            <User className={cn('size-3.5', expanded && 'ml-1.5')} />
            {expanded ? 'مشاهده پروفایل' : null}
          </Link>
        </Button>
      </div>
    </>
  );
}

function CollaborationPostCard({
  item,
  dragHandle,
  onAddToFollowUp,
  isInFollowUps,
}: {
  item: WorkspaceCollaborationItem;
  dragHandle?: React.ReactNode;
  onAddToFollowUp?: (item: WorkspaceCollaborationItem) => void;
  isInFollowUps?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scopeKey = item.scope ?? 'regional';
  const rawHeadline = item.headline ?? item.description ?? '';
  const { headline, location } = formatCollaborationCardCopy(rawHeadline, item.area);
  const extraChips = [item.areaBandLabel, item.budgetBandLabel].filter(Boolean);
  const canContact = Boolean(item.authorUserId);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="@container w-full min-w-0 gap-0 overflow-hidden border-border/60 p-0 shadow-none">
        <div className="border-b border-border/40 bg-muted/15 px-2 py-2">
          <div className="flex items-center gap-1.5">
            {dragHandle ? <span className="shrink-0">{dragHandle}</span> : null}
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary"
              aria-hidden
            >
              {authorInitials(item.businessName)}
            </div>
            <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight">
              {item.businessName}
            </p>
            {canContact ? (
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={open ? 'بستن جزئیات همکاری' : 'باز کردن همکاری و چت'}
                >
                  <ChevronDown
                    className={cn('size-4 transition-transform', open && 'rotate-180')}
                  />
                </Button>
              </CollapsibleTrigger>
            ) : null}
          </div>
          {location ? (
            <p className="mt-1 flex min-w-0 items-center gap-1 ps-8 text-[10px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>

        <CollapsibleTrigger asChild disabled={!canContact}>
          <button
            type="button"
            className={cn(
              'w-full space-y-1.5 px-2 py-2 text-start transition-colors',
              canContact && 'hover:bg-muted/20'
            )}
          >
            {headline ? (
              <p className="line-clamp-2 text-pretty break-words text-xs font-medium leading-5 text-foreground">
                {headline}
              </p>
            ) : null}

            {extraChips.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {extraChips.map((chip) => (
                  <Badge
                    key={chip}
                    variant="secondary"
                    className="h-5 max-w-full truncate px-1.5 text-[9px] font-normal"
                  >
                    {chip}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex min-w-0 items-center justify-between gap-1 text-[10px] text-muted-foreground">
              <Badge
                variant="outline"
                className="h-5 shrink-0 border-dashed px-1.5 text-[9px] font-normal"
              >
                {SCOPE_LABEL[scopeKey]}
              </Badge>
              <span className="flex shrink-0 items-center gap-0.5">
                <Clock className="size-3" aria-hidden />
                <time dateTime={item.createdAt}>{getTimeAgo(item.createdAt)}</time>
              </span>
            </div>
          </button>
        </CollapsibleTrigger>

        {canContact ? (
          <CollapsibleContent>
            <div className="space-y-2 border-t border-border/40 bg-muted/10 px-2 py-2">
              <p className="text-[10px] text-muted-foreground">همکاری با این مشاور</p>
              <WorkspaceCardContactRow item={item} expanded />
            </div>
          </CollapsibleContent>
        ) : null}

        <div className="flex justify-end border-t border-border/40 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            disabled={isInFollowUps}
            aria-label={isInFollowUps ? 'در پیگیری‌ها ثبت شده' : 'افزودن به پیگیری‌ها'}
            onClick={() => onAddToFollowUp?.(item)}
          >
            <ClipboardList className="size-3.5" />
          </Button>
        </div>
      </Card>
    </Collapsible>
  );
}

function CollaborationLegacyCard({
  item,
  dragHandle,
}: {
  item: WorkspaceCollaborationItem;
  dragHandle?: React.ReactNode;
}) {
  return (
    <Card className="w-full min-w-0 gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="flex items-start gap-1.5 px-2 py-2">
        {dragHandle}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
          {authorInitials(item.businessName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="truncate text-[11px] font-semibold">{item.businessName}</p>
            <Badge className={cn('shrink-0 border-0 text-[9px]', PRIORITY_CLASS[item.priority])}>
              {PRIORITY_LABEL[item.priority]}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.collaborationType}</p>
        </div>
      </div>

      {item.area ? (
        <p className="line-clamp-2 px-2 pb-2 text-[10px] text-muted-foreground">{item.area}</p>
      ) : null}

      <div className="flex items-center justify-end gap-1 border-t border-border/40 px-2 py-1.5 text-[10px] text-muted-foreground">
        <Clock className="size-3" />
        {getTimeAgo(item.createdAt)}
      </div>
    </Card>
  );
}

export function CollaborationCard({
  item,
  dragHandle,
  onAddToFollowUp,
  isInFollowUps,
}: {
  item: WorkspaceCollaborationItem;
  dragHandle?: React.ReactNode;
  onAddToFollowUp?: (item: WorkspaceCollaborationItem) => void;
  isInFollowUps?: boolean;
}) {
  if (item.variant === 'post') {
    return (
      <CollaborationPostCard
        item={item}
        dragHandle={dragHandle}
        onAddToFollowUp={onAddToFollowUp}
        isInFollowUps={isInFollowUps}
      />
    );
  }
  return <CollaborationLegacyCard item={item} dragHandle={dragHandle} />;
}

export function CollaborationCardSkeleton() {
  return <div className="h-24 w-full min-w-0 animate-pulse rounded-xl border border-border/50 bg-muted/30" />;
}
