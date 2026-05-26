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
  /** Skip auto-run (e.g. URL already has a city) */
  skipAuto?: boolean;
  onDetected?: (city: City) => void;
}

export function useAutoLocationCity(options: UseAutoLocationCityOptions = {}) {
  const { skipAuto = false, onDetected } = options;
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [status, setStatus] = useState<AutoLocationStatus>(() =>
    isGeolocationSupported() ? 'idle' : 'unsupported'
  );
  const [detectedCity, setDetectedCity] = useState<City | null>(null);
  const ranAutoRef = useRef(false);

  const runDetection = useCallback(async (force = false) => {
    if (!isGeolocationSupported()) {
      setStatus('unsupported');
      return null;
    }

    if (!force && !cookieManager.shouldAttemptGeoAuto() && !detectedCity) {
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
  }, [detectedCity]);

  useEffect(() => {
    if (skipAuto || ranAutoRef.current) return;
    if (!cookieManager.shouldAttemptGeoAuto()) return;
    if (!isGeolocationSupported()) {
      setStatus('unsupported');
      return;
    }

    ranAutoRef.current = true;
    void runDetection(false);
  }, [skipAuto, runDetection]);

  return {
    status,
    detectedCity,
    isDetecting: status === 'detecting',
    runDetection,
  };
}
