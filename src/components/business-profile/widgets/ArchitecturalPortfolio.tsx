'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';

export default function ArchitecturalPortfolio({ business }: { business: Business; requestId?: string }) {
  const items = (business.portfolio ?? []).filter((p) => p.type === 'image' || p.type === 'video');

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">نمونه‌کاری ثبت نشده است.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.slice(0, 9).map((item) => (
        <figure key={item.id} className="overflow-hidden rounded-xl border">
          <img
            src={item.mediaUrl || '/placeholder.jpg'}
            alt={item.title}
            className="aspect-video w-full object-cover"
          />
          <figcaption className="line-clamp-1 p-2 text-xs text-muted-foreground">
            {item.title}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
