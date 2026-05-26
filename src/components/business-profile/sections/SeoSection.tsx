'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SectionProps } from './types';

export function SeoSection({ business }: SectionProps) {
  const [open, setOpen] = useState(false);
  if (!business.seo.description) return null;

  return (
    <section id="section-seo" className="scroll-mt-24 rounded-xl border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        اطلاعات بیشتر
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="max-w-none px-4 pb-4 text-sm text-muted-foreground">
          <p>{business.seo.description}</p>
          {business.seo.keywords.length > 0 && (
            <p className="mt-2">کلمات کلیدی: {business.seo.keywords.join('، ')}</p>
          )}
        </div>
      )}
    </section>
  );
}
