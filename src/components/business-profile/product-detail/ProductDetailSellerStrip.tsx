'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Store } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import { cn } from '@/lib/utils';

export function ProductDetailSellerStrip({
  business,
  profileUrl,
  className,
}: {
  business: Business;
  profileUrl: string;
  className?: string;
}) {
  const logo = business.identity.logo;

  return (
    <Link
      href={profileUrl}
      className={cn(
        'flex items-center gap-[13px] rounded-xl border border-border/50 bg-muted/30 p-[13px] transition hover:border-emerald-500/30 hover:bg-muted/50',
        className
      )}
    >
      <div className="relative size-[55px] shrink-0 overflow-hidden rounded-xl bg-muted">
        {logo ? (
          <Image src={logo} alt="" fill className="object-cover" sizes="55px" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Store className="size-6 opacity-60" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{business.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          {business.trust.verified && (
            <BadgeCheck className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
          )}
          <span>
            {business.identity.location.city}
            {business.trust.reviewCount > 0 &&
              ` · ${business.trust.rating.toLocaleString('fa-IR')} از ۵`}
          </span>
        </p>
        <span className="mt-1 inline-block text-xs font-medium text-emerald-700 dark:text-emerald-400">
          مشاهده فروشگاه
        </span>
      </div>
    </Link>
  );
}
