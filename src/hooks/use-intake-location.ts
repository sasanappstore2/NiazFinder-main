'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { City } from '@/lib/location-system';
import type { NeedDraft } from '@/contracts/need-intake';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import {
  extractIntakeLocationFromDraft,
  resolveIntakeCitySelectValue,
  resolveIntakeNeighborhoodFromDraft,
  resolveManagedCityForNeighborhoods,
} from '@/lib/need-intake/sync-intake-location-form';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { scopeFromCookie } from '@/lib/search/location-scope';
import {
  detectUserLocationFromGps,
  GeoLocationError,
  isGeolocationSupported,
} from '@/lib/location/detect-user-city';
import { resolveSavedUserLocation } from '@/lib/need-intake/resolve-saved-user-location';
import { cookieManager } from '@/lib/cookie-manager';
import { useManagedLocations } from '@/lib/use-managed-locations';
import { useCityNeighborhoods } from '@/hooks/use-city-neighborhoods';
import {
  lookupManagedNeighborhoodBySlug,
  matchManagedNeighborhood,
} from '@/lib/neighborhoods/match-managed-neighborhood';
import { buildManualSuggestionChips } from '@/lib/need-intake/manual-suggestions';
import { textMentionsCityOtherThan } from '@/lib/need-intake/extract-cities-from-text';
import {
  formatNeighborhoodDisambiguationLabel,
  neighborhoodCandidatesNeedDistinctLabels,
} from '@/lib/neighborhoods/format-disambiguation-label';
import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import { extractLocationFragment, normalizeHoodFragment } from '@/lib/need-intake/location-fragment';
import { mayAutoApplyLocation, mayPrefillNeighborhood } from '@/lib/need-intake/compose-auto-apply';

export interface UseIntakeLocationOptions {
  initialCity?: string | null;
  needDraft: NeedDraft | null;
  step: string;
  patchNeedDraftEntities: (patch: Record<string, unknown>) => void;
}

