'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { BusinessPortfolioItem } from '@/contracts/business-profile';
import { cn } from '@/lib/utils';
import type { SectionProps } from './types';

function GalleryTile({
  item,
  onOpen,
}: {
  item: BusinessPortfolioItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
    >
      {item.type === 'video' ? (
        <>
          <Image src={item.mediaUrl} alt={item.title} fill className="object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="size-10 text-white opacity-90" fill="white" />
          </span>
        </>
      ) : (
        <Image
          src={item.mediaUrl}
          alt={item.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      )}
      {item.title && (
        <span className="hover-reveal absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white">
          {item.title}
        </span>
      )}
    </button>
  );
}

/** Instagram-style masonry gallery for coaches and creatives. */
export function GallerySection({ business }: SectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const items = business.portfolio;

  if (items.length === 0) return null;

  const current = lightboxIndex != null ? items[lightboxIndex] : null;

  return (
    <section id="section-gallery" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">گالری</h2>
      <div className="columns-2 gap-2 sm:columns-3 sm:gap-3">
        {items.map((item, index) => (
          <div key={item.id} className="mb-2 break-inside-avoid sm:mb-3">
            <GalleryTile item={item} onOpen={() => setLightboxIndex(index)} />
          </div>
        ))}
      </div>

      <Dialog open={lightboxIndex != null} onOpenChange={(o) => !o && setLightboxIndex(null)}>
        <DialogContent className="max-w-3xl border-none bg-black/95 p-2 sm:p-4" showCloseButton={false}>
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
              <div className="relative mx-auto aspect-square max-h-[75vh] w-full sm:aspect-4/5">
                {current.type === 'video' ? (
                  <video
                    src={current.mediaUrl}
                    controls
                    className="size-full object-contain"
                    poster={current.metadata?.beforeUrl}
                  />
                ) : (
                  <Image src={current.mediaUrl} alt={current.title} fill className="object-contain" />
                )}
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
