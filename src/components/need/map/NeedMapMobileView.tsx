'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  MAP_AREA_SHEET_PEEK,
  MAP_AREA_SHEET_SNAP_MID,
  MapAreaResultsSheet,
} from '@/components/map/MapAreaResultsSheet';
import { MapAreaNeedPeekRow } from '@/components/map/MapAreaPeekRow';
import { resolveMapAreaPeekHeightPx } from '@/components/map/map-area-sheet-constants';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import type { ServiceRequest } from '@/lib/types';
import { useNeedMapPins, type NeedMapPinsQuery } from '@/hooks/use-need-map-pins';
import { NeedMapListCard } from '@/components/need/map/NeedMapListCard';
import { BusinessMapMobileLayer } from '@/components/business/map/BusinessMapMobileLayer';
import { filterValidMapPins } from '@/lib/map/coords';

const MAP_LOADING = 'در حال بارگذاری نقشه…';
const EMPTY_LIST = 'در این محدوده نیازی یافت نشد';
const LOADING_LIST = 'در حال بروزرسانی فهرست…';
const PULL_HINT = 'بکشید بالا برای فهرست کامل';

const SNAP_PEEK: string | number = MAP_AREA_SHEET_PEEK;
const SNAP_MID = MAP_AREA_SHEET_SNAP_MID;
const NeedBrowseMap = dynamic(
  () => import('@/components/need/map/NeedBrowseMap').then((m) => m.NeedBrowseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/30">
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

export function NeedMapMobileView({
  requests,
  citySlugs,
  provinceSlugs = [],
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
  mapQuery: NeedMapPinsQuery;
  fromPathname: string;
  onCloseMap?: () => void;
  hasCityScope?: boolean;
  cityScopeLabel?: string;
  onClearCityScope?: () => void;
}) {
  const { pins, loading, fetchPins } = useNeedMapPins(mapQuery);
  const validPins = useMemo(() => filterValidMapPins(pins), [pins]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [snap, setSnap] = useState<number | string | null>(MAP_AREA_SHEET_PEEK);
  const listRef = useRef<HTMLDivElement>(null);

  const listItems = useMemo(() => buildListItems(validPins, requests), [validPins, requests]);
  const selectedPin = useMemo(
    () => validPins.find((p) => p.id === selectedPinId) ?? null,
    [validPins, selectedPinId]
  );
  const selectedItem = useMemo(
    () => listItems.find((item) => item.pin.id === selectedPinId) ?? null,
    [listItems, selectedPinId]
  );

  const handleBboxChange = useCallback(
    (bbox: { west: number; south: number; east: number; north: number }) => {
      void fetchPins(bbox);
    },
    [fetchPins]
  );

  const handleMapPinSelect = useCallback((pin: NeedMapPin | null) => {
    if (pin) {
      setSelectedPinId(pin.id);
      setSnap(SNAP_PEEK);
    } else {
      setSelectedPinId(null);
    }
  }, []);

  const handleListPinSelect = useCallback((pin: NeedMapPin) => {
    setSelectedPinId(pin.id);
    setSnap(SNAP_MID);
  }, []);

  useEffect(() => {
    if (!selectedPinId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-pin-id="${selectedPinId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedPinId, snap]);

  const sheetPeekPx = resolveMapAreaPeekHeightPx(!loading && listItems.length > 0);
  const peekItem = selectedItem ?? listItems[0] ?? null;

  return (
    <>
      <BusinessMapMobileLayer style={{ '--bm-sheet-peek': `${sheetPeekPx}px` } as React.CSSProperties}>
        <NeedBrowseMap
          pins={validPins}
          loading={loading}
          citySlugs={citySlugs}
          provinceSlugs={provinceSlugs}
          selectedPinId={selectedPinId}
          selectedPin={selectedPin}
          onSelectPin={handleMapPinSelect}
          onBboxChange={handleBboxChange}
          fromPathname={fromPathname}
          onCloseMap={onCloseMap}
          hasCityScope={hasCityScope}
          cityScopeLabel={cityScopeLabel}
          onClearCityScope={onClearCityScope}
          immersive
          mobileMode
          className="h-full min-h-0"
        />
      </BusinessMapMobileLayer>

      <MapAreaResultsSheet
        snap={snap}
        onSnapChange={setSnap}
        sheetTitle={'\u0641\u0647\u0631\u0633\u062a \u0646\u06cc\u0627\u0632\u0647\u0627'}
        sheetHeading={'\u0646\u06cc\u0627\u0632\u0647\u0627\u06cc \u0627\u06cc\u0646 \u0645\u062d\u0648\u062f\u0647'}
        count={listItems.length}
        countUnit={'\u0646\u06cc\u0627\u0632'}
        loading={loading}
        loadingLabel={LOADING_LIST}
        pullHint={PULL_HINT}
        emptyMessage={EMPTY_LIST}
        peekPreview={
          peekItem ? (
            <MapAreaNeedPeekRow
              pin={peekItem.pin}
              request={peekItem.request}
              selected={selectedPinId === peekItem.pin.id}
              onClick={() => handleListPinSelect(peekItem.pin)}
            />
          ) : null
        }
        listRef={listRef}
      >
        {listItems.map(({ pin, request }) => (
            <div key={pin.id} data-pin-id={pin.id}>
              <NeedMapListCard
                pin={pin}
                request={request}
                selected={selectedPinId === pin.id}
                fromPathname={fromPathname}
                onSelect={() => handleListPinSelect(pin)}
              />
            </div>
          ))
        }
      </MapAreaResultsSheet>
    </>
  );
}
