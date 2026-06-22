'use client';

import Link from 'next/link';
import { ArrowRight, Flag, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { RequestShare } from '@/components/shared/RequestShare';
import { routeBuilder } from '@/config/routes';
import type { ServiceRequest } from '@/lib/types';
import { NeedBriefMetaRow } from './briefing/NeedBriefMetaRow';
import { NeedKeyFactsGrid } from './briefing/NeedKeyFactsGrid';
import { NeedBriefTags } from './briefing/NeedBriefTags';
import { NeedActionFooter } from './briefing/NeedActionFooter';

interface NeedBriefingPanelProps {
  request: ServiceRequest;
  briefSummary?: string;
  isOwner: boolean;
  isBusinessUser: boolean;
  onBack: () => void;
  onReport: () => void;
}

export function NeedBriefingPanel({
  request,
  briefSummary,
  isOwner,
  isBusinessUser,
  onBack,
  onReport,
}: NeedBriefingPanelProps) {
  const authorName = `${request.user.firstName} ${request.user.lastName}`;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/60 bg-card/40"
      aria-label="جزئیات آگهی نیاز"
    >
      {/* نوار بالا */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-9 gap-2 px-2 text-muted-foreground"
        >
          <ArrowRight className="size-4" />
          بازگشت
        </Button>
        <div className="flex shrink-0 items-center gap-0.5">
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="me-1 h-9 gap-1.5 rounded-full border-primary/30 px-3 text-primary hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              <Link href={routeBuilder.needEdit(request.id)} aria-label="ویرایش آگهی">
                <Pencil className="size-4" />
                ویرایش
              </Link>
            </Button>
          )}
          <BookmarkButton itemId={request.id} itemType="request" size="sm" />
          <RequestShare requestTitle={request.title} requestId={request.id} />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={onReport}
            aria-label="گزارش تخلف"
          >
            <Flag className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
        {/* سرتیتر */}
        <header className="space-y-3">
          <h1 className="overflow-guard text-h2 leading-snug text-foreground">{request.title}</h1>
          <NeedBriefMetaRow request={request} />
          <NeedKeyFactsGrid request={request} />
        </header>

        {/* خلاصه */}
        {briefSummary && (
          <section className="rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3 sm:px-4">
            <h2 className="mb-1.5 text-overline font-semibold text-primary">خلاصه سریع</h2>
            <p className="text-body-sm leading-relaxed text-foreground/90">{briefSummary}</p>
          </section>
        )}

        {/* شرح */}
        <section className="space-y-2">
          <h2 className="text-overline font-semibold text-muted-foreground">شرح نیاز</h2>
          <p className="text-body-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {request.description}
          </p>
        </section>

        <NeedBriefTags request={request} />

        <NeedActionFooter
          request={request}
          authorName={authorName}
          isOwner={isOwner}
          isBusinessUser={isBusinessUser}
        />
      </div>
    </section>
  );
}
