'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { buildNeedBriefTags } from '@/lib/need/format-need-brief-tags';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NeedBriefTagsProps {
  request: Pick<
    ServiceRequest,
    'tags' | 'categoryName' | 'categorySlug' | 'dealType' | 'dynamicAnswers'
  >;
  className?: string;
}

export function NeedBriefTags({ request, className }: NeedBriefTagsProps) {
  const labels = useMemo(
    () =>
      buildNeedBriefTags({
        tags: request.tags,
        categoryName: request.categoryName,
        categorySlug: request.categorySlug,
        dealType: request.dealType,
        dynamicAnswers: request.dynamicAnswers,
      }),
    [
      request.tags,
      request.categoryName,
      request.categorySlug,
      request.dealType,
      request.dynamicAnswers,
    ]
  );

  if (labels.length === 0) return null;

  return (
    <section className={cn('space-y-2', className)} aria-label="برچسب‌ها">
      <h2 className="text-overline font-semibold text-muted-foreground">برچسب‌ها</h2>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <Badge key={label} variant="secondary" className="text-caption font-normal">
            {label}
          </Badge>
        ))}
      </div>
    </section>
  );
}
