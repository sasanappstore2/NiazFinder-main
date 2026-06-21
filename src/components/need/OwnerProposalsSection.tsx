'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Timer,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StarRating } from '@/components/shared/StarRating';
import { ContactActions } from '@/components/contact/ContactActions';
import { useAppStore } from '@/lib/store';
import { formatPrice, getTimeAgo } from '@/lib/constants';
import { routeBuilder } from '@/config/routes';
import {
  startConversation,
  syncAndNavigateToConversation,
} from '@/lib/contact/start-conversation';
import type { Proposal } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NEED_OWNER_PROPOSALS_ANCHOR } from '@/components/need/briefing/need-brief-utils';

function getAvatarBg(name: string) {
  const colors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function ProposalCard({
  proposal,
  requestId,
  onAccept,
  accepting,
}: {
  proposal: Proposal;
  requestId: string;
  onAccept: () => void;
  accepting: boolean;
}) {
  const fullName = `${proposal.user.firstName} ${proposal.user.lastName}`;
  const initials = `${proposal.user.firstName.charAt(0)}${proposal.user.lastName.charAt(0)}`;
  const isAccepted = proposal.status === 'ACCEPTED';

  return (
    <Card className={cn('border-border/50', isAccepted && 'border-primary/40 bg-primary/5')}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'size-10 rounded-full flex items-center justify-center text-sm font-bold',
                getAvatarBg(fullName)
              )}
            >
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-body font-semibold">{fullName}</span>
                {proposal.user.isVerified && (
                  <BadgeCheck className="size-4 text-primary" />
                )}
              </div>
              {proposal.user.city && (
                <span className="text-caption text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3" />
                  {proposal.user.city}
                </span>
              )}
            </div>
          </div>
          <span className="text-caption text-muted-foreground">{getTimeAgo(proposal.createdAt)}</span>
        </div>
        <p className="text-body-sm text-muted-foreground line-clamp-3 mb-3">{proposal.message}</p>
        <div className="flex flex-wrap items-center gap-3 text-body-sm mb-3">
          <span className="font-semibold text-primary">{formatPrice(proposal.price)}</span>
          {proposal.deliveryTime && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Timer className="size-3.5" />
              {proposal.deliveryTime} روز
            </span>
          )}
          <StarRating
            rating={(proposal as Proposal & { rating?: number }).rating ?? proposal.user.rating ?? 0}
            size="xs"
            showValue
          />
        </div>

        <ContactActions
          otherUserId={proposal.user.id}
          requestId={requestId}
          displayName={fullName}
          hasPhone
          chatEnabled
          profileHref={`${routeBuilder.pro(proposal.user.id)}?need=${encodeURIComponent(requestId)}`}
          variant="compact"
          className="mb-3"
        />

        {isAccepted ? (
          <Badge className="gap-1">
            <CheckCircle2 className="size-3.5" />
            پیشنهاد پذیرفته‌شده
          </Badge>
        ) : (
          <Button size="sm" onClick={onAccept} disabled={accepting} className="gap-1.5">
            <CheckCircle2 className="size-4" />
            انتخاب پیشنهاد
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface OwnerProposalsSectionProps {
  requestId: string;
  defaultOpen?: boolean;
}

export function OwnerProposalsSection({ requestId, defaultOpen = false }: OwnerProposalsSectionProps) {
  const router = useRouter();
  const fetchProposals = useAppStore((s) => s.fetchProposals);
  const acceptProposal = useAppStore((s) => s.acceptProposal);
  const authToken = useAppStore((s) => s.authToken);
  const [open, setOpen] = useState(defaultOpen);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchProposals(requestId).then((list) => {
      if (!cancelled) {
        setProposals(list as Proposal[]);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, requestId, fetchProposals]);

  const sorted = useMemo(() => {
    return [...proposals].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [proposals]);

  const accepted = sorted.find((p) => p.status === 'ACCEPTED');

  const handleAccept = async (proposal: Proposal) => {
    setAcceptingId(proposal.id);
    const result = await acceptProposal(proposal.id);
    setAcceptingId(null);
    if (!result.success) {
      toast.error('خطا در پذیرش پیشنهاد');
      return;
    }
    toast.success('پیشنهاد پذیرفته شد');
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposal.id
          ? { ...p, status: 'ACCEPTED' as const }
          : { ...p, status: 'REJECTED' as const }
      )
    );
    if (result.proposerUserId && authToken) {
      try {
        const chatResult = await startConversation(
          { otherUserId: result.proposerUserId, requestId },
          authToken
        );
        syncAndNavigateToConversation(router, chatResult);
        toast.success('گفتگو با کسب‌وکار باز شد');
      } catch {
        toast.info('پیشنهاد پذیرفته شد — از دکمه چت استفاده کنید');
      }
    }
  };

  return (
    <section
      id={NEED_OWNER_PROPOSALS_ANCHOR}
      className="need-detail-scroll-section mt-8 border-t border-border/50 pt-6 pb-8 scroll-mt-[calc(var(--site-header-offset,6.5rem)+1rem)]"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-right"
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className="text-h3 font-semibold">پیشنهادهای دریافتی</h2>
        {open ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
      </button>

      {accepted && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm font-medium flex items-center gap-2">
            <MessageCircle className="size-4 text-primary" />
            با {accepted.user.firstName} همکاری را شروع کنید
          </p>
          <ContactActions
            otherUserId={accepted.user.id}
            requestId={requestId}
            displayName={`${accepted.user.firstName} ${accepted.user.lastName}`}
            hasPhone
            chatEnabled
            showProfile={false}
            variant="compact"
          />
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          {loading && (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          )}
          {!loading && sorted.length === 0 && (
            <p className="text-body-sm text-muted-foreground text-center py-6">هنوز پیشنهادی دریافت نشده.</p>
          )}
          {sorted.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              requestId={requestId}
              onAccept={() => void handleAccept(p)}
              accepting={acceptingId === p.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
