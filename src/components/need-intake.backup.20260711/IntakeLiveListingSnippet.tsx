'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INTAKE_COPY } from './intake-copy';

export interface IntakeLiveListingSnippetProps {
  title: string;
  description?: string;
  streaming?: boolean;
  className?: string;
}

export function IntakeLiveListingSnippet({
  title,
  description,
  streaming = false,
  className,
}: IntakeLiveListingSnippetProps) {
  if (!title && !description && !streaming) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm space-y-1',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy={streaming}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        {INTAKE_COPY.liveListingTitle}
        {streaming ? (
          <Loader2 className="size-3 animate-spin text-primary" aria-hidden />
        ) : null}
      </div>
      {streaming && !title ? (
        <div className="space-y-2 py-1">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
        </div>
      ) : (
        <>
          <p className="font-medium leading-snug">{title || '?'}</p>
          {description ? (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{description}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
