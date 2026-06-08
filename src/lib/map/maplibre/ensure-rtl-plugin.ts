import maplibregl from 'maplibre-gl';

const RTL_PLUGIN_URL = '/map/mapbox-gl-rtl-text.js';

let rtlPromise: Promise<void> | null = null;

/** Persian/Arabic street labels need the RTL shaping plugin (MapLibre). */
export function ensureMapLibreRtlPlugin(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const status = maplibregl.getRTLTextPluginStatus();
  if (status === 'loaded') return Promise.resolve();
  if (rtlPromise) return rtlPromise;

  rtlPromise = maplibregl.setRTLTextPlugin(RTL_PLUGIN_URL, false).catch((err) => {
    rtlPromise = null;
    console.error('[map] RTL text plugin failed to load', err);
    throw err;
  });

  return rtlPromise;
}
