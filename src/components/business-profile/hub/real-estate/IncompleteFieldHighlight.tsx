'use client';

import { cn } from '@/lib/utils';

/** Passthrough wrapper — onboarding highlight is optional outside RealEstateHub. */
export function IncompleteFieldHighlight({
  children,
  className,
}: {
  itemId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}
