import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { buildBusinessGeoWhere } from '@/lib/business/browse-geo-filters';
import {
  categoryFilterToPrismaWhere,
  resolveBrowseCategoryFilter,
} from '@/lib/business/resolve-browse-category-filter';
import type { BusinessMapBbox, BusinessMapPin, BusinessMapPinsResult } from '@/lib/business/map-pins-types';
import { isValidLatLng } from '@/lib/business/map-coords';

const MAX_PINS = 800;

function inBbox(
  lat: number,
  lng: number,
  bbox: BusinessMapBbox
): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

export async function listBusinessMapPins(opts: {
  bbox: BusinessMapBbox;
  citiesParam?: string;
  provincesParam?: string;
  legacyCity?: string;
  category?: string;
  search?: string;
  verified?: boolean;
  limit?: number;
}): Promise<BusinessMapPinsResult> {
  const limit = Math.min(MAX_PINS, Math.max(1, opts.limit ?? MAX_PINS));
  const and: Prisma.BusinessProfileWhereInput[] = [{ status: 'ACTIVE' }];

  const geoClauses = buildBusinessGeoWhere({
    citiesParam: opts.citiesParam,
    provincesParam: opts.provincesParam,
    legacyCity: opts.legacyCity,
  });
  and.push(...geoClauses);

  const categoryWhere = categoryFilterToPrismaWhere(
    resolveBrowseCategoryFilter(opts.category)
  );
  if (categoryWhere) and.push(categoryWhere);
  if (opts.verified) and.push({ verified: true });

  const q = opts.search?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
        { categorySlugs: { contains: q } },
      ],
    });
  }

  const bbox = opts.bbox;
  const bboxClause: Prisma.BusinessProfileWhereInput = {
    OR: [
      {
        AND: [
          { lat: { not: null } },
          { lng: { not: null } },
          { lat: { gte: bbox.south, lte: bbox.north } },
          { lng: { gte: bbox.west, lte: bbox.east } },
        ],
      },
      {
        locations: {
          some: {
            isPublished: true,
            lat: { gte: bbox.south, lte: bbox.north },
            lng: { gte: bbox.west, lte: bbox.east },
          },
        },
      },
    ],
  };

  const where: Prisma.BusinessProfileWhereInput = {
    AND: [...and, bboxClause],
  };

  const rows = await db.businessProfile.findMany({
    where,
    take: limit,
    orderBy: [{ verified: 'desc' }, { rating: 'desc' }],
    select: {
      id: true,
      userId: true,
      slug: true,
      name: true,
      city: true,
      province: true,
      lat: true,
      lng: true,
      logo: true,
      rating: true,
      reviewCount: true,
      verified: true,
      user: { select: { avatar: true, isVerified: true } },
      locations: {
        where: { isPublished: true, lat: { not: null }, lng: { not: null } },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          label: true,
          city: true,
          province: true,
          lat: true,
          lng: true,
        },
      },
    },
  });

  const pins: BusinessMapPin[] = [];
  const seen = new Set<string>();

  for (const profile of rows) {
    const verified = profile.verified || profile.user.isVerified;
    const logo = profile.logo ?? profile.user.avatar ?? undefined;

    const branchPins = profile.locations.filter(
      (loc) => loc.lat != null && loc.lng != null
    );

    if (branchPins.length > 0) {
      for (const loc of branchPins) {
        const lat = loc.lat!;
        const lng = loc.lng!;
        if (!isValidLatLng(lat, lng) || !inBbox(lat, lng, opts.bbox)) continue;
        const key = `${profile.id}:${loc.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pins.push({
          id: key,
          profileId: profile.id,
          slug: profile.slug,
          name: profile.name,
          lat,
          lng,
          city: loc.city ?? profile.city ?? undefined,
          province: loc.province ?? profile.province ?? undefined,
          rating: profile.rating,
          reviewCount: profile.reviewCount,
          verified,
          logo,
          locationId: loc.id,
          locationLabel: loc.label,
        });
      }
      continue;
    }

    const profileLat = profile.lat;
    const profileLng = profile.lng;
    if (profileLat == null || profileLng == null || !isValidLatLng(profileLat, profileLng)) continue;
    if (!inBbox(profileLat, profileLng, opts.bbox)) continue;
    const key = profile.id;
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push({
      id: key,
      profileId: profile.id,
      slug: profile.slug,
      name: profile.name,
      lat: profileLat,
      lng: profileLng,
      city: profile.city ?? undefined,
      province: profile.province ?? undefined,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      verified,
      logo,
    });
  }

  pins.sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return b.rating - a.rating;
  });

  return {
    pins: pins.slice(0, limit),
    total: pins.length,
  };
}
