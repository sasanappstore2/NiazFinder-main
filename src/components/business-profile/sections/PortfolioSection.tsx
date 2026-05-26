'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { BusinessPortfolioItem } from '@/contracts/business-profile';
import { cn } from '@/lib/utils';
import type { SectionProps } from './types';

function BeforeAfterTile({ item }: { item: BusinessPortfolioItem }) {
  const before = item.metadata?.beforeUrl ?? item.mediaUrl;
  const after = item.metadata?.afterUrl ?? item.mediaUrl;

  return (
    <figure className="relative col-span-2 overflow-hidden rounded-xl border bg-muted aspect-2/1">
      <div className="grid h-full grid-cols-2">
        <div className="relative border-l">
          <Image src={before} alt={`${item.title} — قبل`} fill className="object-cover" />
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">قبل</span>
        </div>
        <div className="relative">
          <Image src={after} alt={`${item.title} — بعد`} fill className="object-cover" />
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">بعد</span>
        </div>
      </div>
      <figcaption className="absolute inset-x-0 top-0 bg-linear-to-b from-black/60 to-transparent p-2 text-sm font-medium text-white">
        {item.title}
      </figcaption>
    </figure>
  );
}

export function PortfolioSection({ business }: SectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const items = business.portfolio;

  if (items.length === 0) return null;

  const current = lightboxIndex != null ? items[lightboxIndex] : null;

  return (
    <section id="section-portfolio" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">نمونه‌کارها</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((item, index) =>
          item.type === 'before_after' ? (
            <BeforeAfterTile key={item.id} item={item} />
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-muted aspect-square text-right',
                item.type === 'video' && 'ring-2 ring-primary/20'
              )}
            >
              <Image
                src={item.mediaUrl}
                alt={item.title}
                fill
                className="object-cover transition group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white">
                {item.title}
              </figcaption>
            </button>
          )
        )}
      </div>

      <Dialog open={lightboxIndex != null} onOpenChange={(o) => !o && setLightboxIndex(null)}>
        <DialogContent className="max-w-3xl border-none bg-black/95 p-2 sm:p-4">
          {current && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-0 z-10 text-white hover:bg-white/10"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="size-5" />
              </Button>
              <div className="relative mx-auto aspect-4/3 max-h-[70vh] w-full">
                <Image src={current.mediaUrl} alt={current.title} fill className="object-contain" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-2 text-white">
                <div>
                  <p className="font-medium">{current.title}</p>
                  {current.description && (
                    <p className="text-sm text-white/70">{current.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10"
                    disabled={lightboxIndex === 0}
                    onClick={() => setLightboxIndex((i) => (i != null ? Math.max(0, i - 1) : 0))}
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10"
                    disabled={lightboxIndex === items.length - 1}
                    onClick={() =>
                      setLightboxIndex((i) => (i != null ? Math.min(items.length - 1, i + 1) : 0))
                    }
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
