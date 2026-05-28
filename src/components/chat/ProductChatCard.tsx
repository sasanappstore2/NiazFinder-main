'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Package } from 'lucide-react';
import type { ProductCardSnapshot } from '@/contracts/product-card-snapshot';
import { cn } from '@/lib/utils';

export function ProductChatCard({
  product,
  isOwn,
  className,
}: {
  product: ProductCardSnapshot;
  isOwn?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('max-w-[min(100%,300px)]', className)} dir="rtl">
      <Link
        href={product.productUrl}
        className={cn(
          'block overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md',
          isOwn
            ? 'border-primary-foreground/25 bg-primary-foreground text-foreground hover:bg-primary-foreground/95'
            : 'border-border bg-card hover:bg-accent/40'
        )}
      >
        <div className="flex min-w-0">
          <div
            className={cn(
              'w-1 shrink-0',
              isOwn ? 'bg-primary' : 'bg-emerald-500'
            )}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 gap-3 p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Package className="size-6 opacity-50" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">محصول</p>
              <p className="line-clamp-2 text-sm font-semibold leading-snug">
                {product.title}
              </p>
              {product.price && (
                <p
                  className={cn(
                    'text-sm font-bold',
                    isOwn ? 'text-primary' : 'text-emerald-700 dark:text-emerald-400'
                  )}
                >
                  {product.price}
                </p>
              )}
              {product.businessName && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {product.businessName}
                </p>
              )}
            </div>
          </div>
        </div>
        {product.introText?.trim() && (
          <p
            className={cn(
              'border-t px-3 py-2.5 text-sm leading-relaxed',
              isOwn ? 'border-primary-foreground/20' : 'border-border/60'
            )}
          >
            {product.introText.trim()}
          </p>
        )}
      </Link>
    </div>
  );
}
