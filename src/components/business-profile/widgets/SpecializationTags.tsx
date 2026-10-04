'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';
import { SPECIALIZATION_LABELS, getSpecializations } from '@/lib/business/ecosystem';

export default function SpecializationTags({ business }: { business: Business }) {
  const tags = getSpecializations(business);
  if (!tags.length) {
    return <p className="text-sm text-muted-foreground">تخصصی ثبت نشده است.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
        >
          {SPECIALIZATION_LABELS[t]}
        </span>
      ))}
    </div>
  );
}
