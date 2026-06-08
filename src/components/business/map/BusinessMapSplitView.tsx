'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { BusinessMapPin } from '@/lib/business/map-pins-types';
import type { SpecialistProfile } from '@/lib/types';
import { useBusinessMapPins, type BusinessMapPinsQuery } from '@/hooks/use-business-map-pins';
import { BusinessMapListCard } from '@/components/business/map/BusinessMapListCard';
import { BusinessMapMobileView } from '@/components/business/map/BusinessMapMobileView';
import { filterValidMapPins } from '@/lib/business/map-coords';

const MAP_LOADING = '\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0646\u0642\u0634\u0647\u2026';
const LIST_IN_AREA = '\u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631 \u062f\u0631 \u0627\u06cc\u0646 \u0645\u062d\u062f\u0648\u062f\u0647';
const EMPTY_LIST =
  '\u062f\u0631 \u0627\u06cc\u0646 \u0645\u062d\u062f\u0648\u062f\u0647 \u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631\u06cc \u0628\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a';
const LOADING_LIST = '\u062f\u0631 \u062d\u0627\u0644 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0641\u0647\u0631\u0633\u062a\u2026';

const LG_MEDIA = '(min-width: 1024px)';

function subscribeLg(onStoreChange: () => void) {
  const mql = window.matchMedia(LG_MEDIA);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

function getLgSnapshot() {
  return window.matchMedia(LG_MEDIA).matches;
}

function useIsLgViewport() {
  return useSyncExternalStore(subscribeLg, getLgSnapshot, () => false);
}

const BusinessBrowseMap = dynamic(
  () =>
    import('@/components/business/map/BusinessBrowseMap').then((m) => m.BusinessBrowseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-muted/30">
        <span className="text-sm text-muted-foreground">{MAP_LOADING}</span>
      </div>
    ),
  }
);

type MapListItem = {
  pin: BusinessMapPin;
  specialist?: SpecialistProfile;
};

function buildListItems(pins: BusinessMapPin[], specialists: SpecialistProfile[]): MapListItem[] {
  const slugToSpecialist = new Map(
    specialists.filter((s) => s.profileSlug).map((s) => [s.profileSlug!, s])
  );
  return pins.map((pin) => ({
    pin,
    specialist: slugToSpecialist.get(pin.slug),
  }));
}

function MapListColumn({
  items,
  loading,
  selectedPinId,
  fromPathname,
  onSelectPin,
  listRef,
}: {
  items: MapListItem[];
  loading: boolean;
  selectedPinId: string | null;
  fromPathname: string;
  onSelectPin: (pin: BusinessMapPin) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-card" dir="rtl">
      <div className="border-b border-border/40 bg-muted/20 px-4 py-3.5">
        <p className="text-sm font-semibold tracking-tight">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {LOADING_LIST}
            </span>
          ) : (
            <>
              <span className="text-primary">{items.length.toLocaleString('fa-IR')}</span>{' '}
              {LIST_IN_AREA}
            </>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {'\u0628\u0627 \u062c\u0627\u0628\u062c\u0627\u06cc \u06cc\u0627 \u0632\u0648\u0645 \u0646\u0642\u0634\u0647\u060c \u0641\u0647\u0631\u0633\u062a \u0628\u0647\u200c\u0631\u0648\u0632 \u0645\u06cc\u200c\u0634\u0648\u062f'}
        </p>
      </div>

      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-3 scroll-smooth">
        {!loading && items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{EMPTY_LIST}</p>
        ) : (
          items.map(({ pin, specialist }) => (
            <div key={pin.id} data-pin-id={pin.id}>
              <BusinessMapListCard
                pin={pin}
                specialist={specialist}
                selected={selectedPinId === pin.id}
                fromPathname={fromPathname}
                onSelect={() => onSelectPin(pin)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function BusinessMapSplitView({
  specialists,
  citySlugs,
  provinceSlugs = [],
  neighborhoodSlugs = [],
  mapQuery,
  fromPathname,
  onCloseMap,
  hasCityScope,
  cityScopeLabel,
  onClearCityScope,
}: {
  specialists: SpecialistProfile[];
  citySlugs: string[];
  provinceSlugs?: string[];
  neighborhoodSlugs?: string[];
  mapQuery: BusinessMapPinsQuery;
  fromPathname: string;
  onCloseMap?: () => void;
  hasCityScope?: boolean;
  cityScopeLabel?: string;
  onClearCityScope?: () => void;
}) {
  const isLg = useIsLgViewport();
  const { pins, loading, fetchPins } = useBusinessMapPins(mapQuery);
  const validPins = useMemo(() => filterValidMapPins(pins), [pins]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listItems = useMemo(() => buildListItems(validPins, specialists), [validPins, specialists]);

  const selectedPin = useMemo(
    () => validPins.find((p) => p.id === selectedPinId) ?? null,
    [validPins, selectedPinId]
  );

  const handleBboxChange = useCallback(
    (bbox: { west: number; south: number; east: number; north: number }) => {
      void fetchPins(bbox);
    },
    [fetchPins]
  );

  const selectPin = useCallback((pin: BusinessMapPin) => {
    setSelectedPinId(pin.id);
  }, []);

  useEffect(() => {
    if (!selectedPinId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-pin-id="${selectedPinId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedPinId]);

  const mapProps = {
    pins: validPins,
    loading,
    citySlugs,
    provinceSlugs,
    neighborhoodSlugs,
    selectedPinId,
    selectedPin,
    onSelectPin: (pin: BusinessMapPin | null) => setSelectedPinId(pin?.id ?? null),
    onBboxChange: handleBboxChange,
    fromPathname,
    onCloseMap,
    immersive: true,
    hasCityScope,
    cityScopeLabel,
    onClearCityScope,
  };

  return (
    <div className="business-map-split overflow-hidden border-y border-border/40 bg-background">
      {isLg ? (
        <div className="h-[min(78vh,760px)] min-h-[460px]">
          <PanelGroup direction="horizontal" className="h-full" dir="ltr">
            <Panel defaultSize={56} minSize={42} maxSize={68}>
              <BusinessBrowseMap {...mapProps} className="h-full" />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border/40 transition-colors hover:bg-primary/30" />
            <Panel defaultSize={44} minSize={28} maxSize={52}>
              <MapListColumn
                items={listItems}
                loading={loading}
                selectedPinId={selectedPinId}
                fromPathname={fromPathname}
                onSelectPin={selectPin}
                listRef={listRef}
              />
            </Panel>
          </PanelGroup>
        </div>
      ) : (
        <BusinessMapMobileView
          specialists={specialists}
          citySlugs={citySlugs}
          provinceSlugs={provinceSlugs}
          mapQuery={mapQuery}
          fromPathname={fromPathname}
          onCloseMap={onCloseMap}
          hasCityScope={hasCityScope}
          cityScopeLabel={cityScopeLabel}
          onClearCityScope={onClearCityScope}
        />
      )}
    </div>
  );
}
