'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';

export default function PortfolioGallery({ business }: { business: Business }) {
  const items = business.portfolio ?? [];
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">نمونه‌کاری ثبت نشده است.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.slice(0, 8).map((item, i) => (
        <div key={i} className="aspect-video overflow-hidden rounded-xl border">
          <img src={item.mediaUrl || '/placeholder.jpg'} alt={item.title} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}
