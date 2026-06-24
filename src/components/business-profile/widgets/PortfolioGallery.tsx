'use client';

import React from 'react';
import Image from 'next/image';
import type { Business } from '@/contracts/business-profile';

export default function PortfolioGallery({ business }: { business: Business }) {
  const items = business.portfolio ?? [];
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">نمونه‌کاری ثبت نشده است.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.slice(0, 8).map((item, i) => {
        const src = item.mediaUrl || '/placeholder.jpg';
        return (
          <div key={i} className="relative aspect-video overflow-hidden rounded-xl border">
            <Image
              src={src}
              alt={item.title || 'نمونه‌کار'}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              unoptimized={src.startsWith('http')}
            />
          </div>
        );
      })}
    </div>
  );
}
