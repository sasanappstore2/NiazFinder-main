'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { City } from '@/lib/location-system';
import { detectUserCity, GeoLocationError, isGeolocationSupported } from '@/lib/location/detect-user-city';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { cookieManager } from '@/lib/cookie-manager';

export type AutoLocationStatus =
  | 'idle'
  | 'detecting'
  | 'detected'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface UseAutoLocationCityOptions {
  onDetected?: (city: City) => void;
}

/** GPS city detection — only runs when `runDetection()` is called (user action). */
export function useAutoLocationCity(options: UseAutoLocationCityOptions = {}) {
  const { onDetected } = options;
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const [status, setStatus] = useState<AutoLocationStatus>(() =>
    isGeolocationSupported() ? 'idle' : 'unsupported'
  );
  const [detectedCity, setDetectedCity] = useState<City | null>(null);

  const runDetection = useCallback(async () => {
    if (!isGeolocationSupported()) {
      setStatus('unsupported');
      return null;
    }

    setStatus('detecting');

    try {
      const city = await detectUserCity();
      if (!city) {
        cookieManager.markGeoAutoAttempted();
        setStatus('error');
        return null;
      }

      const slug = locationCityIdToSlug(city.id);
      cookieManager.markGeoDetected(slug);
      setDetectedCity(city);
      setStatus('detected');
      onDetectedRef.current?.(city);
      return city;
    } catch (e) {
      if (e instanceof GeoLocationError && e.code === 'denied') {
        cookieManager.markGeoDenied();
        setStatus('denied');
      } else {
        cookieManager.markGeoAutoAttempted();
        setStatus('error');
      }
      return null;
    }
  }, []);

  return {
    status,
    detectedCity,
    isDetecting: status === 'detecting',
    runDetection,
  };
}
