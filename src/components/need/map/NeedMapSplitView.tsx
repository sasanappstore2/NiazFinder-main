'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import type { ServiceRequest } from '@/lib/types';
import { useNeedMapPins, type NeedMapPinsQuery } from '@/hooks/use-need-map-pins';
import { NeedMapListCard } from '@/components/need/map/NeedMapListCard';
import { NeedMapMobileView } from '@/components/need/map/NeedMapMobileView';
import { filterValidMapPins } from '@/lib/map/coords';

const MAP_LOADING = 'در حال بارگذاری نقشه…';
const LIST_IN_AREA = 'نیاز در این محدوده';
const EMPTY_LIST = 'در این محدوده نیازی یافت نشد';
const LOADING_LIST = 'در حال بروزرسانی فهرست…';

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

const NeedBrowseMap = dynamic(
  () => import('@/components/need/map/NeedBrowseMap').then((m) => m.NeedBrowseMap),
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
  pin: NeedMapPin;
  request?: ServiceRequest;
};

function buildListItems(pins: NeedMapPin[], requests: ServiceRequest[]): MapListItem[] {
  const byId = new Map(requests.map((r) => [r.id, r]));
  return pins.map((pin) => ({ pin, request: byId.get(pin.id) }));
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
  onSelectPin: (pin: NeedMapPin) => void;
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
              <span className="text-primary">{items.length.toLocaleString('fa-IR')}</span> {LIST_IN_AREA}
            </>
          )}
        </p>
      </div>
      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-3 scroll-smooth">
        {!loading && items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{EMPTY_LIST}</p>
        ) : (
          items.map(({ pin, request }) => (
            <div key={pin.id} data-pin-id={pin.id}>
              <NeedMapListCard
                pin={pin}
                request={request}
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

export function NeedMapSplitView({
  requests,
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
  requests: ServiceRequest[];
  citySlugs: string[];
  provinceSlugs?: string[];
  neighborhoodSlugs?: string[];
  mapQuery: NeedMapPinsQuery;
  fromPathname: string;
  onCloseMap?: () => void;
  hasCityScope?: boolean;
  cityScopeLabel?: string;
  onClearCityScope?: () => void;
}) {
  const isLg = useIsLgViewport();
  const { pins, loading, error, fetchPins } = useNeedMapPins(mapQuery);
  const validPins = useMemo(() => filterValidMapPins(pins), [pins]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listItems = useMemo(() => buildListItems(validPins, requests), [validPins, requests]);
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

  const selectPin = useCallback((pin: NeedMapPin) => {
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
    onSelectPin: (pin: NeedMapPin | null) => setSelectedPinId(pin?.id ?? null),
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
      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {isLg ? (
        <div className="h-[min(78vh,760px)] min-h-[460px]">
          <PanelGroup direction="horizontal" className="h-full" dir="ltr">
            <Panel defaultSize={56} minSize={42} maxSize={68}>
              <NeedBrowseMap {...mapProps} className="h-full" />
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
        <NeedMapMobileView
          requests={requests}
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
