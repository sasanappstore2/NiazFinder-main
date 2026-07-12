'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';

export default function DesignStyles({ business }: { business: Business; requestId?: string }) {
  const styles = (business.identity.tags ?? []).filter((t) => t.trim().length > 0);

  if (!styles.length) {
    return <p className="text-sm text-muted-foreground">سبک طراحی ثبت نشده است.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {styles.map((style) => (
        <span key={style} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {style}
        </span>
      ))}
    </div>
  );
}
