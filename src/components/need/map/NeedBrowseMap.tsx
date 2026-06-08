'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, Flame, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import { formatBudgetRange } from '@/lib/constants';
import { resolveMapViewportScope } from '@/lib/business/map-viewport-scope';
import { filterValidMapPins, isValidLatLng } from '@/lib/business/map-coords';
import { routeBuilder } from '@/config/routes';
import { IranDivarBrowseMap } from '@/components/map/iran/IranDivarBrowseMap';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { NiazMapControls } from '@/components/map/mapbox/NiazMapControls';
import { NiazMapAdminBoundaries } from '@/components/map/mapbox/NiazMapAdminBoundaries';
import { NiazMapNeighborhoodBoundaries } from '@/components/map/mapbox/NiazMapNeighborhoodBoundaries';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import { useNeighborhoodMapBounds } from '@/hooks/use-neighborhood-map-bounds';
import { NiazMapFlyToPin } from '@/components/map/mapbox/NiazMapFlyToPin';
import { NiazMapClusterLayer } from '@/components/map/mapbox/NiazMapClusterLayer';
import { useMapBboxReporter } from '@/components/map/mapbox/use-map-bbox-reporter';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { resolveMapEngine } from '@/lib/map/mapbox/config';
import { NiazMapClusterLayerMaplibre } from '@/components/map/maplibre/NiazMapClusterLayerMaplibre';
import { cn } from '@/lib/utils';

