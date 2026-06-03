import { clientIpFromRequest, hashIp } from '@/lib/analytics/ip-hash';
import { lookupIpGeo } from '@/lib/analytics/geo-maxmind';
import {
  cityProvinceId,
  normalizeCitySlug,
  normalizeProvinceSlug,
} from '@/lib/analytics/geo-location-index';

export type GeoHint = {
  country: string;
  province: string | null;
  city: string | null;
  ipHash: string;
  geoSource: 'geoip' | 'cookie' | 'url' | 'none';
  geoInferredProvince: string | null;
  geoInferredCity: string | null;
};

export type LocationCookieHint = {
  province?: string;
  city?: string;
  citySlug?: string;
};

/** Resolve geo: GeoIP → cookie → URL citySlug. */
export async function geoFromRequest(
  request: Request,
  urlCitySlug?: string | null
): Promise<GeoHint> {
  const ip = clientIpFromRequest(request);
  const ipHash = hashIp(ip);

  let country = 'IR';
  let province: string | null = null;
  let city: string | null = null;
  let geoSource: GeoHint['geoSource'] = 'none';
  let geoInferredProvince: string | null = null;
  let geoInferredCity: string | null = null;

  const mm = await lookupIpGeo(ip);
  if (mm) {
    country = mm.country || 'IR';
    geoInferredProvince = normalizeProvinceSlug(mm.province);
    geoInferredCity = normalizeCitySlug(mm.city);
    province = geoInferredProvince;
    city = geoInferredCity;
    if (province || city) geoSource = 'geoip';
  }

  if (urlCitySlug) {
    const slug = normalizeCitySlug(urlCitySlug);
    if (slug) {
      city = city ?? slug;
      province = province ?? cityProvinceId(slug);
      if (geoSource === 'none') geoSource = 'url';
    }
  }

  return {
    country,
    province,
    city,
    ipHash,
    geoSource,
    geoInferredProvince,
    geoInferredCity,
  };
}

export function enrichGeoFromLocationCookie(
  geo: GeoHint,
  locationCookie?: LocationCookieHint | null
): GeoHint {
  if (!locationCookie) return geo;

  const cookieCity = normalizeCitySlug(locationCookie.city ?? locationCookie.citySlug);
  const cookieProvince = normalizeProvinceSlug(locationCookie.province);

  let province = geo.province;
  let city = geo.city;
  let geoSource = geo.geoSource;

  if (cookieProvince) {
    province = cookieProvince;
    if (geoSource === 'none' || geoSource === 'url') geoSource = 'cookie';
  }
  if (cookieCity) {
    city = cookieCity;
    province = province ?? cityProvinceId(cookieCity);
    if (geoSource === 'none' || geoSource === 'url') geoSource = 'cookie';
  }

  return { ...geo, province, city, geoSource };
}
