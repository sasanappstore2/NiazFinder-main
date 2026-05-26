'use client';

import { Sparkles, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TypingAnalysisResult, TypingAnalysisStatus } from '@/contracts/typing-analysis';
import { getCategoryBySlug } from '@/config/categories';
import { cn } from '@/lib/utils';

interface TypingAnalysisStripProps {
  result: TypingAnalysisResult | null;
  status: TypingAnalysisStatus;
  preloading?: boolean;
  className?: string;
}

function categoryLabel(slug: string, sub?: string): string {
  const leaf = sub ? getCategoryBySlug(sub) : getCategoryBySlug(slug);
  const root = getCategoryBySlug(slug);
  if (leaf && root && leaf.slug !== root.slug) {
    return `${root.title} · ${leaf.title}`;
  }
  return leaf?.title ?? root?.title ?? slug;
}

export function TypingAnalysisStrip({
  result,
  status,
  preloading,
  className,
}: TypingAnalysisStripProps) {
  if (status === 'idle' && !result) return null;

  if (status === 'analyzing' && !result) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)} aria-hidden>
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
    );
  }

  if (!result) return null;

  const pct = Math.round(result.confidence * 100);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2',
        className
      )}
      role="status"
    >
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      <Badge variant="secondary" className="font-normal">
        {categoryLabel(result.categorySlug, result.subcategorySlug)}
      </Badge>
      {pct > 0 && (
        <span className="text-xs text-muted-foreground">اطمینان {pct}٪</span>
      )}
      {result.tags.slice(0, 4).map((tag) => (
        <Badge key={tag} variant="outline" className="text-caption font-normal">
          {tag}
        </Badge>
      ))}
      {result.spam.isSpam && (
        <span className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="size-3" />
          {result.spam.reason ?? 'متن مشکوک'}
        </span>
      )}
      {result.duplicate.likely && (
        <span className="text-xs text-amber-600">نیاز مشابه یافت شد</span>
      )}
      {preloading && (
        <span className="text-xs text-muted-foreground">در حال آماده‌سازی نتایج…</span>
      )}
      {result.source === 'cache' && (
        <span className="text-caption text-muted-foreground">کش</span>
      )}
    </div>
  );
}
