'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Info, Loader2, MapPin, MapPinned, Shapes, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { toPersianDigits } from '@/lib/format/digits';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PriceInput } from '@/components/need-intake/PriceInput';
import { IntakeSectionMenus, type IntakeSectionDef } from '@/components/need-intake/IntakeSectionMenus';
import { IntakeCategoryMegaMenuPicker } from '@/components/need-intake/IntakeCategoryMegaMenuPicker';
import { IntakeCityPicker } from '@/components/need-intake/IntakeCityPicker';
import { IntakeCategoryFilterFields } from '@/components/need-intake/IntakeCategoryFilterFields';
import { IntakeNeighborhoodPicker } from '@/components/need-intake/IntakeNeighborhoodPicker';
import { NeedMapPinPicker } from '@/components/need-intake/NeedMapPinPicker';
import { NeedListingPreview } from './NeedListingPreview';
import { IntakeAiShardBar, type IntakeAiShardKey, type IntakeAiShardStatus } from './IntakeAiShardBar';
import { shardStatusFromNeedDraft } from './intake-shard-status';
import { IntakeStepTimeline } from './IntakeStepTimeline';
import { PublishSuccessOverlay } from './PublishSuccessOverlay';
import { SuggestionChips } from './SuggestionChips';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { useAppStore } from '@/lib/store';
import { routeBuilder } from '@/config/routes';
import { getLeadPhone, setLeadPhone as persistLeadPhone } from '@/lib/lead-draft';
import { parseIntentFromText, suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';
import { buildManualSuggestionChips } from '@/lib/need-intake/manual-suggestions';
import { buildSummary } from '@/lib/need-intake/question-engine';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { publishNeedApi } from '@/lib/need-intake/intake-client';
import { useIntakeFormProjection } from '@/hooks/use-intake-form-projection';
import { useIntakeListingCopy } from '@/hooks/use-intake-listing-copy';
import { useIntakeAnalyze } from '@/hooks/use-intake-analyze';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { getClientAuthToken } from '@/lib/auth/client-auth';
import {
  clearPendingIntakePublish,
  loadPendingIntakePublish,
  savePendingIntakePublish,
} from '@/lib/need-intake/pending-intake-publish';
import {
  inferEntitiesFromCategorySlugs,
  patchNeedDraftEntities as patchDraftEntities,
  recordToEntities,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import {
  extractIntakeLocationFromDraft,
  resolveIntakeCitySelectValue,
  resolveIntakeNeighborhoodFromDraft,
  resolveManagedCityForNeighborhoods,
} from '@/lib/need-intake/sync-intake-location-form';
import type { IntakeEntities, TransactionType } from '@/intake/types';
import type { NeedDraft } from '@/contracts/need-intake';
import { hasEntityValue } from '@/intake/entities/entityRegistry';
import {
  getCategoryBySlug,
  normalizeCategoryPair,
} from '@/config/categories';
import type { City } from '@/lib/location-system';
import { getNeedTypeDefinition } from '@/intake/schema/needTypes';
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
import { matchManagedNeighborhood, lookupManagedNeighborhoodBySlug } from '@/lib/neighborhoods/match-managed-neighborhood';
import type { ParsedIntent } from '@/contracts/need-intake';

interface NeedIntakePanelProps {
  initialSeed?: string;
  initialCategory?: string | null;
  initialCity?: string | null;
  initialPhone?: string | null;
}

/** Always visible on step 3; cannot be removed via ×. */
const MANDATORY_INTAKE_SECTION_KEYS = new Set([
  'category',
  'location',
  'deal',
  'service-type',
  'vehicle',
]);

function sectionKeysEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

function computeEnabledSectionsForLocation(draft: NeedDraft): Set<string> {
  const next = new Set<string>();
  for (const section of draft.sections ?? []) {
    if (MANDATORY_INTAKE_SECTION_KEYS.has(section.key)) {
      next.add(section.key);
    }
  }
  return next;
}


export function NeedIntakePanel({
  initialSeed = '',
  initialCategory = null,
  initialCity = null,
  initialPhone = null,
}: NeedIntakePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [linkToBusinessProfile, setLinkToBusinessProfile] = useState(
    () =>
      searchParams.get('linkBusiness') === '1' || searchParams.get('as') === 'company'
  );
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const {
    step,
    needDraft,
    listingPreview,
    isLoading,
    error,
    setStep,
    setListingPreview,
    setLoading,
    setError,
    setSeedText,
    setLeadPhone,
    setNeedDraftFromAnalysis,
    patchNeedDraftEntities,
    syncNeedDraftFromFormFields,
    projectNeedDraftFromFormFields,
    setNeedDraft,
    reset,
    getDraft,
  } = useNeedIntakeStore();

  const [needText, setNeedText] = useState(initialSeed);
  const [detailsText, setDetailsText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState(initialCity ?? '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [enabledSections, setEnabledSections] = useState<Set<string>>(() => new Set());
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [aiEnriching, setAiEnriching] = useState(false);
  const [aiShardStatus, setAiShardStatus] = useState<
    Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>>
  >({});
  const [titleEnriching, setTitleEnriching] = useState(false);
  const [descEnriching, setDescEnriching] = useState(false);
  const previewGenRef = useRef(0);
  const initialCategoryAppliedRef = useRef(false);
  const pendingPublishResumeRef = useRef(false);
  const publishRef = useRef<() => Promise<void>>(async () => {});
  const [publishRedirect, setPublishRedirect] = useState<{ id: string; title: string } | null>(
    null
  );
  const [publishSuccessCopy, setPublishSuccessCopy] = useState<{
    message: string;
    subtitle: string;
  }>({ message: 'آگهی منتشر شد', subtitle: 'در حال انتقال به آگهی…' });
  const [liveSummary, setLiveSummary] = useState('');
  const [myLocationLoading, setMyLocationLoading] = useState(false);
  const [promptNeighborhoodPick, setPromptNeighborhoodPick] = useState(false);
  /** After manual city/neighborhood edit, block system re-detection until «مکان من» or another manual change. */
  const cityLockedByUserRef = useRef(false);
  const neighborhoodLockedByUserRef = useRef(false);
  const categoryLockedByUserRef = useRef(false);
  const steps: Array<{ key: 'need' | 'details' | 'location' | 'preview'; title: string; subtitle: string }> = [
    { key: 'need', title: 'نیاز', subtitle: 'چه چیزی می‌خواهید؟' },
    { key: 'details', title: 'توضیحات', subtitle: 'جزئیات کاربردی را اضافه کنید' },
    { key: 'location', title: 'دسته و مکان', subtitle: 'دسته، شهر و محله را تایید کنید' },
    { key: 'preview', title: 'پیش‌نمایش و انتشار', subtitle: 'بازبینی نهایی قبل از ثبت' },
  ];
  const activeStepIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === step)
  );
  const progress = ((activeStepIndex + 1) / steps.length) * 100;

  const categorySuggestions = useMemo(() => {
    const candidates = suggestNeedCategoriesFromText(`${needText}\n${detailsText}`, 8);
    const slugs: string[] = [];
    const rootFallback: string[] = [];
    for (const candidate of candidates) {
      const pair = normalizeCategoryPair(candidate.slug);
      const leaf = pair.subcategorySlug ?? pair.categorySlug;
      if (!leaf || slugs.includes(leaf) || rootFallback.includes(leaf)) continue;
      const cat = getCategoryBySlug(leaf);
      if (cat?.depth === 0) {
        rootFallback.push(leaf);
        continue;
      }
      slugs.push(leaf);
      if (slugs.length >= 3) break;
    }
    if (slugs.length < 3) {
      for (const root of rootFallback) {
        if (slugs.length >= 3) break;
        slugs.push(root);
      }
    }
    return slugs.slice(0, 3);
  }, [needText, detailsText]);

  const { cities: managedCities } = useManagedLocations();
  const sortedCities = useMemo(
    () => [...managedCities].sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [managedCities]
  );
  const selectedCityMeta = useMemo(() => {
    return resolveManagedCityForNeighborhoods(sortedCities, selectedCity);
  }, [sortedCities, selectedCity]);
  const intakeAnalyzeCityHint = useMemo(() => {
    const resolvedName =
      resolveIntakeCitySelectValue(sortedCities, {
        cityName: selectedCity,
        citySlug: initialCity,
      }) ?? selectedCity.trim();
    const meta = resolvedName
      ? resolveManagedCityForNeighborhoods(sortedCities, resolvedName)
      : null;
    const citySlug =
      initialCity?.trim() ||
      (meta ? locationCityIdToSlug(meta.id) : '') ||
      undefined;
    return {
      cityName: resolvedName || undefined,
      citySlug,
    };
  }, [selectedCity, initialCity, sortedCities]);
  const neighborhoodCatalogCityId = useMemo(() => {
    if (!selectedCityMeta) return null;
    return locationCityIdToSlug(selectedCityMeta.id);
  }, [selectedCityMeta]);
  const { neighborhoods, isLoading: neighborhoodsLoading } = useCityNeighborhoods(
    neighborhoodCatalogCityId
  );

  const detectedNeighborhood = useMemo(() => {
    return resolveIntakeNeighborhoodFromDraft(needDraft);
  }, [needDraft]);

  const resolvedNeighborhoodSlug = useMemo(() => {
    const fromDraft = needDraft ? recordToEntities(needDraft.entities).neighborhoodSlug : null;
    if (fromDraft?.trim()) return fromDraft.trim();
    if (!selectedNeighborhood.trim() || neighborhoods.length === 0) return null;
    const hit =
      neighborhoods.find((n) => n.name === selectedNeighborhood.trim()) ??
      matchManagedNeighborhood(neighborhoods, selectedNeighborhood, selectedCity);
    return hit?.id ?? null;
  }, [needDraft, selectedNeighborhood, neighborhoods, selectedCity]);

  const { projectedDraft, liveDraftForCopy, liveCopyStreamEnabled } =
    useIntakeFormProjection({
      needText,
      detailsText,
      selectedCategory,
      selectedSubcategory,
      selectedCity,
      selectedNeighborhood,
      resolvedNeighborhoodSlug,
      step,
      projectNeedDraftFromFormFields,
    });

  const liveListingCopy = useIntakeListingCopy(liveDraftForCopy, liveCopyStreamEnabled);

  const neighborhoodOptions = neighborhoods;

  const applyDetectedLocationFromDraft = (draft: NonNullable<typeof needDraft>) => {
    const { city, neighborhood } = extractIntakeLocationFromDraft(draft, sortedCities);
    const entities = recordToEntities(draft.entities);
    const slug =
      entities.neighborhoodSlug?.trim() ||
      draft.parsedIntent.neighborhoodSlug?.trim() ||
      '';
    const patch: Record<string, unknown> = {};

    if (!cityLockedByUserRef.current && city) {
      setSelectedCity(city);
      patch.city = city;
    }

    if (!neighborhoodLockedByUserRef.current) {
      const cityForMatch = city || selectedCity;
      const bySlug = slug ? lookupManagedNeighborhoodBySlug(neighborhoods, slug) : null;
      if (bySlug) {
        setSelectedNeighborhood(bySlug.name);
        patch.neighborhood = bySlug.name;
        patch.neighborhoodSlug = bySlug.id;
      } else if (neighborhood && neighborhoods.length > 0) {
        const hit = matchManagedNeighborhood(neighborhoods, neighborhood, cityForMatch);
        if (hit) {
          setSelectedNeighborhood(hit.name);
          patch.neighborhood = hit.name;
          patch.neighborhoodSlug = hit.id;
        } else {
          setSelectedNeighborhood(neighborhood);
          patch.neighborhood = neighborhood;
        }
      } else if (neighborhood) {
        setSelectedNeighborhood(neighborhood);
        patch.neighborhood = neighborhood;
        if (slug) patch.neighborhoodSlug = slug;
      }
    }

    if (Object.keys(patch).length > 0) {
      patchNeedDraftEntities(patch);
    }
  };

  const selectedLeafCategorySlug = selectedSubcategory || selectedCategory;

  const applyCategorySlug = (slug: string, opts?: { userInitiated?: boolean }) => {
    if (opts?.userInitiated) {
      categoryLockedByUserRef.current = true;
    }
    if (!slug.trim()) {
      setSelectedCategory('');
      setSelectedSubcategory('');
      patchNeedDraftEntities({
        categorySlug: null,
        subcategorySlug: null,
        category: null,
      });
      return;
    }
    const normalized = normalizeCategoryPair(slug);
    setSelectedCategory(normalized.categorySlug);
    setSelectedSubcategory(normalized.subcategorySlug ?? '');
    patchNeedDraftEntities(
      inferEntitiesFromCategorySlugs(normalized.categorySlug, normalized.subcategorySlug)
    );
  };

  const applyCategoryFromMegaMenu = (payload: {
    slug: string;
    categorySlug: string;
    subcategorySlug: string | null;
  }) => {
    categoryLockedByUserRef.current = true;
    setSelectedCategory(payload.categorySlug);
    setSelectedSubcategory(payload.subcategorySlug ?? '');
    patchNeedDraftEntities(
      inferEntitiesFromCategorySlugs(payload.categorySlug, payload.subcategorySlug)
    );
  };

  const patchIntakeAnswer = (key: string, value: string | number | string[]) => {
    const draft = getDraft();
    if (!draft) return;

    const entityPatch: Record<string, unknown> = {};
    if (key === 'dealType') {
      entityPatch.transactionType = mapDealTypeToTransaction(String(value));
    }
    if (key === 'bedrooms' || key === 'rooms') {
      const n = Number(value);
      entityPatch.rooms = Number.isFinite(n) ? n : null;
    }
    if (key === 'area' || key === 'areaMin') entityPatch.area = Number(value) || null;
    if (key === 'budget') {
      const n = Number(String(value).replace(/,/g, ''));
      entityPatch.budgetMax = Number.isFinite(n) ? n : null;
    }

    const base = Object.keys(entityPatch).length
      ? patchDraftEntities(draft, entityPatch)
      : draft;

    const answerValue = Array.isArray(value) ? value : String(value);

    setNeedDraft(
      recomputeNeedDraft({
        ...base,
        answers: {
          ...base.answers,
          [key]: answerValue,
          ...(key === 'dealType' ? { _userSetDealType: true } : {}),
        },
      })
    );
  };

  const applyCityRecord = (city: City | null) => {
    if (!city) {
      applyCity('');
      return;
    }
    applyCity(city.name);
  };

  const applyCity = (cityName: string) => {
    const trimmed = cityName.trim();
    cityLockedByUserRef.current = true;

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
  };

  const applyNeighborhood = (
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
    if (canonicalName === selectedNeighborhood.trim() && slugMatches) return;

    if (opts?.fromUser) neighborhoodLockedByUserRef.current = true;
    setSelectedNeighborhood(canonicalName);
    patchNeedDraftEntities({
      neighborhood: canonicalName || null,
      neighborhoodSlug: resolvedSlug,
    });
  };

  const applyLocationBundle = (
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
      cityLockedByUserRef.current = true;
      neighborhoodLockedByUserRef.current = true;
    }
    if (options?.promptNeighborhood && city && !neighborhood) {
      setPromptNeighborhoodPick(true);
    }
  };

  const resolveNeighborhoodLabelFromSlug = async (
    cityName: string,
    slug: string
  ): Promise<{ name: string; id: string } | null> => {
    const meta = resolveManagedCityForNeighborhoods(sortedCities, cityName);
    const catalogId = locationCityIdToSlug(meta?.id ?? cityName);
    try {
      const res = await fetch(
        `/api/locations/neighborhoods?cityId=${encodeURIComponent(catalogId)}`
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { neighborhoods?: Array<{ id: string; name: string }> };
      const hit = data.neighborhoods?.find((n) => n.id === slug);
      return hit ? { name: hit.name, id: hit.id } : null;
    } catch {
      return null;
    }
  };

  const applyFromSavedPreferences = async (): Promise<boolean> => {
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
    toast.success('مکان ذخیره‌شده اعمال شد', {
      description: neighborhoodName
        ? `${saved.cityName} — ${neighborhoodName}`
        : saved.cityName,
    });
    return true;
  };

  const applyMyLocation = async () => {
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
                description: `${geo.cityName} — ${geo.neighborhood.name}`,
              });
            } else {
              toast.success('شهر تشخیص داده شد', {
                description: `${geo.cityName} — لطفاً محله را از لیست انتخاب کنید`,
              });
            }
            return;
          }
        } catch (err) {
          if (err instanceof GeoLocationError) {
            if (err.code === 'denied') {
              const fromSaved = await applyFromSavedPreferences();
              if (fromSaved) return;
              toast.error('دسترسی به موقعیت رد شد. اجازه مکان را در مرورگر فعال کنید.');
              return;
            }
            if (err.code === 'unsupported') {
              const fromSaved = await applyFromSavedPreferences();
              if (fromSaved) return;
              toast.error('مرورگر از موقعیت مکانی پشتیبانی نمی‌کند.');
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
            ? 'نتوانستیم موقعیت را تشخیص دهیم. شهر را دستی انتخاب کنید.'
            : 'مکانی ذخیره نشده. از منوی بالا شهر را انتخاب کنید یا مرورگر دیگری امتحان کنید.'
        );
      }
    } catch {
      toast.error('اعمال مکان ناموفق بود.');
    } finally {
      setMyLocationLoading(false);
    }
  };

  useEffect(() => {
    reset();
    cityLockedByUserRef.current = false;
    neighborhoodLockedByUserRef.current = false;
    categoryLockedByUserRef.current = false;
    const seed = initialSeed.trim();
    setNeedText(seed);
    if (initialCity?.trim()) {
      const resolved =
        resolveIntakeCitySelectValue(sortedCities, {
          cityName: initialCity,
          citySlug: initialCity,
        }) ?? initialCity.trim();
      setSelectedCity(resolved);
    }
    const phone = initialPhone?.trim() || getLeadPhone();
    if (phone) setLeadPhone(phone);

    if (seed) {
      setSeedText(seed);
      setStep('details');
    } else {
      setStep('need');
    }
  }, [initialSeed, initialCity, initialPhone, reset, setStep, setLeadPhone, setSeedText, sortedCities]);

  useEffect(() => {
    if (initialCategoryAppliedRef.current || !initialCategory?.trim()) return;
    initialCategoryAppliedRef.current = true;
    applyCategorySlug(initialCategory.trim());
  }, [initialCategory]);

  useEffect(() => {
    if (step === 'need' || step === 'details' || step === 'done' || step === 'publishing') return;
    const timer = window.setTimeout(() => {
      if (!needText.trim()) return;
      syncNeedDraftFromFormFields({
        needText,
        detailsText,
        categorySlug: selectedCategory,
        subcategorySlug: selectedSubcategory,
        city: selectedCity,
        neighborhood: selectedNeighborhood,
        neighborhoodSlug: resolvedNeighborhoodSlug,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    step,
    needText,
    detailsText,
    selectedCategory,
    selectedSubcategory,
    selectedCity,
    selectedNeighborhood,
    resolvedNeighborhoodSlug,
    syncNeedDraftFromFormFields,
  ]);

  useEffect(() => {
    if (!isAuthenticated || pendingPublishResumeRef.current) return;
    const pending = loadPendingIntakePublish();
    if (!pending) return;
    pendingPublishResumeRef.current = true;
    setNeedText(pending.needText);
    setDetailsText(pending.detailsText);
    setSelectedCategory(pending.categorySlug);
    setSelectedSubcategory(pending.subcategorySlug);
    setSelectedCity(pending.city);
    setSelectedNeighborhood(pending.neighborhood);
    setListingPreview(pending.listingPreview);
    setLinkToBusinessProfile(pending.linkToBusinessProfile ?? false);
    if (pending.needDraft) {
      setNeedDraft(pending.needDraft);
    }
    setStep('preview');
    clearPendingIntakePublish();
    toast.success('پیش‌نویس بازیابی شد — در حال انتشار…');
    window.setTimeout(() => {
      pendingPublishResumeRef.current = false;
      void publishRef.current();
    }, 300);
  }, [isAuthenticated, setListingPreview, setStep, setNeedDraft]);

  useEffect(() => {
    if (selectedCity.trim()) return;
    if (initialCity?.trim()) {
      const resolved =
        resolveIntakeCitySelectValue(sortedCities, {
          cityName: initialCity,
          citySlug: initialCity,
        }) ?? initialCity.trim();
      setSelectedCity(resolved);
      return;
    }
    const scope = scopeFromCookie();
    if (scope.mode === 'city' || scope.mode === 'cities') {
      const cityName = scope.cities[0]?.name?.trim();
      if (cityName) setSelectedCity(cityName);
    }
  }, [selectedCity, initialCity, sortedCities]);

  useEffect(() => {
    const draft = needDraft ?? projectedDraft;
    if (!draft) {
      setLiveSummary('');
      return;
    }
    setLiveSummary(
      buildSummary(draft.parsedIntent, draft.answers, draft.sourceText)
    );
  }, [needDraft, projectedDraft]);

  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    if (cityLockedByUserRef.current) return;
    const { city } = extractIntakeLocationFromDraft(needDraft, sortedCities);
    if (city && city !== selectedCity) setSelectedCity(city);
  }, [step, needDraft, sortedCities, selectedCity]);

  useEffect(() => {
    if (!needDraft || neighborhoods.length === 0 || neighborhoodLockedByUserRef.current) return;

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

    const isCanonical = neighborhoods.some(
      (n) => n.name === candidate || n.id === candidate
    );
    if (isCanonical) return;

    const hit = matchManagedNeighborhood(neighborhoods, candidate, selectedCity);
    if (hit) applyNeighborhood(hit.name, hit.id);
  }, [
    needDraft,
    neighborhoods,
    selectedNeighborhood,
    detectedNeighborhood,
    selectedCity,
  ]);

  const buildParsedFromForm = useCallback((): ParsedIntent => {
    const combined = composeIntakeSourceText(needText, detailsText);
    const parsed = parseIntentFromText(combined);
    const normalized = normalizeCategoryPair(
      selectedCategory || initialCategory || parsed.categorySlug,
      selectedSubcategory || parsed.subcategorySlug
    );
    return {
      ...parsed,
      categorySlug: normalized.categorySlug,
      subcategorySlug: normalized.subcategorySlug,
      city: selectedCity || parsed.city,
      entities: {
        ...parsed.entities,
        ...(selectedNeighborhood ? { area: selectedNeighborhood } : {}),
      },
      rawText: combined,
    };
  }, [
    needText,
    detailsText,
    selectedCategory,
    selectedSubcategory,
    selectedCity,
    selectedNeighborhood,
    initialCategory,
  ]);

  const goToDetails = () => {
    if (!needText.trim()) {
      toast.info('ابتدا نیاز خود را بنویسید');
      return;
    }
    setSeedText(needText.trim());
    setStep('details');
  };

  const { goToLocation } = useIntakeAnalyze({
    needText,
    detailsText,
    step,
    selectedCategory,
    selectedSubcategory,
    selectedCity,
    selectedNeighborhood,
    resolvedNeighborhoodSlug,
    intakeAnalyzeCityHint,
    sortedCities,
    buildParsedFromForm,
    setStep,
    setError,
    setSelectedCategory,
    setSelectedSubcategory,
    setNeedDraft,
    syncNeedDraftFromFormFields,
    setNeedDraftFromAnalysis,
    getDraft,
    patchNeedDraftEntities,
    applyDetectedLocationFromDraft,
    computeEnabledSectionsForLocation,
    setEnabledSections,
    setAiShardStatus,
    setAiEnriching,
    cityLockedByUserRef,
    neighborhoodLockedByUserRef,
    categoryLockedByUserRef,
    resolveIntakeCitySelectValue,
  });

  const goToPreview = () => {
    const draftEntities = needDraft ? recordToEntities(needDraft.entities) : null;
    const categorySlug =
      selectedCategory ||
      draftEntities?.categorySlug ||
      '';
    const subcategorySlug =
      selectedSubcategory ||
      draftEntities?.subcategorySlug ||
      '';
    if (!categorySlug && !subcategorySlug) {
      toast.info('دسته‌بندی را انتخاب کنید');
      return;
    }
    const cityValue = selectedCity.trim() || draftEntities?.city?.trim() || '';
    if (!cityValue) {
      toast.info('شهر را انتخاب کنید');
      return;
    }
    const draft = syncNeedDraftFromFormFields({
      needText,
      detailsText,
      categorySlug: selectedCategory,
      subcategorySlug: selectedSubcategory,
      city: selectedCity,
      neighborhood: selectedNeighborhood,
      neighborhoodSlug: resolvedNeighborhoodSlug,
    });
    if (!draft) {
      toast.error('پیش‌نویس نامعتبر است');
      return;
    }

    const validation = validateNeedDraftForPublish(draft);
    if (!validation.success) {
      const msg = validation.errors.map((e) => e.message).join(' · ');
      toast.error(msg || 'برای پیش‌نمایش، فیلدهای الزامی را تکمیل کنید');
      return;
    }

    setError(null);

    const composed = composeListingFromDraft(draft);
    const deterministicTitle = resolveDeterministicListingTitle(draft).title;
    setListingPreview({
      title: deterministicTitle,
      description: composed.description,
      budgetMin: draft.parsedIntent.budgetMin,
      budgetMax: draft.parsedIntent.budgetMax,
      extras: listingPreview?.extras,
      titleSource: 'template',
    });
    setStep('preview');
    setTitleEnriching(false);
    setDescEnriching(false);
  };

  const repolishPreview = async () => {
    const draft = getDraft();
    if (!draft || !listingPreview) return;
    setIsRepublishing(true);
    try {
      const composed = composeListingFromDraft(draft);
      const deterministicTitle = resolveDeterministicListingTitle(draft).title;
      setListingPreview({
        ...listingPreview,
        title: deterministicTitle,
        description: composed.description,
        titleSource: 'template',
      });
      toast.success('پیش‌نمایش به‌روز شد');
    } finally {
      setIsRepublishing(false);
      setTitleEnriching(false);
      setDescEnriching(false);
    }
  };

  const publish = async () => {
    const draft =
      syncNeedDraftFromFormFields({
        needText,
        detailsText,
        categorySlug: selectedCategory,
        subcategorySlug: selectedSubcategory,
        city: selectedCity,
        neighborhood: selectedNeighborhood,
        neighborhoodSlug: resolvedNeighborhoodSlug,
      }) ?? getDraft();
    if (!draft || !listingPreview) {
      toast.error('پیش‌نمایش را تکمیل کنید');
      return;
    }
    const validation = validateNeedDraftForPublish(draft);
    if (!validation.success) {
      const msg = validation.errors.map((e) => e.message).join(' · ');
      toast.error(msg || 'اطلاعات لازم برای انتشار کامل نیست');
      return;
    }
    if (!isAuthenticated) {
      savePendingIntakePublish({
        needText,
        detailsText,
        categorySlug: selectedCategory,
        subcategorySlug: selectedSubcategory,
        city: selectedCity,
        neighborhood: selectedNeighborhood,
        neighborhoodSlug: resolvedNeighborhoodSlug,
        listingPreview,
        linkToBusinessProfile,
        needDraft: draft,
      });
      setAuthModalTab('login');
      setAuthModalOpen(true);
      toast.info('برای انتشار نیاز، ابتدا وارد شوید — پیش‌نویس ذخیره شد');
      return;
    }
    setStep('publishing');
    setLoading(true);
    setError(null);
    try {
      const token = getClientAuthToken();
      const data = await publishNeedApi(draft, token, listingPreview, null, {
        linkToBusinessProfile,
      });
      setStep('done');
      setPublishSuccessCopy({
        message: data.autoApproved ? 'آگهی منتشر شد' : 'نیاز ثبت شد',
        subtitle:
          data.message ??
          (data.autoApproved
            ? 'در حال انتقال به آگهی…'
            : 'پس از تأیید تیم، در جستجو نمایش داده می‌شود'),
      });
      setPublishRedirect({ id: data.id, title: data.title });
      clearPendingIntakePublish();
      trackAnalyticsEvent('need_created', { requestId: data.id, title: data.title });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در انتشار';
      setError(msg);
      toast.error(msg);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    publishRef.current = publish;
  });

  useEffect(() => {
    if (!publishRedirect) return;
    const timer = window.setTimeout(() => {
      router.push(routeBuilder.listing(publishRedirect.id, publishRedirect.title));
      setPublishRedirect(null);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [publishRedirect, router]);

  const canPublish = useMemo(() => {
    if (!listingPreview?.title.trim() || titleEnriching || descEnriching || isLoading) return false;
    if (!needDraft) return false;
    return validateNeedDraftForPublish(needDraft).success;
  }, [needDraft, listingPreview, titleEnriching, descEnriching, isLoading]);

  const manualSuggestionChips = needDraft
    ? buildManualSuggestionChips(needDraft.parsedIntent, selectedCity || initialCity)
    : [];

  const neighborhoodDisambiguationChips = useMemo(() => {
    const parsed = needDraft?.parsedIntent;
    if (!parsed?.neighborhoodCandidates?.length) return [];
    if (!parsed.locationAmbiguous && parsed.neighborhoodSlug) return [];
    return parsed.neighborhoodCandidates.slice(0, 6).map((n) => ({
      value: `neighborhood:${n.slug}`,
      label: n.label,
    }));
  }, [needDraft?.parsedIntent]);

  const locationSuggestionChips = useMemo(() => {
    return manualSuggestionChips.filter((chip) => {
      if (
        !chip.value.startsWith('city:') &&
        !chip.value.startsWith('area:') &&
        !chip.value.startsWith('neighborhood:')
      ) {
        return false;
      }
      if (chip.value === 'neighborhood:__other__') return true;
      if (chip.value.startsWith('city:')) {
        const city = chip.value.slice('city:'.length).trim();
        return city !== selectedCity.trim();
      }
      if (chip.value.startsWith('area:')) {
        const area = chip.value.slice('area:'.length).trim();
        return area !== selectedNeighborhood.trim();
      }
      if (chip.value.startsWith('neighborhood:')) {
        const slug = chip.value.slice('neighborhood:'.length);
        const hit = needDraft?.parsedIntent.neighborhoodCandidates?.find((n) => n.slug === slug);
        const label = hit?.label?.trim() ?? '';
        return label !== selectedNeighborhood.trim();
      }
      return true;
    });
  }, [manualSuggestionChips, needDraft, selectedCity, selectedNeighborhood]);

  const intakeDisplaySections = useMemo((): IntakeSectionDef[] => {
    if (!needDraft?.sections?.length) return [];
    const def = getNeedTypeDefinition(needDraft.needType, needDraft.schemaVersion);
    if (!def) return needDraft.sections;
    return def.sections.map((defSection) => {
      const draftSection = needDraft.sections.find((s) => s.key === defSection.key);
      const fields = [...new Set([...defSection.fields, ...(draftSection?.fields ?? [])])];
      return {
        key: defSection.key,
        label: draftSection?.label ?? defSection.label,
        fields,
      };
    });
  }, [needDraft]);

  const sectionFieldSet = useMemo(() => {
    if (!intakeDisplaySections.length) return null;
    const set = new Set<string>();
    for (const section of intakeDisplaySections) {
      for (const field of section.fields) set.add(field);
    }
    return set;
  }, [intakeDisplaySections]);

  const locationSectionFieldsSig =
    needDraft?.sections?.find((s) => s.key === 'location')?.fields.join(',') ?? '';

  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    const locationSection = needDraft.sections.find((s) => s.key === 'location');
    if (!locationSection || locationSection.fields.includes('neighborhood')) return;
    setNeedDraft(recomputeNeedDraft(needDraft));
  }, [step, locationSectionFieldsSig, needDraft, setNeedDraft]);

  const showField = (field: string): boolean => {
    if (!sectionFieldSet) return true;
    return sectionFieldSet.has(field);
  };

  const isIntakeFieldFilled = (field: string): boolean => {
    const entities = needDraft ? recordToEntities(needDraft.entities) : null;
    switch (field) {
      case 'category':
        return Boolean(selectedCategory) || Boolean(entities?.categorySlug);
      case 'subcategory':
        return Boolean(selectedSubcategory) || Boolean(entities?.subcategorySlug);
      case 'city':
        return Boolean(selectedCity.trim()) || Boolean(entities?.city?.trim());
      case 'neighborhood':
        return (
          Boolean(selectedNeighborhood.trim()) ||
          Boolean(entities?.neighborhood?.trim()) ||
          Boolean(entities?.neighborhoodSlug?.trim())
        );
      case 'budget':
        return entities ? hasEntityValue(entities, 'budget') : false;
      case 'transactionType':
        return entities ? hasEntityValue(entities, 'transactionType') : false;
      case 'area':
        return entities ? hasEntityValue(entities, 'area') : false;
      case 'rooms':
        return entities ? hasEntityValue(entities, 'rooms') : false;
      default:
        return false;
    }
  };

  const isSectionFilled = (section: IntakeSectionDef): boolean =>
    section.fields.some((field) => isIntakeFieldFilled(field));

  const intakeSectionKeysSig =
    needDraft?.sections?.map((s) => s.key).join('|') ?? '';

  useEffect(() => {
    if (!needDraft?.sections?.length || step !== 'location') return;
    const validKeys = new Set(needDraft.sections.map((s) => s.key));
    setEnabledSections((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        if (validKeys.has(key)) next.add(key);
      }
      for (const section of needDraft.sections) {
        if (MANDATORY_INTAKE_SECTION_KEYS.has(section.key)) {
          next.add(section.key);
        }
      }
      return sectionKeysEqual(prev, next) ? prev : next;
    });
  }, [intakeSectionKeysSig, step]);

  const transactionTypeOptions: { value: TransactionType; label: string }[] = [
    { value: 'RENT', label: 'اجاره' },
    { value: 'BUY', label: 'خرید' },
    { value: 'FULL_DEPOSIT', label: 'رهن کامل' },
    { value: 'DEPOSIT_AND_RENT', label: 'رهن و اجاره' },
  ];

  const renderIntakeField = (field: string) => {
    if (!showField(field)) return null;

    if (field === 'category') {
      return (
        <div key={field} className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium">دسته‌بندی</label>
          <IntakeCategoryMegaMenuPicker
            value={selectedLeafCategorySlug}
            onChange={applyCategoryFromMegaMenu}
          />
        </div>
      );
    }

    if (field === 'subcategory') {
      return null;
    }

    if (field === 'city') {
      return (
        <div key={field} className="min-w-0 space-y-2">
          <label className="intake-field-label text-sm font-medium">شهر</label>
          <IntakeCityPicker cityName={selectedCity} onCityChange={applyCityRecord} />
        </div>
      );
    }

    if (field === 'neighborhood') {
      return (
        <div key={field} className="min-w-0 space-y-2">
          <label className="intake-field-label text-sm font-medium">محله / محدوده</label>
          <IntakeNeighborhoodPicker
            cityName={selectedCity}
            value={selectedNeighborhood}
            neighborhoods={neighborhoodOptions}
            isLoading={neighborhoodsLoading}
            disabled={!selectedCity.trim()}
            onChange={(name, id, opts) => applyNeighborhood(name, id, opts)}
            autoOpenWhenEmpty={promptNeighborhoodPick}
            onAutoOpenHandled={() => setPromptNeighborhoodPick(false)}
          />
        </div>
      );
    }

    if (field === 'budget') {
      const entities = needDraft ? recordToEntities(needDraft.entities) : null;
      return (
        <div key={field} className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium">بودجه (تومان)</label>
          <PriceInput
            value={entities?.budgetMax ?? entities?.budgetMin ?? undefined}
            onChange={(v) => {
              const amount = v === '' ? null : v;
              patchNeedDraftEntities({
                budgetMax: amount,
                budgetMin: amount,
              });
            }}
            placeholder="مثلاً ۱۰۰۰۰۰۰۰"
          />
        </div>
      );
    }

    if (field === 'transactionType') {
      const entities = needDraft ? recordToEntities(needDraft.entities) : null;
      return (
        <div key={field} className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium">نوع معامله</label>
          <select
            className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            value={entities?.transactionType ?? ''}
            onChange={(e) => {
              const value = e.target.value as TransactionType;
              patchNeedDraftEntities({
                transactionType: value || null,
              });
            }}
          >
            <option value="">انتخاب نوع معامله</option>
            {transactionTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field === 'area') {
      const entities = needDraft ? recordToEntities(needDraft.entities) : null;
      return (
        <div key={field} className="space-y-2">
          <label className="text-sm font-medium">متراژ (متر)</label>
          <PersianDigitInput
            variant="plain"
            className="h-11"
            value={entities?.area != null ? String(entities.area) : ''}
            onChange={(digits) => {
              const n = digits ? Number(digits) : null;
              patchNeedDraftEntities({ area: Number.isFinite(n) ? n : null });
            }}
            placeholder={toPersianDigits('120')}
          />
        </div>
      );
    }

    if (field === 'rooms') {
      const entities = needDraft ? recordToEntities(needDraft.entities) : null;
      return (
        <div key={field} className="space-y-2">
          <label className="text-sm font-medium">تعداد خواب</label>
          <PersianDigitInput
            variant="plain"
            className="h-11"
            value={entities?.rooms != null ? String(entities.rooms) : ''}
            onChange={(digits) => {
              const n = digits ? Number(digits) : null;
              patchNeedDraftEntities({ rooms: Number.isFinite(n) ? n : null });
            }}
            placeholder={toPersianDigits('2')}
          />
        </div>
      );
    }

    if (field === 'description') {
      const desc =
        typeof needDraft?.answers?.description === 'string'
          ? needDraft.answers.description
          : detailsText;
      return (
        <div key={field} className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium">شرح نیاز</label>
          <Textarea
            value={desc}
            onChange={(e) => patchIntakeAnswer('description', e.target.value)}
            placeholder="جزئیات خدمت یا نیاز را بنویسید…"
            className="min-h-[100px] text-sm sm:text-base leading-7"
          />
        </div>
      );
    }

    return null;
  };

  const renderMapPinPicker = () => {
    if (!showField('city') && !showField('neighborhood')) return null;
    if (!selectedCity.trim()) return null;
    const entities = needDraft ? recordToEntities(needDraft.entities) : null;
    return (
      <NeedMapPinPicker
        city={selectedCity}
        categorySlug={selectedLeafCategorySlug || entities?.categorySlug}
        lat={entities?.lat ?? null}
        lng={entities?.lng ?? null}
        onChange={(coords) => {
          patchNeedDraftEntities({
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
          });
        }}
      />
    );
  };

  const renderLocationFieldsRow = () => {
    const showCity = showField('city');
    const showNeighborhood = showField('neighborhood');
    if (!showCity && !showNeighborhood) return null;

    return (
      <div className="intake-location-row flex flex-col gap-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          {showCity ? renderIntakeField('city') : null}
          {showNeighborhood ? renderIntakeField('neighborhood') : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 gap-1.5 px-3 text-sm"
            disabled={myLocationLoading}
            onClick={() => void applyMyLocation()}
          >
            {myLocationLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MapPinned className="size-4 shrink-0 text-primary" aria-hidden />
            )}
            مکان من
          </Button>
        </div>
        {neighborhoodDisambiguationChips.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              محله دقیق مشخص نیست — یکی از گزینه‌های زیر را انتخاب کنید:
            </p>
            <SuggestionChips
              options={neighborhoodDisambiguationChips}
              onSelect={(v) => {
                const value = typeof v === 'string' ? v : v[0] ?? '';
                if (!value.startsWith('neighborhood:')) return;
                const slug = value.slice('neighborhood:'.length);
                const hit = needDraft?.parsedIntent.neighborhoodCandidates?.find(
                  (n) => n.slug === slug
                );
                const label = (hit?.label ?? slug).trim();
                if (label) applyNeighborhood(label, slug);
              }}
            />
          </div>
        ) : null}
        {renderMapPinPicker()}
      </div>
    );
  };

  const renderSectionFields = (section: IntakeSectionDef) => {
    const fields = section.fields.filter((f) => {
      if (!showField(f) || f === 'subcategory') return false;
      return true;
    });
    const isLocationSection = section.fields.includes('city') || section.fields.includes('neighborhood');
    const hasLocationRow =
      isLocationSection && fields.some((f) => f === 'city' || f === 'neighborhood');
    const otherFields = hasLocationRow
      ? fields.filter((f) => f !== 'city' && f !== 'neighborhood')
      : fields;
    const showCategorySuggestions = section.fields.includes('category');

    return (
      <div className="intake-section-fields flex flex-col gap-3">
        {showCategorySuggestions && categorySuggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shapes className="size-3.5" />
                دسته‌بندی‌های پیشنهادی (حداکثر ۳)
              </p>
              <SuggestionChips
                value={selectedLeafCategorySlug}
                options={categorySuggestions.map((slug) => {
                  const path = getCategoryBySlug(slug);
                  const parentSlug = path?.parentSlug;
                  const parent = parentSlug ? getCategoryBySlug(parentSlug) : null;
                  const label =
                    parent && path && parent.slug !== path.slug
                      ? `${parent.title} · ${path.title}`
                      : (path?.title ?? slug);
                  return { value: slug, label };
                })}
                onSelect={(v) =>
                  applyCategorySlug(typeof v === 'string' ? v : v[0] ?? '', { userInitiated: true })
                }
              />
            </div>
          ) : null}

        {hasLocationRow ? renderLocationFieldsRow() : null}
        {isLocationSection && !hasLocationRow ? renderMapPinPicker() : null}

        {otherFields.length > 0 ? (
          <div className="intake-section-fields-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherFields.map((field) => renderIntakeField(field))}
          </div>
        ) : null}

        {isLocationSection && locationSuggestionChips.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3.5" />
              پیشنهادهای مکان
            </p>
            <SuggestionChips
              options={locationSuggestionChips}
              onSelect={(v) => {
                const value = typeof v === 'string' ? v : v[0] ?? '';
                if (!value) return;
                if (value.startsWith('city:')) applyCity(value.slice('city:'.length));
                else if (value.startsWith('area:')) {
                  const area = value.slice('area:'.length).trim();
                  if (area === selectedNeighborhood.trim()) return;
                  applyNeighborhood(area);
                } else if (value.startsWith('neighborhood:')) {
                  const slug = value.slice('neighborhood:'.length);
                  const hit = needDraft?.parsedIntent.neighborhoodCandidates?.find(
                    (n) => n.slug === slug
                  );
                  const label = (hit?.label ?? slug).trim();
                  if (label === selectedNeighborhood.trim()) return;
                  applyNeighborhood(label);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {step === 'done' && publishRedirect ? (
        <PublishSuccessOverlay
          message={publishSuccessCopy.message}
          subtitle={publishSuccessCopy.subtitle}
        />
      ) : null}
    <div className="intake-flow intake-flow--compact layout-golden-split layout-golden-split--intake overflow-guard">
      <div className="layout-golden-main flex min-h-0 flex-1 flex-col min-w-0">
        <header className="intake-hero-card">
          <div className="intake-hero-card__meta">
            <Badge variant="outline" className="gap-1.5 text-caption shrink-0 px-2.5 py-1">
              <Sparkles className="size-3.5" />
              ثبت نیاز مرحله‌ای
            </Badge>
            <span className="text-xs tabular-nums text-muted-foreground">
              مرحله {Math.min(activeStepIndex + 1, steps.length)} از {steps.length}
            </span>
          </div>
          <p className="intake-hero-card__subtitle">
            {steps[Math.min(activeStepIndex, steps.length - 1)]?.subtitle}
          </p>
          <IntakeStepTimeline step={step} progressPercent={progress} onStepSelect={setStep} />
        </header>

        <div className="intake-steps-stack">
          {step === 'need' && (
            <section className="intake-form-card">
              <div className="intake-form-card__head">
                <h2 className="intake-form-card__title">مرحله ۱: نیاز</h2>
                <p className="intake-form-card__desc">
                  جمله اصلی‌تان را کوتاه و واضح بنویسید؛ مثل چیزی که در ذهن‌تان می‌گویید.
                </p>
              </div>
              <Textarea
                value={needText}
                onChange={(e) => setNeedText(e.target.value)}
                placeholder="مثلاً: یک آپارتمان در فرامرز عباسی میخوام"
                className="intake-textarea min-h-24 text-sm leading-6 sm:min-h-28 sm:text-base sm:leading-7"
              />
              <div className="intake-hint-row flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>هرچه دقیق‌تر بنویسید، فرم بعدی سریع‌تر کامل می‌شود.</span>
                <span>{needText.trim().length} کاراکتر</span>
              </div>
              <Button className="w-full sm:w-auto" onClick={goToDetails} disabled={isLoading || !needText.trim()}>
                ادامه به توضیحات
              </Button>
            </section>
          )}

          {step === 'details' && (
            <section className="intake-form-card">
              <div className="intake-form-card__head">
                <h2 className="intake-form-card__title">مرحله ۲: توضیحات</h2>
                <p className="intake-form-card__desc">
                  محدودیت بودجه، شرایط خاص، و اولویت‌ها را بنویسید. اگر در مرحله قبل متن کامل نوشتید، می‌توانید
                  مستقیم ادامه دهید.
                </p>
              </div>
              <Textarea
                value={detailsText}
                onChange={(e) => setDetailsText(e.target.value)}
                placeholder="مثلاً: صاحب‌خانه حیوان خانگی بپذیرد، رهن کم و اجاره بیشتر..."
                className="intake-textarea intake-textarea--details min-h-24 text-sm leading-6 sm:min-h-32 sm:text-base sm:leading-7"
              />
              <div className="intake-hint-row flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Info className="size-3.5" />
                مثال: «۱۰ میلیارد بودجه دارم»، «دو خواب و نورگیر مهم است»، «دسترسی مترو».
              </div>
              {liveListingCopy ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    پیش‌نمایش زندهٔ عنوان
                    {liveListingCopy.streaming ? (
                      <Loader2 className="size-3 animate-spin text-primary" aria-hidden />
                    ) : null}
                  </div>
                  <p className="font-medium leading-snug">{liveListingCopy.title || '—'}</p>
                  {liveListingCopy.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {liveListingCopy.description}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="intake-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => setStep('need')}>
                  <ArrowRight className="size-4 ml-1" />
                  بازگشت
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={goToLocation}
                  disabled={!canProceedToIntakeLocation(needText, detailsText)}
                >
                  ادامه به دسته و مکان
                </Button>
              </div>
            </section>
          )}

          {step === 'location' && (
            <section className="intake-form-card">
              <div className="intake-form-card__head">
                <h2 className="intake-form-card__title">مرحله ۳: دسته‌بندی، شهر و محله</h2>
                <p className="intake-form-card__desc">
                  پیشنهادها را انتخاب کنید یا مقادیر دلخواه را دستی وارد کنید.
                </p>
              </div>

              {null /* AI shard bar removed — manual wizard */}

              {intakeDisplaySections.length ? (
                <IntakeSectionMenus
                  className="intake-section-menus"
                  sections={intakeDisplaySections}
                  enabledKeys={enabledSections}
                  mandatoryKeys={MANDATORY_INTAKE_SECTION_KEYS}
                  onEnabledKeysChange={setEnabledSections}
                  isSectionFilled={isSectionFilled}
                  renderSectionFields={renderSectionFields}
                />
              ) : (
                <div className="space-y-3">
                  {renderLocationFieldsRow()}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      'category',
                      'subcategory',
                      'budget',
                      'transactionType',
                      'area',
                      'rooms',
                    ]
                      .filter(showField)
                      .map((field) => renderIntakeField(field))}
                  </div>
                </div>
              )}

              {selectedLeafCategorySlug ? (
                <IntakeCategoryFilterFields
                  categorySlug={selectedLeafCategorySlug}
                  needDraft={needDraft}
                  onPatchAnswer={patchIntakeAnswer}
                />
              ) : null}

              {liveListingCopy ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    پیش‌نمایش زندهٔ عنوان
                    {liveListingCopy.streaming ? (
                      <Loader2 className="size-3 animate-spin text-primary" aria-hidden />
                    ) : null}
                  </div>
                  <p className="font-medium leading-snug">{liveListingCopy.title || '—'}</p>
                  {liveListingCopy.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {liveListingCopy.description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="intake-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => setStep('details')}>
                  <ArrowRight className="size-4 ml-1" />
                  بازگشت
                </Button>
                <Button className="w-full sm:w-auto" onClick={goToPreview}>
                  {needDraft?.completionState === 'READY_TO_PUBLISH'
                    ? 'ادامه به پیش‌نمایش'
                    : 'تکمیل اطلاعات و ادامه'}
                </Button>
              </div>
            </section>
          )}

          {step === 'preview' && listingPreview && (
            <NeedListingPreview
              preview={listingPreview}
              onChange={setListingPreview}
              onRepolish={() => void repolishPreview()}
              onPublish={() => void publish()}
              isLoading={isLoading}
              isRepublishing={isRepublishing}
              isTitleEnriching={titleEnriching}
              isDescEnriching={descEnriching}
              publishDisabled={!canPublish}
            />
          )}

          {error && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
      <aside className="layout-golden-aside hidden lg:block">
        <div className="intake-aside-card sticky-below-header">
          <h3 className="intake-aside-card__title">خلاصه زنده</h3>
          <p className="intake-aside-card__hint">این بخش با هر تغییر شما به‌روز می‌شود.</p>
          <p className="intake-aside-card__body">
            {liveSummary || 'پس از تکمیل مرحله‌ها، خلاصه نمایش داده می‌شود.'}
          </p>
        </div>
      </aside>
    </div>
    </>
  );
}
