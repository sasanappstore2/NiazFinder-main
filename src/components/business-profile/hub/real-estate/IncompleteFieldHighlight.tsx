'use client';

import { cn } from '@/lib/utils';
import type { RealEstateCompletionItemId } from '@/lib/business/real-estate-hub-completion';
import { useRealEstateHubOptional } from './RealEstateHubContext.types';

export function IncompleteFieldHighlight({
  itemId,
  children,
  className,
}: {
  itemId: RealEstateCompletionItemId;
  children: React.ReactNode;
  className?: string;
}) {
  const hub = useRealEstateHubOptional();
  const active = hub?.highlightedItemIds.includes(itemId) ?? false;

  return (
    <div
      data-incomplete-highlight={active ? itemId : undefined}
      className={cn(
        're-incomplete-highlight',
        active && 're-incomplete-highlight--active',
        className
      )}
    >
      <div className="re-incomplete-highlight__content">{children}</div>
    </div>
  );
}
