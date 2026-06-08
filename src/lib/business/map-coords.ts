export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function filterValidMapPins<T extends { lat: number; lng: number }>(pins: T[]): T[] {
  return pins.filter((pin) => isValidLatLng(pin.lat, pin.lng));
}
