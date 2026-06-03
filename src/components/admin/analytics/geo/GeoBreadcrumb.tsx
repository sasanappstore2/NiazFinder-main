'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeoMapLevel } from '@/lib/geo/types';
import { labelForProvince, labelForCity } from '@/lib/geo/geo-index';

export function GeoBreadcrumb({
  level,
  provinceId,
  cityId,
  onNavigate,
}: {
  level: GeoMapLevel;
  provinceId: string | null;
  cityId: string | null;
  onNavigate: (target: GeoMapLevel, province?: string | null, city?: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Button
        variant={level === 'country' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onNavigate('country', null, null)}
      >
        ایران
      </Button>
      {provinceId && (
        <>
          <span className="text-(--color-tertiaryText)">›</span>
          <Button
            variant={level === 'province' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('province', provinceId, null)}
          >
            {labelForProvince(provinceId)}
          </Button>
        </>
      )}
      {cityId && (
        <>
          <span className="text-(--color-tertiaryText)">›</span>
          <Button variant="secondary" size="sm">
            {labelForCity(cityId)}
          </Button>
        </>
      )}
      {level !== 'country' && (
        <Button variant="outline" size="sm" className="mr-auto gap-1" onClick={() => onNavigate(level === 'city' ? 'province' : 'country', provinceId, null)}>
          <ChevronLeft className="size-4" />
          بازگشت
        </Button>
      )}
    </div>
  );
}
