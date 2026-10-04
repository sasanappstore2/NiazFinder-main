'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';

export default function BeforeAfterGallery({ business }: { business: Business; requestId?: string }) {
  const items = (business.portfolio ?? []).filter(
    (p) => p.type === 'before_after' && (p.metadata?.beforeUrl || p.metadata?.afterUrl)
  );

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">نمونه قبل و بعد ثبت نشده است.</p>;
  }

  return (
    <div className="space-y-4">
      {items.slice(0, 4).map((item) => (
        <figure key={item.id} className="rounded-xl border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">قبل</span>
              <img
                src={item.metadata?.beforeUrl || item.mediaUrl || '/placeholder.jpg'}
                alt={`${item.title} - قبل`}
                className="aspect-square w-full rounded-lg object-cover"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">بعد</span>
              <img
                src={item.metadata?.afterUrl || item.mediaUrl || '/placeholder.jpg'}
                alt={`${item.title} - بعد`}
                className="aspect-square w-full rounded-lg object-cover"
              />
            </div>
          </div>
          {item.title && <figcaption className="mt-2 text-sm font-medium">{item.title}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
