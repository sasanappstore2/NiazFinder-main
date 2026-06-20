'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { NiazMapMarker as Marker } from '@/components/map/maplibre/map-marker';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { NiazMapRecenter } from '@/components/map/mapbox/NiazMapRecenter';
import { MapPinMarker } from '@/components/map/mapbox/MapPinMarker';
import {
  buildChatLocationMapHref,
  formatLocationCoordsDisplay,
} from '@/lib/chat/location-share';
import { cn } from '@/lib/utils';

interface ChatLocationShareCardProps {
  lat: number;
  lng: number;
  label?: string;
  isOwn: boolean;
}

export function ChatLocationShareCard({ lat, lng, label, isOwn }: ChatLocationShareCardProps) {
  const mapHref = buildChatLocationMapHref(lat, lng);
  const coordsLabel = formatLocationCoordsDisplay(lat, lng);

  return (
    <div
      className={cn(
        'w-full max-w-[min(100%,280px)] overflow-hidden rounded-xl border shadow-sm',
        isOwn
          ? 'border-white/65 bg-white/96 text-neutral-950 shadow-neutral-950/15 dark:border-zinc-100/15 dark:bg-zinc-950/94 dark:text-zinc-50 dark:shadow-black/30'
          : 'border-border/70 bg-muted/90 text-foreground'
      )}
      dir="rtl"
    >
      <div className="business-browse-map overflow-hidden border-b border-border/40">
        <NiazMapCore
          center={{ lat, lng, zoom: 14 }}
          detail="picker"
          interactive={false}
          className="h-[140px] w-full pointer-events-none"
        >
          <NiazMapRecenter center={{ lat, lng }} zoom={14} />
          <Marker longitude={lng} latitude={lat} anchor="bottom">
            <MapPinMarker selected={false} />
          </Marker>
        </NiazMapCore>
      </div>

      <div className="space-y-1 px-3 py-2.5">
        <p
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium',
            isOwn ? 'text-neutral-600 dark:text-zinc-400' : 'text-muted-foreground'
          )}
        >
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {label?.trim() || 'موقعیت روی نقشه'}
        </p>
        <p
          dir="ltr"
          className={cn(
            'text-start text-xs tabular-nums',
            isOwn ? 'text-neutral-700 dark:text-zinc-300' : 'text-muted-foreground'
          )}
        >
          {coordsLabel}
        </p>
      </div>

      <div className={cn('h-px', isOwn ? 'bg-neutral-200 dark:bg-zinc-700' : 'bg-border/80')} />
      <Link
        href={mapHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex w-full items-center justify-center py-2.5 text-sm font-semibold transition-colors',
          isOwn
            ? 'text-emerald-700 hover:bg-emerald-700/10 dark:text-emerald-400 dark:hover:bg-emerald-400/15'
            : 'hover:bg-muted'
        )}
      >
        مشاهده روی نقشه
      </Link>
    </div>
  );
}
