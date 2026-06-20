'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductDetailBreadcrumb({
  profileUrl,
  businessName,
  categoryUrl,
  categoryTitle,
  productTitle,
  className,
}: {
  profileUrl: string;
  businessName: string;
  categoryUrl?: string;
  categoryTitle?: string;
  productTitle: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="مسیر صفحه"
      className={cn('mb-[21px] flex flex-wrap items-center gap-x-2 gap-y-1 text-sm', className)}
    >
      <Link
        href={profileUrl}
        className="text-muted-foreground transition hover:text-foreground"
      >
        {businessName}
      </Link>
      {categoryTitle && categoryUrl && (
        <>
          <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <Link
            href={categoryUrl}
            className="text-muted-foreground transition hover:text-foreground"
          >
            {categoryTitle}
          </Link>
        </>
      )}
      <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      <span className="line-clamp-1 overflow-guard font-medium text-foreground">{productTitle}</span>
    </nav>
  );
}
