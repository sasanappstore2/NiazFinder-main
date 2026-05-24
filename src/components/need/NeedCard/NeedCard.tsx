'use client';

import Link from 'next/link';
import type { NeedCardProps } from '@/contracts/need-card';
import { routeBuilder } from '@/config/routes';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function NeedCard({ need, href, onClick, variant = 'grid', className }: NeedCardProps) {
  const linkHref = href ?? routeBuilder.need(need.id);

  const content = (
    <Card
      className={cn(
        'group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        variant === 'list' && 'flex flex-row',
        className
      )}
    >
      <div className="p-4">
        <h3 className="text-body font-semibold line-clamp-2">{need.title}</h3>
        {need.categoryName && (
          <p className="mt-1 text-caption text-muted-foreground">{need.categoryName}</p>
        )}
        {need.description && (
          <p className="mt-2 text-body-sm text-muted-foreground line-clamp-2">{need.description}</p>
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
