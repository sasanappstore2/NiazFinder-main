import type { City } from '@/lib/location-system';
import { nearestLocationCity } from '@/lib/location/city-coordinates';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export type GeoErrorCode = 'unsupported' | 'denied' | 'timeout' | 'unavailable' | 'unknown';

export class GeoLocationError extends Error {
  constructor(
    message: string,
    public readonly code: GeoErrorCode
  ) {
    super(message);
    this.name = 'GeoLocationError';
  }
}

const GEO_TIMEOUT_MS = 8_000;

/** Browser Geolocation API wrapper */
export function requestUserCoordinates(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new GeoLocationError('Geolocation not supported', 'unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeoLocationError('Permission denied', 'denied'));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeoLocationError('Timeout', 'timeout'));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new GeoLocationError('Position unavailable', 'unavailable'));
        } else {
          reject(new GeoLocationError(err.message || 'Unknown error', 'unknown'));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 5 * 60 * 1000,
      }
    );
  });
}

/** Detect nearest site city from device GPS (no raw coords persisted) */
export async function detectUserCity(): Promise<City | null> {
  const { lat, lng } = await requestUserCoordinates();
  return nearestLocationCity(lat, lng);
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}
