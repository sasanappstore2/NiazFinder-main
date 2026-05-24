'use client';

import Link from 'next/link';
import type { BusinessCardProps } from '@/contracts/business-card';
import { routeBuilder } from '@/config/routes';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function BusinessCard({ business, href, onClick, variant = 'grid', className }: BusinessCardProps) {
  const linkHref = href ?? routeBuilder.business(business.id);

  const content = (
    <Card
      className={cn(
        'group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        variant === 'list' && 'flex flex-row',
        className
      )}
    >
      <div className="p-4">
        <h3 className="text-body font-semibold">{business.displayName}</h3>
        {business.city && (
          <p className="mt-1 text-caption text-muted-foreground">{business.city}</p>
        )}
        {business.rating != null && (
          <p className="mt-1 text-body-sm text-muted-foreground tabular-nums">امتیاز: {business.rating}</p>
        )}
      </div>
    </Card>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-right">
        {content}
      </button>
    );
  }

  return (
    <Link href={linkHref} className="block">
      {content}
    </Link>
  );
}