export function useIntakeLocation({
  initialCity,
  needDraft,
  step,
  patchNeedDraftEntities,
}: UseIntakeLocationOptions) {
  const searchParams = useSearchParams();
  const [selectedCity, setSelectedCity] = useState(initialCity ?? '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [myLocationLoading, setMyLocationLoading] = useState(false);
  const [promptNeighborhoodPick, setPromptNeighborhoodPick] = useState(false);
  const cityLockedByUserRef = useRef(false);
  const [cityLockedByUser, setCityLockedByUser] = useState(false);
  const neighborhoodLockedByUserRef = useRef(false);

  const markCityLockedByUser = useCallback((locked: boolean) => {
    cityLockedByUserRef.current = locked;
    setCityLockedByUser(locked);
  }, []);

  const { cities: managedCities } = useManagedLocations();
  const sortedCities = useMemo(
    () => [...managedCities].sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [managedCities]
  );

  const selectedCityMeta = useMemo(
    () => resolveManagedCityForNeighborhoods(sortedCities, selectedCity),
    [sortedCities, selectedCity]
  );

  const neighborhoodCatalogCityId = useMemo(() => {
    if (!selectedCityMeta) return null;
    return locationCityIdToSlug(selectedCityMeta.id);
  }, [selectedCityMeta]);

  const { neighborhoods, isLoading: neighborhoodsLoading } = useCityNeighborhoods(
    neighborhoodCatalogCityId
  );

  const detectedNeighborhood = useMemo(
    () => resolveIntakeNeighborhoodFromDraft(needDraft),
    [needDraft]
  );

  const resolvedNeighborhoodSlug = useMemo(() => {
    const fromDraft = needDraft ? recordToEntities(needDraft.entities).neighborhoodSlug : null;
    if (fromDraft?.trim()) return fromDraft.trim();
    if (!selectedNeighborhood.trim() || neighborhoods.length === 0) return null;
    const hit =
      neighborhoods.find((n) => n.name === selectedNeighborhood.trim()) ??
      matchManagedNeighborhood(neighborhoods, selectedNeighborhood, selectedCity);
    return hit?.id ?? null;
  }, [needDraft, selectedNeighborhood, neighborhoods, selectedCity]);

  const applyCity = useCallback(
    (cityName: string) => {
      const trimmed = cityName.trim();
      markCityLockedByUser(true);

      if (!trimmed) {
        setSelectedCity('');
        setSelectedNeighborhood('');
        patchNeedDraftEntities({
          city: null,
          neighborhood: null,
          neighborhoodSlug: null,
          lat: null,
          lng: null,
        });
        return;
      }

      const sameCity = trimmed === selectedCity.trim();
      setSelectedCity(trimmed);
      if (sameCity) return;

      neighborhoodLockedByUserRef.current = true;
      setSelectedNeighborhood('');
      patchNeedDraftEntities({
        city: trimmed,
        neighborhood: null,
        neighborhoodSlug: null,
        lat: null,
        lng: null,
      });
    },
    [patchNeedDraftEntities, selectedCity, markCityLockedByUser]
  );

  const applyCityRecord = useCallback(
    (city: City | null) => {
      if (!city) {
        applyCity('');
        return;
      }
      applyCity(city.name);
    },
    [applyCity]
  );

  const applyNeighborhood = useCallback(
    (
      neighborhoodName: string,
      neighborhoodId?: string | null,
      opts?: { fromUser?: boolean }
    ) => {
      const trimmed = neighborhoodName.trim();
      const hit =
        neighborhoods.find((n) => n.id === neighborhoodId) ??
        neighborhoods.find((n) => n.name === trimmed) ??
        matchManagedNeighborhood(neighborhoods, trimmed, selectedCity);
      const canonicalName = hit?.name ?? trimmed;
      const resolvedSlug = hit?.id ?? neighborhoodId ?? null;
      if (!canonicalName) return;

      const draftEntities = needDraft ? recordToEntities(needDraft.entities) : null;
      const slugMatches =
        !resolvedSlug || draftEntities?.neighborhoodSlug?.trim() === resolvedSlug.trim();
      const centroid = hit?.centroid;
      const coordsPatch =
        centroid &&
        Number.isFinite(centroid.lat) &&
        Number.isFinite(centroid.lng)
          ? { lat: centroid.lat, lng: centroid.lng }
          : {};

      if (canonicalName === selectedNeighborhood.trim() && slugMatches) {
        if (Object.keys(coordsPatch).length > 0) {
          const lat = draftEntities?.lat;
          const lng = draftEntities?.lng;
          if (lat == null || lng == null) {
            patchNeedDraftEntities(coordsPatch);
          }
        }
        return;
      }

      if (opts?.fromUser) neighborhoodLockedByUserRef.current = true;
      setSelectedNeighborhood(canonicalName);
      patchNeedDraftEntities({
        neighborhood: canonicalName || null,
        neighborhoodSlug: resolvedSlug,
        ...coordsPatch,
      });
    },
    [neighborhoods, needDraft, patchNeedDraftEntities, selectedCity, selectedNeighborhood]
  );

  const applyLocationBundle = useCallback(
    (
      cityName: string,
      neighborhoodName?: string | null,
      neighborhoodSlug?: string | null,
      options?: {
        lockUserChoice?: boolean;
        promptNeighborhood?: boolean;
        citySlug?: string;
      }
    ) => {
      const resolvedCity =
        resolveIntakeCitySelectValue(sortedCities, {
          cityName,
          citySlug: options?.citySlug,
        }) ?? cityName.trim();

      const city = resolvedCity.trim();
      const neighborhood = neighborhoodName?.trim() ?? '';
      setSelectedCity(city);
      setSelectedNeighborhood(neighborhood);
      patchNeedDraftEntities({
        city: city || null,
        neighborhood: neighborhood || null,
        neighborhoodSlug: neighborhoodSlug?.trim() || null,
      });
      if (options?.lockUserChoice) {
        markCityLockedByUser(true);
        neighborhoodLockedByUserRef.current = true;
      }
      if (options?.promptNeighborhood && city && !neighborhood) {
        setPromptNeighborhoodPick(true);
      }
    },
    [patchNeedDraftEntities, sortedCities, markCityLockedByUser]
  );

  const resolveNeighborhoodLabelFromSlug = useCallback(
    async (cityName: string, slug: string): Promise<{ name: string; id: string } | null> => {
      const meta = resolveManagedCityForNeighborhoods(sortedCities, cityName);
      const catalogId = locationCityIdToSlug(meta?.id ?? cityName);
      try {
        const res = await fetch(
          `/api/locations/neighborhoods?cityId=${encodeURIComponent(catalogId)}`
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          neighborhoods?: Array<{ id: string; name: string }>;
        };
        const hit = data.neighborhoods?.find((n) => n.id === slug);
        return hit ? { name: hit.name, id: hit.id } : null;
      } catch {
        return null;
      }
    },
    [sortedCities]
  );

  const applyFromSavedPreferences = useCallback(async (): Promise<boolean> => {
    const urlNeighborhoodSlugs =
      searchParams.get('neighborhoods')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

    const saved = resolveSavedUserLocation(sortedCities, {
      neighborhoodSlugsFromUrl: urlNeighborhoodSlugs,
    });

    if (!saved?.cityName) return false;

    if (urlNeighborhoodSlugs.length > 0) {
      cookieManager.updateNeighborhoodSelection(
        saved.citySlug,
        urlNeighborhoodSlugs,
        saved.neighborhoodName
      );
    }

    let neighborhoodName = saved.neighborhoodName;
    let neighborhoodSlug = saved.neighborhoodSlug;

    const slugsToResolve =
      saved.neighborhoodSlugs.length > 0
        ? saved.neighborhoodSlugs
        : neighborhoodSlug
          ? [neighborhoodSlug]
          : [];

    if (!neighborhoodName && slugsToResolve.length > 0) {
      for (const slug of slugsToResolve) {
        const resolved = await resolveNeighborhoodLabelFromSlug(saved.cityName, slug);
        if (resolved) {
          neighborhoodName = resolved.name;
          neighborhoodSlug = resolved.id;
          cookieManager.updateNeighborhoodSelection(saved.citySlug, slugsToResolve, resolved.name);
          break;
        }
      }
    }

    applyLocationBundle(saved.cityName, neighborhoodName, neighborhoodSlug, {
      lockUserChoice: true,
    });
    toast.success('موقعیت ذخیره‌شده اعمال شد', {
      description: neighborhoodName
        ? `${saved.cityName} · ${neighborhoodName}`
        : saved.cityName,
    });
    return true;
  }, [applyLocationBundle, resolveNeighborhoodLabelFromSlug, searchParams, sortedCities]);

  const applyMyLocation = useCallback(async () => {
    setMyLocationLoading(true);
    setPromptNeighborhoodPick(false);
    try {
      if (isGeolocationSupported()) {
        try {
          const geo = await detectUserLocationFromGps({ highAccuracy: true });
          if (geo?.cityName) {
            applyLocationBundle(
              geo.cityName,
              geo.neighborhood?.name ?? null,
              geo.neighborhood?.id ?? null,
              {
                lockUserChoice: true,
                promptNeighborhood: !geo.neighborhood?.name,
                citySlug: geo.citySlug,
              }
            );
            cookieManager.markGeoDetected(geo.citySlug);
            cookieManager.updateNeighborhoodSelection(
              geo.citySlug,
              geo.neighborhood ? [geo.neighborhood.id] : [],
              geo.neighborhood?.name ?? null
            );
            if (geo.neighborhood?.name) {
              toast.success('موقعیت از GPS تشخیص داده شد', {
                description: `${geo.cityName} · ${geo.neighborhood.name}`,
              });
            } else {
              toast.success('شهر تشخیص داده شد', {
                description: `${geo.cityName} — محله را از لیست انتخاب کنید`,
              });
            }
            return;
          }
        } catch (err) {
          if (err instanceof GeoLocationError) {
            if (err.code === 'denied') {
              const fromSaved = await applyFromSavedPreferences();
              if (fromSaved) return;
              toast.error('دسترسی به موقعیت رد شد. شهر و محله را دستی انتخاب کنید.');
              return;
            }
            if (err.code === 'unsupported') {
              const fromSaved = await applyFromSavedPreferences();
              if (fromSaved) return;
              toast.error('موقعیت‌یابی در این مرورگر پشتیبانی نمی‌شود.');
              return;
            }
            if (err.code === 'timeout') {
              toast.error('زمان دریافت GPS تمام شد. دوباره تلاش کنید یا شهر را دستی انتخاب کنید.');
            } else if (err.code === 'unavailable') {
              toast.error('سیگنال GPS در دسترس نیست. شهر را دستی انتخاب کنید.');
            }
          }
        }
      }

      const fromSaved = await applyFromSavedPreferences();
      if (!fromSaved) {
        toast.error(
          isGeolocationSupported()
            ? 'تشخیص موقعیت ممکن نشد. شهر را دستی انتخاب کنید.'
            : 'شهر مشخص نیست. از منوی بالا شهر را انتخاب کنید یا موقعیت من را بزنید.'
        );
      }
    } catch {
      toast.error('خطای غیرمنتظره رخ داد.');
    } finally {
      setMyLocationLoading(false);
    }
  }, [applyFromSavedPreferences, applyLocationBundle]);

  const applyDetectedLocationFromDraft = useCallback(
    (draft: NeedDraft) => {
      const allowCity = mayAutoApplyLocation(draft, 'city');
      const allowNeighborhood = mayPrefillNeighborhood(draft);
      if (!allowCity && !allowNeighborhood) return;

      const { city, neighborhood } = extractIntakeLocationFromDraft(draft, sortedCities);
      const entities = recordToEntities(draft.entities);
      const slug =
        entities.neighborhoodSlug?.trim() || draft.parsedIntent.neighborhoodSlug?.trim() || '';
      const patch: Record<string, unknown> = {};
      const sourceText = draft.sourceText ?? draft.parsedIntent.rawText ?? '';

      const scopedCity = selectedCity.trim();
      const inferredCity = allowCity ? (city?.trim() ?? '') : '';
      const crossCityInText =
        scopedCity.length > 0 && textMentionsCityOtherThan(sourceText, scopedCity);
      const currentNeighborhood = selectedNeighborhood.trim();

      if (allowCity && !cityLockedByUserRef.current && inferredCity) {
        if (!scopedCity || inferredCity === scopedCity) {
          if (inferredCity !== scopedCity) {
            setSelectedCity(inferredCity);
          }
          if (entities.city !== inferredCity) {
            patch.city = inferredCity;
          }
        } else if (scopedCity && entities.city !== scopedCity) {
          patch.city = scopedCity;
        }
      } else if (scopedCity && entities.city !== scopedCity && cityLockedByUserRef.current) {
        patch.city = scopedCity;
      }

      if (
        allowNeighborhood &&
        !neighborhoodLockedByUserRef.current &&
        !crossCityInText
      ) {
        const cityForMatch = scopedCity || inferredCity;
        const bySlug = slug ? lookupManagedNeighborhoodBySlug(neighborhoods, slug) : null;
        if (bySlug) {
          if (bySlug.name !== currentNeighborhood) {
            setSelectedNeighborhood(bySlug.name);
          }
          if (entities.neighborhood !== bySlug.name) {
            patch.neighborhood = bySlug.name;
          }
          if (entities.neighborhoodSlug !== bySlug.id) {
            patch.neighborhoodSlug = bySlug.id;
          }
        } else if (neighborhood && neighborhoods.length > 0) {
          const hit = matchManagedNeighborhood(neighborhoods, neighborhood, cityForMatch);
          if (hit) {
            if (hit.name !== currentNeighborhood) {
              setSelectedNeighborhood(hit.name);
            }
            if (entities.neighborhood !== hit.name) {
              patch.neighborhood = hit.name;
            }
            if (entities.neighborhoodSlug !== hit.id) {
              patch.neighborhoodSlug = hit.id;
            }
          } else if (neighborhood !== currentNeighborhood) {
            setSelectedNeighborhood(neighborhood);
            if (entities.neighborhood !== neighborhood) {
              patch.neighborhood = neighborhood;
            }
          }
        } else if (neighborhood) {
          if (neighborhood !== currentNeighborhood) {
            setSelectedNeighborhood(neighborhood);
          }
          if (entities.neighborhood !== neighborhood) {
            patch.neighborhood = neighborhood;
          }
          if (slug && entities.neighborhoodSlug !== slug) {
            patch.neighborhoodSlug = slug;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        patchNeedDraftEntities(patch);
      }
    },
    [
      neighborhoods,
      patchNeedDraftEntities,
      selectedCity,
      selectedNeighborhood,
      sortedCities,
    ]
  );

  const neighborhoodDisambiguationChips = useMemo(() => {
    const parsed = needDraft?.parsedIntent;
    const source = needDraft?.sourceText ?? parsed?.rawText ?? '';
    const draftNeighborhood = needDraft ? resolveIntakeNeighborhoodFromDraft(needDraft) : '';
    const userNeighborhood = selectedNeighborhood.trim();
    const isCanonicalSelection = neighborhoods.some(
      (n) => n.name === userNeighborhood || n.id === userNeighborhood
    );

    const phraseCandidates = [
      extractLocationFragment(source)?.trim(),
      parsed?.entities?.area?.trim(),
      draftNeighborhood.trim(),
      !isCanonicalSelection ? userNeighborhood : '',
      isCanonicalSelection ? userNeighborhood : '',
    ]
      .filter((p): p is string => Boolean(p && p.length >= 2))
      .map((p) => normalizeHoodFragment(p) || p);

    let candidates = parsed?.neighborhoodCandidates ?? [];

    // Catalog similarity (all cities): same/similar names beat a single auto-pick
    if (selectedCity.trim() && neighborhoods.length > 0) {
      for (const phrase of phraseCandidates) {
        const hits = findManagedNeighborhoodAmbiguity(neighborhoods, phrase, source);
        if (hits.length >= 2) {
          candidates = hits.slice(0, 6).map((h) => ({
            slug: h.neighborhood.id,
            label: h.neighborhood.name,
            city: selectedCity,
          }));
          break;
        }
      }
    }

    if (candidates.length < 2) return [];

    const distinct = neighborhoodCandidatesNeedDistinctLabels(candidates);

    return candidates.slice(0, 6).map((n) => ({
      value: `neighborhood:${n.slug}`,
      label: formatNeighborhoodDisambiguationLabel(n, neighborhoods, { distinct }),
    }));
  }, [needDraft, neighborhoods, selectedCity, selectedNeighborhood]);

  const manualSuggestionChips = needDraft
    ? buildManualSuggestionChips(needDraft.parsedIntent, selectedCity || initialCity)
    : [];

  const locationSuggestionChips = useMemo(() => {
    const hasNeighborhoodDisambiguation = neighborhoodDisambiguationChips.length >= 2;
    return manualSuggestionChips.filter((chip) => {
      if (
        !chip.value.startsWith('city:') &&
        !chip.value.startsWith('neighborhood:')
      ) {
        return false;
      }
      if (chip.value === 'neighborhood:__other__') return true;
      if (chip.value.startsWith('city:')) {
        return chip.value.slice('city:'.length).trim() !== selectedCity.trim();
      }
      if (chip.value.startsWith('neighborhood:')) {
        // Neighborhood picker already surfaces similar-name chips; avoid a third copy.
        if (hasNeighborhoodDisambiguation) return false;
        const slug = chip.value.slice('neighborhood:'.length);
        const hit = needDraft?.parsedIntent.neighborhoodCandidates?.find((n) => n.slug === slug);
        const hoodName =
          lookupManagedNeighborhoodBySlug(neighborhoods, slug)?.name ??
          hit?.label?.trim() ??
          '';
        return hoodName !== selectedNeighborhood.trim();
      }
      return true;
    });
  }, [
    manualSuggestionChips,
    needDraft,
    neighborhoodDisambiguationChips.length,
    neighborhoods,
    selectedCity,
    selectedNeighborhood,
  ]);

  const handleLocationSuggestion = useCallback(
    (value: string) => {
      if (value.startsWith('city:')) {
        applyCity(value.slice('city:'.length));
        return;
      }
      if (value.startsWith('neighborhood:')) {
        const slug = value.slice('neighborhood:'.length);
        if (slug === '__other__') return;
        const hit = needDraft?.parsedIntent.neighborhoodCandidates?.find((n) => n.slug === slug);
        const hood = lookupManagedNeighborhoodBySlug(neighborhoods, slug);
        const hoodCity = hit?.city?.trim();
        if (hoodCity && hoodCity !== selectedCity.trim()) {
          applyCity(hoodCity);
        }
        const label = hood?.name ?? hit?.label?.trim() ?? slug;
        if (label !== selectedNeighborhood.trim()) {
          applyNeighborhood(label, slug, { fromUser: true });
        }
      }
    },
    [applyCity, applyNeighborhood, needDraft, neighborhoods, selectedCity, selectedNeighborhood]
  );

  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    if (cityLockedByUserRef.current) return;
    const { city } = extractIntakeLocationFromDraft(needDraft, sortedCities);
    if (city && city !== selectedCity) setSelectedCity(city);
  }, [step, needDraft, sortedCities, selectedCity]);

  useEffect(() => {
    if (!needDraft || neighborhoods.length === 0 || neighborhoodLockedByUserRef.current) return;

    const parsed = needDraft.parsedIntent;
    const sourceText = needDraft.sourceText ?? parsed?.rawText ?? '';
    if (
      selectedCity.trim() &&
      textMentionsCityOtherThan(sourceText, selectedCity)
    ) {
      return;
    }

    const parsedCandidates = parsed?.neighborhoodCandidates ?? [];
    if (parsedCandidates.length >= 2 && !parsed?.neighborhoodSlug?.trim()) return;

    const phrase =
      parsed?.entities?.area?.trim() || resolveIntakeNeighborhoodFromDraft(needDraft) || '';
    if (
      phrase.length >= 2 &&
      findManagedNeighborhoodAmbiguity(
        neighborhoods,
        phrase,
        needDraft.sourceText ?? parsed?.rawText ?? ''
      ).length >= 2 &&
      !parsed?.neighborhoodSlug?.trim()
    ) {
      return;
    }

    const entities = recordToEntities(needDraft.entities);
    const slug = entities.neighborhoodSlug?.trim();
    if (slug) {
      const bySlug = neighborhoods.find((n) => n.id === slug || n.name === slug);
      if (bySlug && selectedNeighborhood !== bySlug.name) {
        applyNeighborhood(bySlug.name, bySlug.id);
        return;
      }
    }

    const candidate = selectedNeighborhood.trim() || detectedNeighborhood.trim();
    if (!candidate) return;

    const isCanonical = neighborhoods.some((n) => n.name === candidate || n.id === candidate);
    if (isCanonical) return;

    if (
      findManagedNeighborhoodAmbiguity(
        neighborhoods,
        candidate,
        needDraft.sourceText ?? parsed?.rawText ?? ''
      ).length >= 2
    ) {
      return;
    }

    const hit = matchManagedNeighborhood(neighborhoods, candidate, selectedCity);
    if (hit) applyNeighborhood(hit.name, hit.id);
  }, [
    needDraft,
    neighborhoods,
    selectedNeighborhood,
    detectedNeighborhood,
    selectedCity,
    applyNeighborhood,
  ]);

  useEffect(() => {
    if (selectedCity.trim()) return;
    // RFC-0004: URL initialCity is analyze hint only — do not fill/lock the form.
    if (initialCity?.trim()) return;
    const scope = scopeFromCookie();
    if (scope.mode === 'city' || scope.mode === 'cities') {
      const cityName = scope.cities[0]?.name?.trim();
      if (cityName) {
        setSelectedCity(cityName);
        markCityLockedByUser(true);
      }
    }
  }, [selectedCity, initialCity, sortedCities, markCityLockedByUser]);

  const resetLocationLocks = useCallback(() => {
    markCityLockedByUser(false);
    neighborhoodLockedByUserRef.current = false;
  }, [markCityLockedByUser]);

  const lockCityByUser = useCallback(() => {
    markCityLockedByUser(true);
  }, [markCityLockedByUser]);

  return {
    selectedCity,
    setSelectedCity,
    selectedNeighborhood,
    setSelectedNeighborhood,
    sortedCities,
    neighborhoods,
    neighborhoodsLoading,
    resolvedNeighborhoodSlug,
    myLocationLoading,
    promptNeighborhoodPick,
    setPromptNeighborhoodPick,
    neighborhoodDisambiguationChips,
    locationSuggestionChips,
    applyCity,
    applyCityRecord,
    applyNeighborhood,
    applyMyLocation,
    applyDetectedLocationFromDraft,
    handleLocationSuggestion,
    resetLocationLocks,
    lockCityByUser,
    cityLockedByUser,
    cityLockedByUserRef,
    neighborhoodLockedByUserRef,
  };
}