function MapPinPopup({ pin, detailHref }: { pin: NeedMapPin; detailHref: string }) {
  const budget = formatBudgetRange(pin.budgetMin ?? undefined, pin.budgetMax ?? undefined);
  return (
    <div className="p-3 text-right" dir="rtl">
      <p className="line-clamp-2 text-sm font-semibold leading-snug">{pin.title}</p>
      {pin.categoryTitle ? (
        <p className="mt-1 text-xs text-muted-foreground">{pin.categoryTitle}</p>
      ) : null}
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {pin.approximate && pin.neighborhoodLabel
          ? `\u062d\u062f\u0648\u062f \u0645\u062d\u0644\u0647\u0654 ${pin.neighborhoodLabel}`
          : [pin.city, pin.province].filter(Boolean).join('\u060c ')}
      </p>
      {pin.approximate ? (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
          {'\u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0642\u06cc\u0642 \u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u2014 \u0646\u0645\u0627\u06cc\u0634 \u062d\u062f\u0648\u062f\u06cc'}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <DollarSign className="size-3.5" aria-hidden />
          {budget}
        </span>
        {pin.priority === 'URGENT' || pin.priority === 'HIGH' ? (
          <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
            <Flame className="size-3.5" aria-hidden />
            فوری
          </span>
        ) : null}
      </div>
      <Link
        href={detailHref}
        className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        مشاهده نیاز
      </Link>
    </div>
  );
}

function MapControlsOverlay({ mobileMode }: { mobileMode?: boolean }) {
  const mapRef = useNiazMapRef();
  return <NiazMapControls mapRef={mapRef} mobileMode={mobileMode} />;
}

export function NeedBrowseMap({
  pins,
  loading,
  citySlugs,
  provinceSlugs = [],
  neighborhoodSlugs = [],
  selectedPinId,
  selectedPin,
  onSelectPin,
  onBboxChange,
  fromPathname,
  onCloseMap,
  immersive = false,
  mobileMode = false,
  hasCityScope,
  cityScopeLabel,
  onClearCityScope,
  className,
}: {
  pins: NeedMapPin[];
  loading?: boolean;
  citySlugs: string[];
  provinceSlugs?: string[];
  neighborhoodSlugs?: string[];
  selectedPinId: string | null;
  selectedPin: NeedMapPin | null;
  onSelectPin: (pin: NeedMapPin | null) => void;
  onBboxChange: (bbox: { west: number; south: number; east: number; north: number }) => void;
  fromPathname: string;
  onCloseMap?: () => void;
  immersive?: boolean;
  mobileMode?: boolean;
  hasCityScope?: boolean;
  cityScopeLabel?: string;
  onClearCityScope?: () => void;
  className?: string;
}) {
  const mapScope = useMemo(
    () => resolveMapViewportScope(citySlugs, provinceSlugs),
    [citySlugs, provinceSlugs]
  );
  const singleCitySlug = citySlugs.length === 1 ? citySlugs[0]! : null;
  const neighborhoodBounds = useNeighborhoodMapBounds(singleCitySlug, neighborhoodSlugs);
  const validPins = useMemo(() => filterValidMapPins(pins), [pins]);
  const safeSelectedPin =
    selectedPin && isValidLatLng(selectedPin.lat, selectedPin.lng) ? selectedPin : null;
  const mapCenter = isValidLatLng(mapScope.center.lat, mapScope.center.lng)
    ? mapScope.center
    : { lat: 32.4279, lng: 53.688, zoom: 5.5 };
  const mapKey =
    citySlugs.length > 0
      ? citySlugs.join(',')
      : provinceSlugs.length > 0
        ? `p:${provinceSlugs.join(',')}`
        : 'iran';
  const reportBbox = useMapBboxReporter(onBboxChange);
  const mapLibre = resolveMapEngine() === 'maplibre';
  const ClusterLayer = mapLibre ? NiazMapClusterLayerMaplibre : NiazMapClusterLayer;

  return (
    <div
      className={cn(
        'business-browse-map relative overflow-hidden',
        mapLibre && 'business-browse-map--iran-divar',
        mobileMode && 'business-browse-map--mobile',
        immersive ? 'h-full rounded-none border-0' : 'rounded-2xl border border-border/50',
        className
      )}
    >
      {mapLibre ? (
        <IranDivarBrowseMap
          citySlugs={citySlugs}
          provinceSlugs={provinceSlugs}
          neighborhoodSlugs={neighborhoodSlugs}
          pins={validPins}
          selectedPinId={selectedPinId}
          selectedPin={safeSelectedPin}
          onSelectPin={onSelectPin}
          onBboxChange={onBboxChange}
          showPopups={!mobileMode}
          mobileMode={mobileMode}
          mapKey={mapKey}
          className="h-full"
          getPinProps={(pin) => ({
            selected: selectedPinId === pin.id,
            color: pin.pinColor,
            approximate: pin.approximate,
          })}
          renderPopup={(pin) => (
            <MapPinPopup pin={pin} detailHref={routeBuilder.listing(pin.id, pin.title)} />
          )}
        />
      ) : (
        <NiazMapCore
          center={mapCenter}
          detail="browse"
          mapKey={mapKey}
          className="z-0 min-h-[320px]"
          style={{ minHeight: mobileMode ? 280 : 320 }}
          onMoveEnd={reportBbox}
          overlay={<MapControlsOverlay mobileMode={mobileMode} />}
        >
          <NiazMapAdminBoundaries
            provinceIds={mapScope.provinceIds}
            citySlugs={mapScope.citySlugs}
            scopeKind={mapScope.kind}
          />
          <NiazMapNeighborhoodBoundaries
            citySlug={singleCitySlug}
            neighborhoodSlugs={neighborhoodSlugs}
          />
          <NiazMapViewportScope
            viewportBounds={mapScope.bounds}
            scopeKind={mapScope.kind}
            citySlugs={mapScope.citySlugs}
            neighborhoodBounds={neighborhoodBounds}
          />
          <NiazMapFlyToPin pin={safeSelectedPin} />
          <ClusterLayer
            points={validPins}
            selectedPinId={selectedPinId}
            onSelectPin={onSelectPin}
            showPopups={!mobileMode}
            getPinProps={(pin) => ({
              selected: selectedPinId === pin.id,
              color: pin.pinColor,
              approximate: pin.approximate,
            })}
            renderPopup={(pin) => (
              <MapPinPopup pin={pin} detailHref={routeBuilder.listing(pin.id, pin.title)} />
            )}
          />
        </NiazMapCore>
      )}

      {hasCityScope && onClearCityScope ? (
        <div
          className={cn(
            'absolute z-[500]',
            mobileMode ? 'top-12 inset-x-3 flex justify-center' : 'top-3 right-3'
          )}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClearCityScope}
            className="bm-map-chrome h-8 max-w-full truncate rounded-full px-3 text-[13px]"
          >
            {'\u062d\u0630\u0641 \u0645\u0631\u0632\u0628\u0646\u062f\u06cc'}
            {cityScopeLabel ? ` (${cityScopeLabel})` : ''}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
          <span className="bm-map-chrome inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
            {'\u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0646\u0642\u0634\u0647\u2026'}
          </span>
        </div>
      ) : null}

      {!immersive ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-lg bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
          {validPins.length.toLocaleString('fa-IR')} {'\u0646\u06cc\u0627\u0632 \u062f\u0631 \u0627\u06cc\u0646 \u0645\u062d\u062f\u0648\u062f\u0647'}
        </div>
      ) : null}

      {onCloseMap && !mobileMode ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] flex justify-center">
          <Button
            type="button"
            onClick={onCloseMap}
            size="sm"
            className="bm-close-map bm-close-map--desktop pointer-events-auto bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <X className="size-3.5" aria-hidden />
            {'\u0628\u0633\u062a\u0646 \u0646\u0642\u0634\u0647'}
          </Button>
        </div>
      ) : null}

      {onCloseMap && mobileMode ? (
        <Button
          type="button"
          onClick={onCloseMap}
          size="icon"
          variant="ghost"
          className="bm-map-chrome bm-close-map bm-close-map--mobile pointer-events-auto shadow-none hover:bg-transparent"
          aria-label={'\u0628\u0633\u062a\u0646 \u0646\u0642\u0634\u0647'}
          title={'\u0628\u0633\u062a\u0646 \u0646\u0642\u0634\u0647'}
        >
          <X className="size-4" aria-hidden />
        </Button>
      ) : null}

      {mobileMode && !loading && !immersive ? (
        <div className="bm-map-chrome pointer-events-none absolute top-3 right-3 z-[500] rounded-full px-3 py-1.5 text-[13px] font-medium">
          {validPins.length.toLocaleString('fa-IR')}{' '}
          <span className="text-muted-foreground">{'\u0646\u06cc\u0627\u0632'}</span>
        </div>
      ) : null}
    </div>
  );
}
