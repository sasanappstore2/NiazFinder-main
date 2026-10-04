'use client';

/**
 * mapcn-style MapLibre cluster primitives.
 *
 * Production browse maps (business / need) integrate GPU clustering via
 * `NiazMapGpuClusterLayer` inside `NiazMapClusterLayerMaplibre` ? same algorithm
 * as `MapClusterLayer` below, wired to `NiazMapLibreCore`.
 *
 * Use this module for standalone maps, demos, or admin tools.
 */

import MapLibreGL from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus, Locate, Maximize, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BROWSE_CLUSTER_COLORS,
  BROWSE_CLUSTER_MAX_ZOOM,
  BROWSE_CLUSTER_RADIUS,
  BROWSE_CLUSTER_THRESHOLDS,
} from '@/lib/map/cluster-config';

const defaultStyles = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

type Theme = 'light' | 'dark';

function getDocumentTheme(): Theme | null {
  if (typeof document === 'undefined') return null;
  if (document.documentElement.classList.contains('dark')) return 'dark';
  if (document.documentElement.classList.contains('light')) return 'light';
  return null;
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useResolvedTheme(themeProp?: Theme): Theme {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(
    () => getDocumentTheme() ?? getSystemTheme()
  );

  useEffect(() => {
    if (themeProp) return;

    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) setDetectedTheme(docTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!getDocumentTheme()) {
        setDetectedTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a Map component');
  }
  return context;
}

type MapViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type MapRef = MapLibreGL.Map;

type MapProps = {
  children?: ReactNode;
  className?: string;
  theme?: Theme;
  styles?: { light?: string | MapLibreGL.StyleSpecification; dark?: string | MapLibreGL.StyleSpecification };
  viewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  loading?: boolean;
} & Omit<MapLibreGL.MapOptions, 'container' | 'style'>;

function DefaultLoader() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-xs">
      <div className="flex gap-1">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

export const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    className,
    theme: themeProp,
    styles,
    viewport,
    onViewportChange,
    loading = false,
    ...props
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const currentStyleRef = useRef<string | MapLibreGL.StyleSpecification | null>(null);
  const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);
  const isControlled = viewport !== undefined && onViewportChange !== undefined;
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? defaultStyles.dark,
      light: styles?.light ?? defaultStyles.light,
    }),
    [styles]
  );

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  const clearStyleTimeout = useCallback(() => {
    if (styleTimeoutRef.current) {
      clearTimeout(styleTimeoutRef.current);
      styleTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle = resolvedTheme === 'dark' ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...props,
      ...viewport,
    });

    const styleDataHandler = () => {
      clearStyleTimeout();
      styleTimeoutRef.current = setTimeout(() => setIsStyleLoaded(true), 100);
    };
    const loadHandler = () => setIsLoaded(true);

    const handleMove = () => {
      if (internalUpdateRef.current) return;
      onViewportChangeRef.current?.(getViewport(map));
    };

    map.on('load', loadHandler);
    map.on('styledata', styleDataHandler);
    map.on('move', handleMove);
    setMapInstance(map);

    return () => {
      clearStyleTimeout();
      map.off('load', loadHandler);
      map.off('styledata', styleDataHandler);
      map.off('move', handleMove);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
     
  }, []);

  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport) return;
    if (mapInstance.isMoving()) return;

    const current = getViewport(mapInstance);
    const next = {
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    };

    if (
      next.center[0] === current.center[0] &&
      next.center[1] === current.center[1] &&
      next.zoom === current.zoom &&
      next.bearing === current.bearing &&
      next.pitch === current.pitch
    ) {
      return;
    }

    internalUpdateRef.current = true;
    mapInstance.jumpTo(next);
    internalUpdateRef.current = false;
  }, [mapInstance, isControlled, viewport]);

  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return;
    const newStyle = resolvedTheme === 'dark' ? mapStyles.dark : mapStyles.light;
    if (currentStyleRef.current === newStyle) return;
    clearStyleTimeout();
    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);
    mapInstance.setStyle(newStyle, { diff: true });
  }, [mapInstance, resolvedTheme, mapStyles, clearStyleTimeout]);

  const contextValue = useMemo(
    () => ({ map: mapInstance, isLoaded: isLoaded && isStyleLoaded }),
    [mapInstance, isLoaded, isStyleLoaded]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn('relative h-full w-full', className)}>
        {(!isLoaded || loading) && <DefaultLoader />}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

type MapClusterLayerProps<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties,
> = {
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterColors?: [string, string, string];
  clusterThresholds?: [number, number];
  pointColor?: string;
  onPointClick?: (
    feature: GeoJSON.Feature<GeoJSON.Point, P>,
    coordinates: [number, number]
  ) => void;
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number
  ) => void;
};

