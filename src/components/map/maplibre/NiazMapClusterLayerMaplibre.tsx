'use client';

import { useCallback, useState } from 'react';
import { NiazMapMarker as Marker } from '@/components/map/maplibre/map-marker';
import { NiazMapPopup as Popup } from '@/components/map/maplibre/map-popup';
import { NiazMapGpuClusterLayer } from '@/components/map/maplibre/NiazMapGpuClusterLayer';
import { MapPinMarker } from '@/components/map/mapbox/MapPinMarker';
import type { MapPoint } from '@/components/map/mapbox/use-map-clusters';
import { isValidLatLng } from '@/lib/business/map-coords';
import {
  BROWSE_CLUSTER_COLORS,
  BROWSE_CLUSTER_MAX_ZOOM,
  BROWSE_CLUSTER_RADIUS,
  BROWSE_CLUSTER_THRESHOLDS,
} from '@/lib/map/cluster-config';

export function NiazMapClusterLayerMaplibre<T extends MapPoint>({
  points,
  selectedPinId,
  onSelectPin,
  showPopups = true,
  maxZoom,
  getPinProps,
  renderPopup,
}: {
  points: T[];
  selectedPinId: string | null;
  onSelectPin: (pin: T | null) => void;
  showPopups?: boolean;
  maxZoom?: number;
  getPinProps: (pin: T) => {
    selected: boolean;
    verified?: boolean;
    approximate?: boolean;
    color?: string;
  };
  renderPopup: (pin: T) => React.ReactNode;
}) {
  const clusterMaxZoom = maxZoom ?? BROWSE_CLUSTER_MAX_ZOOM;
  const [unclusteredPins, setUnclusteredPins] = useState<T[]>([]);

  const handleUnclusteredChange = useCallback((pins: T[]) => {
    setUnclusteredPins(pins);
  }, []);

  const popupPin =
    showPopups && selectedPinId
      ? (points.find((p) => p.id === selectedPinId) ?? null)
      : null;

  return (
    <>
      <NiazMapGpuClusterLayer
        points={points}
        clusterMaxZoom={clusterMaxZoom}
        clusterRadius={BROWSE_CLUSTER_RADIUS}
        clusterColors={BROWSE_CLUSTER_COLORS}
        clusterThresholds={BROWSE_CLUSTER_THRESHOLDS}
        clustersOnly
        onUnclusteredChange={handleUnclusteredChange}
      />

      {unclusteredPins.map((pin) => {
        if (!isValidLatLng(pin.lat, pin.lng)) return null;
        const pinProps = getPinProps(pin);

        return (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectPin(pin);
            }}
          >
            <MapPinMarker
              selected={pinProps.selected}
              verified={pinProps.verified}
              approximate={pinProps.approximate}
              color={pinProps.color}
            />
          </Marker>
        );
      })}

      {popupPin && isValidLatLng(popupPin.lat, popupPin.lng) ? (
        <Popup
          longitude={popupPin.lng}
          latitude={popupPin.lat}
          anchor="bottom"
          offset={[0, -36] as [number, number]}
          closeButton
          closeOnClick={false}
          className="bm-popup"
          onClose={() => onSelectPin(null)}
        >
          {renderPopup(popupPin)}
        </Popup>
      ) : null}
    </>
  );
}
