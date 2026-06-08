import { db } from '@/lib/db';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { isValidLatLng } from '@/lib/map/coords';
import { getCategoryColor } from '@/lib/categories/category-colors';
import type { NeedMapPin, NeedMapPinsResult } from '@/lib/need/map-pins-types';
import { buildRequestBrowseAndFilters, type RequestBrowseFilterInput } from '@/lib/need/request-browse-filters';
import { extractNeighborhoodSlugFromDynamicAnswers } from '@/lib/need/extract-neighborhood-slug';
import {
  persianCityNameToSlug,
  resolveApproximateCityPin,
  resolveApproximateNeighborhoodPin,
} from '@/lib/need/approximate-neighborhood-pin';
import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

const MAX_PINS = 800;

function inBbox(lat: number, lng: number, bbox: BusinessMapBbox): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function budgetFromDb(value: bigint | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PIN_SELECT = {
  id: true,
  slug: true,
  title: true,
  lat: true,
  lng: true,
  city: true,
  province: true,
  priority: true,
  budgetMin: true,
  budgetMax: true,
  proposalCount: true,
  createdAt: true,
  category: { select: { slug: true, name: true } },
  subcategory: { select: { slug: true, name: true } },
} as const;

function rowToPin(
  row: {
    id: string;
    slug: string;
    title: string;
    lat: number;
    lng: number;
    city: string | null;
    province: string | null;
    priority: string;
    budgetMin: bigint | null;
    budgetMax: bigint | null;
    proposalCount: number;
    createdAt: Date;
    category: { slug: string; name: string };
    subcategory: { slug: string; name: string } | null;
  },
  extra?: Pick<NeedMapPin, 'approximate' | 'neighborhoodLabel'>
): NeedMapPin {
  const categorySlug = row.subcategory?.slug ?? row.category.slug;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    lat: row.lat,
    lng: row.lng,
    city: row.city ?? undefined,
    province: row.province ?? undefined,
    priority: row.priority,
    budgetMin: budgetFromDb(row.budgetMin),
    budgetMax: budgetFromDb(row.budgetMax),
    categorySlug,
    categoryTitle: row.subcategory?.name ?? row.category.name,
    pinColor: getCategoryColor(categorySlug),
    proposalCount: row.proposalCount,
    createdAt: row.createdAt.toISOString(),
    ...extra,
  };
}

export async function listNeedMapPins(
  bbox: BusinessMapBbox,
  filters: RequestBrowseFilterInput
): Promise<NeedMapPinsResult> {
  const andFilters = await buildRequestBrowseAndFilters(filters);
  const pins: NeedMapPin[] = [];
  const seenIds = new Set<string>();

  const exactRows = await db.serviceRequest.findMany({
    where: {
      AND: [
        { status: 'OPEN' },
        { moderationStatus: 'APPROVED' },
        { lat: { gte: bbox.south, lte: bbox.north } },
        { lng: { gte: bbox.west, lte: bbox.east } },
        ...andFilters,
      ],
    },
    take: MAX_PINS,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    select: PIN_SELECT,
  });

  for (const row of exactRows) {
    const lat = row.lat;
    const lng = row.lng;
    if (lat == null || lng == null || !isValidLatLng(lat, lng) || !inBbox(lat, lng, bbox)) {
      continue;
    }
    pins.push(rowToPin({ ...row, lat, lng }));
    seenIds.add(row.id);
    if (pins.length >= MAX_PINS) {
      return { pins, total: pins.length };
    }
  }

  const approxRows = await db.serviceRequest.findMany({
    where: {
      AND: [
        { status: 'OPEN' },
        { moderationStatus: 'APPROVED' },
        { OR: [{ lat: null }, { lng: null }] },
        { dynamicAnswers: { contains: '_neighborhoodSlug' } },
        ...andFilters,
      ],
    },
    take: MAX_PINS,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    select: {
      ...PIN_SELECT,
      dynamicAnswers: true,
    },
  });

  const neighborhoodCache = new Map<string, ManagedNeighborhood[]>();

  for (const row of approxRows) {
    if (seenIds.has(row.id)) continue;
    if (row.lat != null && row.lng != null && isValidLatLng(row.lat, row.lng)) continue;

    const neighborhoodSlug = extractNeighborhoodSlugFromDynamicAnswers(row.dynamicAnswers);
    if (!neighborhoodSlug) continue;

    const citySlug = persianCityNameToSlug(row.city);
    if (!citySlug) continue;

    let neighborhoods = neighborhoodCache.get(citySlug);
    if (!neighborhoods) {
      neighborhoods = await loadCityNeighborhoods(citySlug);
      neighborhoodCache.set(citySlug, neighborhoods);
    }

    const hood =
      neighborhoods.find((n) => n.id === neighborhoodSlug) ??
      neighborhoods.find((n) => n.id.toLowerCase() === neighborhoodSlug.toLowerCase());
    if (!hood) continue;

    const coords = resolveApproximateNeighborhoodPin({
      citySlug,
      neighborhoodSlug: hood.id,
      neighborhoodOrder: hood.order,
      neighborhoodCount: neighborhoods.length,
      seed: row.id,
    });
    if (!coords || !inBbox(coords.lat, coords.lng, bbox)) continue;

    pins.push(
      rowToPin(
        {
          ...row,
          lat: coords.lat,
          lng: coords.lng,
        },
        { approximate: true, neighborhoodLabel: hood.name }
      )
    );
    seenIds.add(row.id);

    if (pins.length >= MAX_PINS) break;
  }

  const cityOnlyRows = await db.serviceRequest.findMany({
    where: {
      AND: [
        { status: 'OPEN' },
        { moderationStatus: 'APPROVED' },
        { OR: [{ lat: null }, { lng: null }] },
        { city: { not: null } },
        ...andFilters,
      ],
    },
    take: MAX_PINS,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    select: {
      ...PIN_SELECT,
      dynamicAnswers: true,
    },
  });

  for (const row of cityOnlyRows) {
    if (seenIds.has(row.id)) continue;
    if (row.lat != null && row.lng != null && isValidLatLng(row.lat, row.lng)) continue;
    if (!row.city?.trim()) continue;

    const neighborhoodSlug = extractNeighborhoodSlugFromDynamicAnswers(row.dynamicAnswers);
    if (neighborhoodSlug) continue;

    const citySlug = persianCityNameToSlug(row.city);
    if (!citySlug) continue;

    const coords = resolveApproximateCityPin({ citySlug, seed: row.id });
    if (!coords || !inBbox(coords.lat, coords.lng, bbox)) continue;

    pins.push(
      rowToPin(
        {
          ...row,
          lat: coords.lat,
          lng: coords.lng,
        },
        { approximate: true }
      )
    );
    seenIds.add(row.id);

    if (pins.length >= MAX_PINS) break;
  }

  return { pins, total: pins.length };
}
