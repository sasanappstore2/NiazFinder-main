'use client';

import { Badge } from '@/components/ui/badge';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NeedBriefTagsProps {
  tags: ServiceRequest['tags'];
  className?: string;
}

export function NeedBriefTags({ tags, className }: NeedBriefTagsProps) {
  if (!tags?.length) return null;

  return (
    <section className={cn('space-y-2', className)} aria-label="برچسب‌ها">
      <h2 className="text-overline font-semibold text-muted-foreground">برچسب‌ها</h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-caption font-normal">
            {tag}
          </Badge>
        ))}
      </div>
    </section>
  );
}
