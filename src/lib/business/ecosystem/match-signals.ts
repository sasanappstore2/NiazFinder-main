import type { PropertyListing } from '@/contracts/business-profile';
import type { EcosystemExtension } from '@/lib/business/ecosystem/types';
import type { NeedMatchContext } from '@/contracts/need-match';
import { parseJsonObject } from '@/lib/business/json-fields';
import { isListingRentDeal, isListingSaleDeal } from '@/lib/business/real-estate-listing-deal-types';

export type BusinessMatchSignals = {
  serviceNeighborhoodIds: string[];
  specializations: string[];
  listings: PropertyListing[];
};

export function readBusinessMatchSignals(extensionsRaw: string): BusinessMatchSignals {
  const ext = parseJsonObject<Record<string, unknown>>(extensionsRaw, {});
  const ecosystem = (ext.ecosystem ?? {}) as EcosystemExtension;
  const listings = Array.isArray((ext.realEstate as { listings?: unknown })?.listings)
    ? ((ext.realEstate as { listings: PropertyListing[] }).listings ?? [])
    : [];

  const serviceNeighborhoodIds = (ecosystem.serviceArea?.areas ?? [])
    .map((a) => a.neighborhoodId)
    .filter((id): id is string => Boolean(id));

  return {
    serviceNeighborhoodIds,
    specializations: ecosystem.specializations ?? [],
    listings,
  };
}

export function extractNeighborhoodIdFromDynamicAnswers(
  dynamicAnswers?: Record<string, unknown>
): string | undefined {
  if (!dynamicAnswers) return undefined;
  const fromAnswers = dynamicAnswers.neighborhoodId ?? dynamicAnswers.neighborhood_id;
  if (typeof fromAnswers === 'string' && fromAnswers.trim()) return fromAnswers.trim();
  return undefined;
}

export function extractNeedNeighborhoodId(need: NeedMatchContext): string | undefined {
  if (need.neighborhoodId) return need.neighborhoodId;
  return extractNeighborhoodIdFromDynamicAnswers(need.dynamicAnswers);
}

function needDealType(need: NeedMatchContext): string | undefined {
  if (need.dealType) return need.dealType;
  const fromAnswers = need.dynamicAnswers?.dealType;
  return typeof fromAnswers === 'string' ? fromAnswers : undefined;
}

/** Extra rule-based score from ecosystem + listings (0–0.35). */
export function scoreBusinessMatchSignals(
  need: NeedMatchContext,
  signals: BusinessMatchSignals
): { boost: number; reasons: string[] } {
  let boost = 0;
  const reasons: string[] = [];

  const needNeighborhoodId = extractNeedNeighborhoodId(need);
  if (
    needNeighborhoodId &&
    signals.serviceNeighborhoodIds.some((id) => id === needNeighborhoodId)
  ) {
    boost += 0.18;
    reasons.push('پوشش محله');
  }

  const activeListings = signals.listings.filter(
    (l) => l.status !== 'sold' && l.status !== 'rented'
  );

  const categoryHit = activeListings.some((l) => l.categorySlug === need.categorySlug);
  if (categoryHit) {
    boost += 0.12;
    reasons.push('آگهی هم‌دسته');
  }

  const deal = needDealType(need);
  if (deal) {
    const dealHit = activeListings.some((l) => {
      if (!l.dealType) return false;
      const normalized = l.dealType === 'sale' ? 'sell' : l.dealType === 'rent' ? 'rent_rahn_ejare' : l.dealType;
      if (deal === 'buy' && (normalized === 'sell' || l.dealType === 'sale')) return true;
      if (deal === 'sell' && (normalized === 'sell' || l.dealType === 'sale')) return true;
      return normalized === deal;
    });
    if (dealHit) {
      boost += 0.08;
      reasons.push('آگهی هم‌نوع معامله');
    }
  }

  if (needNeighborhoodId) {
    const listingNeighborhoodHit = activeListings.some(
      (l) => l.neighborhoodId === needNeighborhoodId
    );
    if (listingNeighborhoodHit) {
      boost += 0.1;
      reasons.push('آگهی در همان محله');
    }
  }

  const rentNeed = deal?.includes('rent') || deal?.includes('rahn');
  const saleNeed = deal === 'buy' || deal === 'sell';
  if (rentNeed && activeListings.some((l) => isListingRentDeal(l.dealType))) {
    boost += 0.05;
    reasons.push('املاک اجاره‌ای فعال');
  }
  if (saleNeed && activeListings.some((l) => isListingSaleDeal(l.dealType))) {
    boost += 0.05;
    reasons.push('املاک فروش فعال');
  }

  return { boost: Math.min(boost, 0.35), reasons };
}