export function MapClusterLayer<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties,
>({
  data,
  clusterMaxZoom = BROWSE_CLUSTER_MAX_ZOOM,
  clusterRadius = BROWSE_CLUSTER_RADIUS,
  clusterColors = BROWSE_CLUSTER_COLORS,
  clusterThresholds = BROWSE_CLUSTER_THRESHOLDS,
  pointColor = BROWSE_CLUSTER_COLORS[0],
  onPointClick,
  onClusterClick,
}: MapClusterLayerProps<P>) {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `cluster-source-${id}`;
  const clusterLayerId = `clusters-${id}`;
  const clusterCountLayerId = `cluster-count-${id}`;
  const unclusteredLayerId = `unclustered-point-${id}`;
  const stylePropsRef = useRef({ clusterColors, clusterThresholds, pointColor });

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    });

    map.addLayer({
      id: clusterLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          clusterColors[0],
          clusterThresholds[0],
          clusterColors[1],
          clusterThresholds[1],
          clusterColors[2],
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          clusterThresholds[0],
          28,
          clusterThresholds[1],
          36,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.92,
      },
    });

    map.addLayer({
      id: clusterCountLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: { 'text-color': '#fff' },
    });

    map.addLayer({
      id: unclusteredLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': pointColor,
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    return () => {
      try {
        if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
        if (map.getLayer(unclusteredLayerId)) map.removeLayer(unclusteredLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
     
  }, [isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || typeof data === 'string') return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    source?.setData(data);
  }, [isLoaded, map, data, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClusterClick = async (e: MapLibreGL.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
      if (!features.length) return;

      const feature = features[0]!;
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (onClusterClick) {
        onClusterClick(clusterId, coordinates, pointCount);
      } else {
        const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: coordinates, zoom, duration: 300 });
      }
    };

    const handlePointClick = (e: MapLibreGL.MapLayerMouseEvent) => {
      if (!onPointClick || !e.features?.length) return;
      const feature = e.features[0]!;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];
      onPointClick(feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>, coordinates);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', clusterLayerId, handleClusterClick);
    map.on('click', unclusteredLayerId, handlePointClick);
    map.on('mouseenter', clusterLayerId, handleMouseEnter);
    map.on('mouseleave', clusterLayerId, handleMouseLeave);
    map.on('mouseenter', unclusteredLayerId, handleMouseEnter);
    map.on('mouseleave', unclusteredLayerId, handleMouseLeave);

    return () => {
      map.off('click', clusterLayerId, handleClusterClick);
      map.off('click', unclusteredLayerId, handlePointClick);
      map.off('mouseenter', clusterLayerId, handleMouseEnter);
      map.off('mouseleave', clusterLayerId, handleMouseLeave);
      map.off('mouseenter', unclusteredLayerId, handleMouseEnter);
      map.off('mouseleave', unclusteredLayerId, handleMouseLeave);
      map.getCanvas().style.cursor = '';
    };
  }, [isLoaded, map, clusterLayerId, unclusteredLayerId, sourceId, onClusterClick, onPointClick]);

  return null;
}

type MapPopupProps = {
  longitude: number;
  latitude: number;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
} & Omit<MapLibreGL.PopupOptions, 'className' | 'closeButton'>;

export function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps) {
  const { map } = useMap();
  const popupOptionsRef = useRef(popupOptions);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const container = useMemo(() => document.createElement('div'), []);

  const popup = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth('none')
      .setLngLat([longitude, latitude]);
     
  }, []);

  useEffect(() => {
    if (!map) return;
    const onCloseProp = () => onCloseRef.current?.();
    popup.on('close', onCloseProp);
    popup.setDOMContent(container);
    popup.addTo(map);
    return () => {
      popup.off('close', onCloseProp);
      if (popup.isOpen()) popup.remove();
    };
     
  }, [map]);

  return createPortal(
    <div
      className={cn(
        'bg-popover text-popover-foreground relative max-w-62 rounded-md border p-3 shadow-md',
        className
      )}
    >
      {closeButton ? (
        <button
          type="button"
          onClick={() => popup.remove()}
          aria-label="Close popup"
          className="absolute top-0.5 right-0.5 inline-flex size-5 items-center justify-center rounded-sm hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      {children}
    </div>,
    container
  );
}

type MapControlsProps = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showZoom?: boolean;
  showLocate?: boolean;
  showFullscreen?: boolean;
  className?: string;
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

const positionClasses = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-10 right-2',
};

export function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const handleLocate = useCallback(() => {
    setWaitingForLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
          };
          map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: 1500 });
          onLocate?.(coords);
          setWaitingForLocation(false);
        },
        () => setWaitingForLocation(false)
      );
    }
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  }, [map]);

  return (
    <div className={cn('absolute z-10 flex flex-col gap-1.5', positionClasses[position], className)}>
      {showZoom ? (
        <div className="flex flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            className="flex size-8 items-center justify-center hover:bg-accent"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            className="flex size-8 items-center justify-center border-t border-border hover:bg-accent"
          >
            <Minus className="size-4" />
          </button>
        </div>
      ) : null}
      {showLocate ? (
        <div className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <button
            type="button"
            onClick={handleLocate}
            disabled={waitingForLocation}
            aria-label="Find my location"
            className="flex size-8 items-center justify-center hover:bg-accent disabled:opacity-50"
          >
            {waitingForLocation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Locate className="size-4" />
            )}
          </button>
        </div>
      ) : null}
      {showFullscreen ? (
        <div className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <button
            type="button"
            onClick={handleFullscreen}
            aria-label="Toggle fullscreen"
            className="flex size-8 items-center justify-center hover:bg-accent"
          >
            <Maximize className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type { MapRef, MapViewport };

// Re-export production GPU layer used by browse maps
export { NiazMapGpuClusterLayer } from '@/components/map/maplibre/NiazMapGpuClusterLayer';
