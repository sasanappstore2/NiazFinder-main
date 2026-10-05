'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NeedListingPreview } from './NeedListingPreview';
import type { IntakeAiShardKey, IntakeAiShardStatus } from './IntakeAiShardBar';
import {
  shardStatusFromNeedDraft,
} from './intake-shard-status';
import { IntakeStepTimeline } from './IntakeStepTimeline';
import { PublishSuccessOverlay } from './PublishSuccessOverlay';
import { IntakeStepShell } from './IntakeStepShell';
import { IntakeComposerTextarea } from './IntakeComposerTextarea';
import { PostNaturalAnalysisCard } from './PostNaturalAnalysisCard';
import { IntakeLiveSummaryAside } from './IntakeLiveSummaryAside';
import { IntakeMobileSummarySheet } from './IntakeMobileSummarySheet';
import { IntakePublishingOverlay } from './IntakePublishingOverlay';
import { intakePrimaryCta } from './intake-ui-tokens';
import { INTAKE_COPY } from './intake-copy';
import { cn } from '@/lib/utils';
import type { IntakeWizardGuardContext } from '@/lib/need-intake/intake-wizard-guards';
import { isIntakeComposeStep } from '@/lib/need-intake/intake-wizard-steps';
import { resolveHomeSeedLandingStep } from '@/lib/need-intake/home-post-seamless';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { getLeadPhone, setLeadPhone as persistLeadPhone } from '@/lib/lead-draft';
import { buildSummary } from '@/lib/need-intake/question-engine';
import { useIntakeFormProjection } from '@/hooks/use-intake-form-projection';
import { useIntakeAnalyze } from '@/hooks/use-intake-analyze';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import {
  generateSmartDescription,
  generateSmartTitle,
} from '@/lib/need-intake/smart/utils/title-generator';
import { validateNeedDraftForPublish, getPublishReadiness } from '@/intake/validation/publishValidator';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { buildParsedIntentFromForm, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import { resolveRequiredFields } from '@/intake/template/required-field-resolver';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';
import {
  resolveIntakeCitySelectValue,
  resolveManagedCityForNeighborhoods,
} from '@/lib/need-intake/sync-intake-location-form';
import { getCategoryBySlug, normalizeCategoryPair } from '@/config/categories';
import { citySlugToPersianName, locationCityIdToSlug } from '@/lib/search/city-slugs';
import { scopeFromCookie } from '@/lib/search/location-scope';
import { IntakeTemplateForm } from '@/intake/rendering/IntakeTemplateForm';
import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';
import {
  computeEnabledSectionsForLocation,
  useIntakeDraft,
} from '@/hooks/use-intake-draft';
import { useIntakeLocation } from '@/hooks/use-intake-location';
import { useIntakePublish } from '@/hooks/use-intake-publish';
import { usePostNaturalAnalysis } from '@/hooks/use-post-natural-analysis';
import type {
  PostNaturalAnalyzeResponse,
  PostNaturalField,
} from '@/lib/need-intake/si/post-natural-contract';
import { createIntakePublishSnapshot } from '@/lib/need-intake/publish-snapshot';
import { usePostIntakeTelemetry } from '@/hooks/use-post-intake-telemetry';
import { trackValidationError } from '@/intake/telemetry/postIntakeTelemetry';

interface NeedIntakePanelProps {
  initialSeed?: string;
  initialCategory?: string | null;
  initialCity?: string | null;
  initialPhone?: string | null;
}

export function NeedIntakePanel({
  initialSeed = '',
  initialCategory = null,
  initialCity = null,
  initialPhone = null,
}: NeedIntakePanelProps) {
  const searchParams = useSearchParams();
  const [linkToBusinessProfile, setLinkToBusinessProfile] = useState(
    () =>
      searchParams.get('linkBusiness') === '1' || searchParams.get('as') === 'company'
  );

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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [locationScopeNotice, setLocationScopeNotice] = useState('');
  const [aiEnriching, setAiEnriching] = useState(false);
  const [aiShardStatus, setAiShardStatus] = useState<
    Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>>
  >({});
  const [titleEnriching, setTitleEnriching] = useState(false);
  const [descEnriching, setDescEnriching] = useState(false);
  const [liveSummary, setLiveSummary] = useState('');
  /** Fields the user manually edited — soft-fill must not overwrite (Batch 7). */
  const userOverriddenFieldsRef = useRef(new Set<string>());
  const softFillActiveRef = useRef(false);
  const sourceCoreRef = useRef('');

  const RENT_SCHEMA_FIELDS = ['monthlyRent', 'deposit', 'rahnAmount'] as const;

  const markUserFieldOverride = useCallback((fieldKey: string) => {
    if (softFillActiveRef.current) return;
    userOverriddenFieldsRef.current.add(fieldKey);
  }, []);

  const pruneOverridesForSchema = useCallback((txType: string | null | undefined) => {
    const isBuy = txType === 'BUY' || txType === 'SELL';
    const isRent =
      txType === 'RENT' ||
      txType === 'DEPOSIT_AND_RENT' ||
      txType === 'FULL_DEPOSIT';
    if (isBuy) {
      for (const key of RENT_SCHEMA_FIELDS) {
        userOverriddenFieldsRef.current.delete(key);
      }
    } else if (isRent) {
      userOverriddenFieldsRef.current.delete('budget');
      userOverriddenFieldsRef.current.delete('budgetMin');
      userOverriddenFieldsRef.current.delete('budgetMax');
    }
  }, []);

  const location = useIntakeLocation({
    initialCity,
    needDraft,
    step,
    patchNeedDraftEntities,
    setNeedDraft,
  });

  const locationContext = useMemo(
    () => ({
      onCityChange: location.applyCityRecord,
      onNeighborhoodChange: location.applyNeighborhood,
      onMapPinChange: (coords: { lat: number; lng: number } | null) => {
        patchNeedDraftEntities({
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        });
      },
      onMyLocation: () => void location.applyMyLocation(),
      onPromptNeighborhoodHandled: () => location.setPromptNeighborhoodPick(false),
      neighborhoodOptions: location.neighborhoods,
      neighborhoodsLoading: location.neighborhoodsLoading,
      promptNeighborhoodPick: location.promptNeighborhoodPick,
      myLocationLoading: location.myLocationLoading,
      neighborhoodDisambiguationChips: location.neighborhoodDisambiguationChips,
      locationSuggestionChips: location.locationSuggestionChips,
      onLocationSuggestionSelect: location.handleLocationSuggestion,
    }),
    [location, patchNeedDraftEntities]
  );

  const draft = useIntakeDraft({
    needText,
    detailsText,
    needDraft,
    step,
    selectedCategory,
    selectedSubcategory,
    selectedCity: location.selectedCity,
    selectedNeighborhood: location.selectedNeighborhood,
    getDraft,
    setNeedDraft,
    patchNeedDraftEntities,
    onCategoryChange: (category, subcategory) => {
      setSelectedCategory(category);
      setSelectedSubcategory(subcategory);
    },
    locationContext,
  });

  const patchIntakeFieldFromUser = useCallback(
    (key: string, value: string | number | string[]) => {
      markUserFieldOverride(key);
      draft.patchIntakeField(key, value);
    },
    [draft.patchIntakeField, markUserFieldOverride]
  );

  useEffect(() => {
    const core = composeIntakeSourceText(needText, detailsText).replace(/\s+/g, ' ').trim();
    if (core !== sourceCoreRef.current) {
      sourceCoreRef.current = core;
      userOverriddenFieldsRef.current.clear();
    }
  }, [needText, detailsText]);

  usePostIntakeTelemetry({
    step,
    templateId: draft.intakeTemplate.id,
    categorySlug: draft.selectedLeafCategorySlug,
    needDraft,
  });

  const formFields = useMemo(
    () => ({
      needText,
      detailsText,
      categorySlug: selectedCategory,
      subcategorySlug: selectedSubcategory,
      city: location.selectedCity,
      neighborhood: location.selectedNeighborhood,
      neighborhoodSlug: location.resolvedNeighborhoodSlug,
    }),
    [
      needText,
      detailsText,
      selectedCategory,
      selectedSubcategory,
      location.selectedCity,
      location.selectedNeighborhood,
      location.resolvedNeighborhoodSlug,
    ]
  );

  const setFormFields = useCallback(
    (patch: Partial<typeof formFields>) => {
      if (patch.needText != null) setNeedText(patch.needText);
      if (patch.detailsText != null) setDetailsText(patch.detailsText);
      if (patch.categorySlug != null) setSelectedCategory(patch.categorySlug);
      if (patch.subcategorySlug != null) setSelectedSubcategory(patch.subcategorySlug);
      if (patch.city != null) location.setSelectedCity(patch.city);
      if (patch.neighborhood != null) location.setSelectedNeighborhood(patch.neighborhood);
    },
    [location]
  );

  const publishState = useIntakePublish({
    needDraft,
    listingPreview,
    isLoading,
    titleEnriching,
    descEnriching,
    linkToBusinessProfile,
    getDraft,
    setStep,
    setLoading,
    setError,
    setListingPreview,
    setNeedDraft,
    syncNeedDraftFromFormFields,
    formFields,
    setFormFields,
    setLinkToBusinessProfile,
  });

  const steps: Array<{
    key: 'compose' | 'location' | 'preview';
    title: string;
    subtitle: string;
  }> = [
    { key: 'compose', title: INTAKE_COPY.stepComposeTitle, subtitle: 'چه چیزی می‌خواهید؟' },
    { key: 'location', title: INTAKE_COPY.stepFormTitle, subtitle: 'دسته، مکان و بودجه را تایید کنید' },
    { key: 'preview', title: INTAKE_COPY.stepPreviewTitle, subtitle: 'بازبینی نهایی قبل از ثبت' },
  ];
  const activeStepIndex = Math.max(
    0,
    steps.findIndex((s) =>
      s.key === 'compose' ? isIntakeComposeStep(step) : s.key === step
    )
  );
  const progress = ((activeStepIndex + 1) / steps.length) * 100;
  const stepTitleRef = useRef<HTMLHeadingElement | null>(null);
  const homeSeedHighlight = Boolean(initialSeed.trim()) && isIntakeComposeStep(step);
  const [showMoreDetails, setShowMoreDetails] = useState(() => Boolean(detailsText.trim()));
  const analysisMode = 'rules' as const;

  const wizardGuardContext = useMemo<IntakeWizardGuardContext>(
    () => ({
      currentStep: step,
      needText,
      detailsText,
      needDraft,
      selectedCategory,
      selectedSubcategory,
      selectedCity: location.selectedCity,
    }),
    [
      step,
      needText,
      detailsText,
      needDraft,
      selectedCategory,
      selectedSubcategory,
      location.selectedCity,
    ]
  );

  const previewCategoryLabel =
    selectedSubcategory || selectedCategory || initialCategory?.trim() || '';
  const previewCityLabel = location.selectedCity.trim() || initialCity?.trim() || '';

  useEffect(() => {
    if (step === 'done' || step === 'publishing') return;
    const id = window.requestAnimationFrame(() => {
      stepTitleRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [step]);

  const intakeAnalyzeCityHint = useMemo(() => {
    // RFC-0004: analyze scope only from URL city or explicit user lock — never auto-fill.
    const locked = location.cityLockedByUser;
    const urlCity = initialCity?.trim() || '';
    if (!locked && !urlCity) {
      return { cityName: undefined, citySlug: undefined };
    }
    const nameSource = locked ? location.selectedCity.trim() || urlCity : urlCity;
    const resolvedName =
      resolveIntakeCitySelectValue(location.sortedCities, {
        cityName: nameSource,
        citySlug: urlCity || undefined,
      }) ?? nameSource;
    const meta = resolvedName
      ? resolveManagedCityForNeighborhoods(location.sortedCities, resolvedName)
      : null;
    const citySlug =
      (locked && meta ? locationCityIdToSlug(meta.id) : '') ||
      urlCity ||
      (meta ? locationCityIdToSlug(meta.id) : '') ||
      undefined;
    return {
      cityName: resolvedName || undefined,
      citySlug: citySlug || undefined,
    };
  }, [
    location.cityLockedByUser,
    location.selectedCity,
    location.sortedCities,
    initialCity,
  ]);

  const { projectedDraft } = useIntakeFormProjection({
    needText,
    detailsText,
    selectedCategory,
    selectedSubcategory,
    selectedCity: location.selectedCity,
    selectedNeighborhood: location.selectedNeighborhood,
    resolvedNeighborhoodSlug: location.resolvedNeighborhoodSlug,
    step,
    projectNeedDraftFromFormFields,
  });

  const composedSourceText = useMemo(
    () => composeIntakeSourceText(needText, detailsText),
    [needText, detailsText]
  );

  // A text edit invalidates manual overrides of text-extracted fields: the
  // deal the user confirmed belonged to the previous sentence. Without this,
  // stale locks keep an old deal (رهن کامل) alive while the fresh analysis
  // contradicts it (رهن و اجاره) — tearing the card, summary and form apart.
  // `_userSetDealType` (answers mirror of a manual deal pick) is cleared too.
  useEffect(() => {
    userOverriddenFieldsRef.current.delete('transactionType');
    userOverriddenFieldsRef.current.delete('transaction_type');
    userOverriddenFieldsRef.current.delete('dealType');
    userOverriddenFieldsRef.current.delete('propertyKind');
    const draft = getDraft();
    if (draft?.answers?._userSetDealType === true) {
      const { _userSetDealType: _drop, ...restAnswers } = draft.answers;
      setNeedDraft({ ...draft, answers: restAnswers });
    }
  }, [composedSourceText, getDraft, setNeedDraft]);

  // This page's only inference path is the explicit local-Si action below.
  // Keep the legacy listing helpers on an empty input for deterministic copy.
  const smartResult: SmartExtractionResult | null = null;

  const buildPostNaturalRequest = useCallback(() => {
    const lockedFieldKeys = new Set(userOverriddenFieldsRef.current);
    if (draft.categoryLockedByUserRef.current) {
      lockedFieldKeys.add('categorySlug');
      lockedFieldKeys.add('subcategorySlug');
    }
    if (location.cityLockedByUserRef.current) lockedFieldKeys.add('city');
    if (location.neighborhoodLockedByUserRef.current) lockedFieldKeys.add('neighborhood');
    if (needDraft?.answers?._userSetDealType === true) {
      lockedFieldKeys.add('dealType');
      lockedFieldKeys.add('transactionType');
    }

    return {
      sourceText: composedSourceText,
      draftRevision: needDraft?.draftRevision ?? 0,
      cityName: location.selectedCity.trim() || intakeAnalyzeCityHint.cityName,
      citySlug: intakeAnalyzeCityHint.citySlug,
      categorySlug: selectedCategory || initialCategory?.trim() || undefined,
      subcategorySlug: selectedSubcategory || undefined,
      categoryLockedByUser: draft.categoryLockedByUserRef.current,
      cityLockedByUser: location.cityLockedByUserRef.current,
      neighborhoodLockedByUser: location.neighborhoodLockedByUserRef.current,
      lockedFieldKeys: [...lockedFieldKeys],
      existingFields: {
        entities: needDraft?.entities ?? {},
        answers: needDraft?.answers ?? {},
      },
    };
  }, [
    composedSourceText,
    draft.categoryLockedByUserRef,
    intakeAnalyzeCityHint.cityName,
    location.selectedCity,
    initialCategory,
    needDraft?.answers,
    needDraft?.draftRevision,
    needDraft?.entities,
    selectedCategory,
    selectedSubcategory,
  ]);

  const postNatural = usePostNaturalAnalysis({ buildRequest: buildPostNaturalRequest });

  useEffect(() => {
    postNatural.clear();
  }, [composedSourceText, postNatural.clear]);

  const applyPostNaturalField = useCallback(
    (field: PostNaturalField) => {
      softFillActiveRef.current = true;
      try {
        if (field.key === 'city') {
          location.applyCity(String(field.value ?? ''));
          return;
        }
        if (field.key === 'neighborhood') {
          location.applyNeighborhood(String(field.value ?? ''), null, {
            fromUser: true,
          });
          return;
        }
        if (field.key === 'categorySlug') {
          const slug = String(field.value ?? '').trim();
          if (slug && !draft.categoryLockedByUserRef.current) {
            draft.applyCategorySlug(slug);
          }
          return;
        }
        if (field.key === 'dealType' || field.key === 'transactionType') {
          // Write the canonical entity directly: routing through the answers
          // field sets `_userSetDealType`, which permanently locks the deal
          // against every later analysis (the card/summary/form tear-apart).
          const tx = mapDealTypeToTransaction(String(field.value ?? ''));
          if (tx) patchNeedDraftEntities({ transactionType: tx });
          return;
        }
        if (['area', 'rooms', 'budgetMin', 'budgetMax', 'rahnAmount', 'monthlyRent', 'deposit'].includes(field.key)) {
          patchNeedDraftEntities({ [field.key]: field.value });
          return;
        }
        if (field.key === 'amenities' && Array.isArray(field.value)) {
          draft.patchIntakeField('amenities', field.value.filter((item): item is string => typeof item === 'string'));
          return;
        }
        if (typeof field.value === 'string' || typeof field.value === 'number' || Array.isArray(field.value)) {
          draft.patchIntakeField(field.key, field.value as string | number | string[]);
        }
      } finally {
        softFillActiveRef.current = false;
      }
    },
    [draft, location, patchNeedDraftEntities]
  );

  const applyPostNaturalResult = useCallback(
    (result: PostNaturalAnalyzeResponse) => {
      // The store's entity patch no-ops without a draft, and a fresh hand-off
      // (home → form step) lands with none — materialize the form projection
      // first so patches and location candidates have a carrier.
      const hadDraftAtEntry = Boolean(getDraft());
      if (!hadDraftAtEntry) {
        const fresh = projectNeedDraftFromFormFields(
          {
            needText,
            detailsText,
            categorySlug: draft.categoryLockedByUserRef.current ? selectedCategory : '',
            subcategorySlug: draft.categoryLockedByUserRef.current ? selectedSubcategory : '',
            city: location.selectedCity,
            neighborhood: location.selectedNeighborhood,
            neighborhoodSlug: null,
          },
          { categoryLockedByUser: draft.categoryLockedByUserRef.current }
        );
        if (fresh) setNeedDraft(fresh);
      }
      softFillActiveRef.current = true;
      try {
        const provisional = result.provisionalCategory;
        if (provisional && !provisional.requiresConfirmation && !draft.categoryLockedByUserRef.current) {
          draft.applyCategorySlug(provisional.slug);
        }

        const detectedEntities = result.draftPatch?.entities ?? {};
        const autoFields = result.fields.filter((item) => !item.requiresConfirmation);
        const detectedCity =
          (typeof detectedEntities.city === 'string' && detectedEntities.city) ||
          String(autoFields.find((item) => item.key === 'city')?.value ?? '');
        const detectedNeighborhood =
          (typeof detectedEntities.neighborhood === 'string' && detectedEntities.neighborhood) ||
          String(autoFields.find((item) => item.key === 'neighborhood')?.value ?? '');
        const detectedNeighborhoodSlug =
          typeof detectedEntities.neighborhoodSlug === 'string'
            ? detectedEntities.neighborhoodSlug
            : null;
        const lat = typeof detectedEntities.lat === 'number' ? detectedEntities.lat : null;
        const lng = typeof detectedEntities.lng === 'number' ? detectedEntities.lng : null;

        // Apply city + neighborhood as one canonical location update. The
        // controller preserves a user-locked city, resolves the city catalog,
        // and stores its neighborhood slug/centroid for both the select/map.
        location.applyDetectedLocation({
          cityName: detectedCity || location.selectedCity,
          neighborhoodName: detectedNeighborhood,
          neighborhoodSlug: detectedNeighborhoodSlug,
          coordinates:
            lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
              ? { lat, lng }
              : null,
        });

        if (Object.keys(detectedEntities).length > 0) {
          const nonLocationEntities = Object.fromEntries(
            Object.entries(detectedEntities).filter(
              ([key]) => !['city', 'neighborhood', 'neighborhoodSlug', 'lat', 'lng'].includes(key)
            )
          );
          patchNeedDraftEntities(nonLocationEntities);
        }

        for (const field of autoFields) {
          if (field.key === 'city' || field.key === 'neighborhood') continue;
          applyPostNaturalField(field);
        }

        if (result.draftPatch?.answers) {
          for (const [key, value] of Object.entries(result.draftPatch.answers)) {
            if (key === 'amenities' && Array.isArray(value)) {
              draft.patchIntakeField('amenities', value.filter((item): item is string => typeof item === 'string'));
            } else if (typeof value === 'string' || typeof value === 'number' || Array.isArray(value)) {
              draft.patchIntakeField(key, value as string | number | string[]);
            }
          }
        }

        // Multi-city exact neighborhood matches with no city anywhere to
        // scope by: surface ranked city chips at the location step
        // («پیشنهادهای مکان»). Tapping one locks the city; the existing
        // location-step rescue then resolves the neighborhood inside it.
        // Flags mirror the resolution engine's `city_ambiguous` shape so the
        // draft aggregate preserves the candidates across re-syncs.
        const crossCity = (result.locationCandidates ?? []).filter(
          (candidate) => candidate.city?.trim() && candidate.citySlug?.trim()
        );
        const distinctCities = new Map<string, { cityId: string; label: string }>();
        for (const candidate of crossCity) {
          const cityId = String(candidate.citySlug);
          if (!distinctCities.has(cityId)) {
            distinctCities.set(cityId, { cityId, label: String(candidate.city) });
          }
        }
        if (distinctCities.size >= 2 && !detectedCity) {
          const current = getDraft();
          if (current) {
            const ranked = [...distinctCities.values()];
            setNeedDraft({
              ...current,
              parsedIntent: {
                ...current.parsedIntent,
                cityCandidates: ranked.map((entry, index) => ({
                  cityId: entry.cityId,
                  label: entry.label,
                  score: 100 - index * 10,
                })),
                locationResolutionStatus: 'city_ambiguous',
                rejectLocationAutoConfirm: true,
              },
            });
          }
        }

        // Ambiguous neighborhood inside one city (e.g. «بنفشه» matching
        // several hoods): persist the ranked candidates so the location step
        // surfaces «پیشنهادهای مکان» chips. The fresh response REPLACES the
        // previous set — merging leaked stale candidates from an earlier
        // text/city into the new session (Mashhad chips on a Shiraz need).
        // Candidates scoped to other cities are dropped, and a fresh analysis
        // with no ambiguity clears the stale set.
        const current = getDraft();
        if (current) {
          const parsed = current.parsedIntent;
          const hoodCandidates = (result.locationCandidates ?? []).filter(
            (candidate) => candidate.slug?.trim() && candidate.label?.trim()
          );
          // When the city is user-locked the route omits it from the patch,
          // so detectedCity can be empty — the selected city is the truth.
          // Normalize slug-shaped values («shiraz») to Persian names: the
          // route echoes the request's city form back onto the candidates.
          const referenceCityRaw = detectedCity.trim() || location.selectedCity.trim();
          const referenceCity = citySlugToPersianName(referenceCityRaw) ?? referenceCityRaw;
          const normalizeCityLabel = (value: string): string =>
            citySlugToPersianName(value) ?? value;
          const scopedHoodCandidates = hoodCandidates.filter((candidate) => {
            const candidateCityRaw = candidate.city?.trim() ?? '';
            if (!candidateCityRaw) return true;
            return normalizeCityLabel(candidateCityRaw) === referenceCity;
          });
          const parsedPatch: Partial<NeedDraft['parsedIntent']> = {};
          if (scopedHoodCandidates.length >= 2 && !detectedNeighborhood) {
            parsedPatch.neighborhoodCandidates = scopedHoodCandidates
              .slice(0, 6)
              .map((candidate) => {
                const candidateCityRaw = candidate.city?.trim() ?? '';
                return {
                  slug: String(candidate.slug),
                  label: String(candidate.label),
                  city: candidateCityRaw
                    ? normalizeCityLabel(candidateCityRaw)
                    : referenceCity || undefined,
                };
              });
            parsedPatch.locationResolutionStatus = 'neighborhood_ambiguous';
            parsedPatch.rejectLocationAutoConfirm = true;

            // Auto-fill the محله field with SI's top pick — the ranked chips
            // stay as one-tap alternatives for a different choice. Never
            // overrides a neighborhood the user already picked.
            if (!location.neighborhoodLockedByUserRef.current) {
              const siPick = result.fields.find(
                (field) =>
                  field.key === 'neighborhood' &&
                  field.source === 'si' &&
                  typeof field.value === 'string' &&
                  scopedHoodCandidates.some((candidate) => candidate.label === field.value)
              );
              const topPick = siPick
                ? scopedHoodCandidates.find((candidate) => candidate.label === siPick.value)
                : scopedHoodCandidates[0];
              if (topPick) {
                location.applyNeighborhood(String(topPick.label), String(topPick.slug), {
                  fromUser: false,
                });
              }
            }
          } else if ((parsed.neighborhoodCandidates?.length ?? 0) > 0) {
            parsedPatch.neighborhoodCandidates = [];
          }
          if (referenceCity && (parsed.cityCandidates?.length ?? 0) > 0) {
            parsedPatch.cityCandidates = [];
          }
          if (Object.keys(parsedPatch).length > 0) {
            setNeedDraft({
              ...current,
              parsedIntent: { ...parsed, ...parsedPatch },
            });
          }
        }
      } finally {
        softFillActiveRef.current = false;
      }
    },
    [
      applyPostNaturalField,
      draft,
      getDraft,
      location,
      needText,
      detailsText,
      selectedCategory,
      selectedSubcategory,
      projectNeedDraftFromFormFields,
      patchNeedDraftEntities,
      setNeedDraft,
    ],
  );

  const confirmPostNaturalField = useCallback(
    (field: PostNaturalField) => {
      if (field.key === 'categorySlug') {
        const slug = String(field.value ?? '').trim();
        if (slug) draft.applyCategorySlug(slug, { userInitiated: true });
        return;
      }
      if (field.key === 'city') {
        location.applyCity(String(field.value ?? ''));
        return;
      }
      if (field.key === 'neighborhood') {
        // Multi-city suggestion chips carry their city: lock the city first
        // so the neighborhood resolves inside the right catalog.
        const chipCity = typeof field.city === 'string' ? field.city.trim() : '';
        if (chipCity && chipCity !== location.selectedCity.trim()) {
          location.applyCity(chipCity);
        }
        location.applyNeighborhood(
          String(field.value ?? ''),
          typeof field.slug === 'string' ? field.slug : null,
          { fromUser: true }
        );
        return;
      }
      applyPostNaturalField(field);
    },
    [applyPostNaturalField, draft, location]
  );

  const confirmPostNaturalCategory = useCallback(
    (slug: string) => {
      if (draft.categoryLockedByUserRef.current) return;
      draft.applyCategorySlug(slug, { userInitiated: true });
    },
    [draft]
  );

  const analyzeAndApplyPostNatural = useCallback(async () => {
    const result = await postNatural.analyzeNow();
    if (result) applyPostNaturalResult(result);
  }, [applyPostNaturalResult, postNatural.analyzeNow]);

  // Si live analysis: ~1s after the composed text settles, run the same
  // pipeline as the manual «تکمیل هوشمند فرم» button so the user no longer
  // needs to click it. The ref keeps an unchanged text from re-analyzing
  // when unrelated re-renders recreate the callback.
  const lastAutoAnalyzedTextRef = useRef('');
  const homeFormAnalysisSeedRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 'compose') return;
    const text = composedSourceText.trim();
    if (text.length < 3 || text === lastAutoAnalyzedTextRef.current) return;
    const timer = window.setTimeout(() => {
      lastAutoAnalyzedTextRef.current = text;
      void analyzeAndApplyPostNatural();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [composedSourceText, step, analyzeAndApplyPostNatural]);

  // Seeded home hand-off lands directly on the form step — run the Si
  // pipeline once so fields and location chips populate (same as the
  // compose step's live analysis would).
  useEffect(() => {
    const pendingSeed = homeFormAnalysisSeedRef.current;
    if (step !== 'location' || !pendingSeed) return;
    homeFormAnalysisSeedRef.current = null;
    if (!lastAutoAnalyzedTextRef.current) {
      lastAutoAnalyzedTextRef.current = pendingSeed;
    }
    if (!postNatural.result && !postNatural.analyzing) {
      void analyzeAndApplyPostNatural();
    }
  }, [step, postNatural.result, postNatural.analyzing, analyzeAndApplyPostNatural]);

  const intakeFormContext = useMemo(
    () => {
      const leaf =
        selectedSubcategory ||
        selectedCategory ||
        String(
          (needDraft?.entities as Record<string, unknown> | undefined)?.subcategorySlug ??
            (needDraft?.entities as Record<string, unknown> | undefined)?.categorySlug ??
            ''
        );
      const required = resolveRequiredFields({
        categorySlug: leaf,
        answers: (needDraft?.answers ?? {}) as Record<string, unknown>,
        entities: (needDraft?.entities ?? {}) as Record<string, unknown>,
        fieldConfidence: Object.fromEntries(
          Object.entries(needDraft?.fieldMeta ?? {}).map(([k, v]) => [k, v.confidence])
        ),
      });
      return {
        ...draft.intakeRenderContext,
        onFieldChange: patchIntakeFieldFromUser,
        filterSuggestions: {},
        criticalFieldKeys: new Set(draft.intakeTemplate.criticalFields),
        missingFieldKeys: new Set([
          ...required.missingFieldKeys,
          ...required.lowConfidenceKeys,
        ]),
        onFilterSuggestionSelect: (fieldKey: string, value: string | number | string[]) => {
          const parsed =
            typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
          patchIntakeFieldFromUser(fieldKey, parsed as string | number | string[]);
        },
      };
    },
    [
      draft.intakeRenderContext,
      draft.intakeTemplate.criticalFields,
      patchIntakeFieldFromUser,
      needDraft?.answers,
      needDraft?.entities,
      needDraft?.fieldMeta,
      selectedCategory,
      selectedSubcategory,
    ]
  );

  useEffect(() => {
    setError(null);
  }, [step, setError]);

  useEffect(() => {
    if (!isIntakeComposeStep(step) && step !== 'location') return;
    const draftForShards = needDraft ?? projectedDraft;
    const progressOpts = { needText, detailsText };
    setAiShardStatus(shardStatusFromNeedDraft(draftForShards, false, progressOpts));
  }, [
    step,
    needText,
    detailsText,
    needDraft,
    projectedDraft,
  ]);

  const pendingInitialCityRef = useRef<string | null>(null);

  useEffect(() => {
    // Clear any previously persisted draft/locks before rebuilding this form.
    // Location is initialized below from the URL first, then the site's saved
    // city scope, so the hook's earlier cookie effect cannot be overwritten.
    location.resetLocationLocks();
    reset();
    draft.resetCategoryLocks();
    setSelectedCategory('');
    setSelectedSubcategory('');
    location.setSelectedNeighborhood('');
    const seed = initialSeed.trim();
    setNeedText(seed);
    const urlCity = initialCity?.trim() || '';
    pendingInitialCityRef.current = urlCity || null;
    const savedScope = scopeFromCookie();
    const savedCity =
      savedScope.mode === 'city'
        ? savedScope.cities[0]?.name?.trim() || citySlugToPersianName(savedScope.citySlug) || ''
        : '';
    setLocationScopeNotice(
      urlCity
        ? ''
        : savedScope.mode === 'provinces'
          ? `استان ${savedScope.label} انتخاب شده است؛ برای تشخیص محله، شهر دقیق را از فهرست انتخاب کنید.`
          : savedScope.mode === 'cities'
            ? `${savedScope.cities.length} شهر انتخاب شده است؛ برای ثبت نیاز، یک شهر مشخص را انتخاب کنید.`
            : ''
    );
    const selectedCity = urlCity
      ? citySlugToPersianName(urlCity) ?? urlCity
      : savedCity;
    location.setSelectedCity(selectedCity);
    location.markCityLockedByUser(Boolean(selectedCity));
    const phone = initialPhone?.trim() || getLeadPhone();
    if (phone) setLeadPhone(phone);

    if (seed) {
      setSeedText(seed);
      setShowMoreDetails(false);
    }
    // Home hand-off: a strong seeded need skips the compose step the user
    // already completed on the home page (A/B kill-switch:
    // NEXT_PUBLIC_INTAKE_SKIP_NEED_STEP=false restores compose-first).
    // Plain entries (navbar, mega menu) carry no seed and start at compose.
    const landingStep = resolveHomeSeedLandingStep(seed);
    homeFormAnalysisSeedRef.current = landingStep === 'location' ? seed : null;
    setStep(landingStep);
  }, [
    initialSeed,
    initialCity,
    initialPhone,
    reset,
    setStep,
    setLeadPhone,
    setSeedText,
    location.setSelectedCity,
    location.markCityLockedByUser,
    location.resetLocationLocks,
    draft.resetCategoryLocks,
  ]);

  useEffect(() => {
    // Keep pending URL city as analyze hint via intakeAnalyzeCityHint; do not fill the form.
    pendingInitialCityRef.current = null;
  }, [initialCity, location.sortedCities]);

  // URL category=… is a hint for ranking, not a form lock / auto-select.

  useEffect(() => {
    if (!isIntakeComposeStep(step)) return;

    const timer = window.setTimeout(() => {
      const composed = composeIntakeSourceText(needText, detailsText).trim();
      if (!composed) {
        if (needDraft) setNeedDraft(null);
        return;
      }
      if (needDraft?.sourceText?.trim() === composed) return;
      const fresh = projectNeedDraftFromFormFields(
        {
          needText,
          detailsText,
          categorySlug: draft.categoryLockedByUserRef.current ? selectedCategory : '',
          subcategorySlug: draft.categoryLockedByUserRef.current ? selectedSubcategory : '',
          city: '',
          neighborhood: '',
          neighborhoodSlug: null,
        },
        { categoryLockedByUser: draft.categoryLockedByUserRef.current }
      );
      if (fresh) setNeedDraft(fresh);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    step,
    needText,
    detailsText,
    selectedCategory,
    selectedSubcategory,
    needDraft,
    projectNeedDraftFromFormFields,
    setNeedDraft,
    draft.categoryLockedByUserRef,
  ]);

  useEffect(() => {
    if (!isIntakeComposeStep(step)) return;
    if (!needText.trim()) return;
    if (draft.categoryLockedByUserRef.current) return;
    const timer = window.setTimeout(() => {
      const sourceText = composeIntakeSourceText(needText, detailsText);
      const resolved = resolveIntakeCategory({
        sourceText,
        formCategorySlug: selectedCategory,
        formSubcategorySlug: selectedSubcategory,
        categoryLockedByUser: false,
      });
      if (resolved.source !== 'text' || !resolved.categorySlug) return;
      const normalized = normalizeCategoryPair(resolved.categorySlug, resolved.subcategorySlug);
      const nextLeaf = normalized.subcategorySlug ?? normalized.categorySlug;
      const currentLeaf = selectedSubcategory || selectedCategory;
      if (nextLeaf && nextLeaf !== currentLeaf) {
        draft.applyCategorySlug(nextLeaf);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [step, needText, detailsText, selectedCategory, selectedSubcategory, draft]);

  // A category supplied by the home flow is a scope hint. Apply it so the
  // correct root fields can render, but do not lock it as a confirmed choice.
  useEffect(() => {
    if (!initialCategory?.trim()) return;
    draft.applyInitialCategoryIfNeeded(initialCategory.trim());
  }, [initialCategory, draft.applyInitialCategoryIfNeeded]);

  useEffect(() => {
    if (isIntakeComposeStep(step) || step === 'done' || step === 'publishing') return;
    const timer = window.setTimeout(() => {
      if (!needText.trim()) return;
      syncNeedDraftFromFormFields(formFields, {
        categoryLockedByUser: draft.categoryLockedByUserRef.current,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [step, needText, formFields, syncNeedDraftFromFormFields, draft.categoryLockedByUserRef]);

  useEffect(() => {
    const composed = composeIntakeSourceText(needText, detailsText).trim();
    const d =
      !needDraft ||
      (isIntakeComposeStep(step) && needDraft.sourceText?.trim() !== composed)
        ? projectedDraft
        : needDraft;
    if (!d) {
      setLiveSummary('');
      return;
    }
    // The legacy parsed title can lag behind a catalog-confirmed location.
    // Preview and the live summary must read the same canonical title.
    const title = resolveDeterministicListingTitle(d).title;
    setLiveSummary(buildSummary({ ...d.parsedIntent, title }, d.answers, d.sourceText));
  }, [
    needDraft,
    projectedDraft,
    needText,
    detailsText,
    step,
  ]);

  const buildParsedFromForm = useCallback((): ParsedIntent => {
    const categoryLocked = draft.categoryLockedByUserRef.current;
    const normalized = categoryLocked
      ? normalizeCategoryPair(selectedCategory || initialCategory || '', selectedSubcategory || '')
      : { categorySlug: '', subcategorySlug: undefined as string | undefined };
    return buildParsedIntentFromForm(
      {
        needText,
        detailsText,
        categorySlug: normalized.categorySlug,
        subcategorySlug: normalized.subcategorySlug ?? '',
        city: location.selectedCity,
        neighborhood: location.selectedNeighborhood,
        neighborhoodSlug: location.resolvedNeighborhoodSlug,
      },
      needDraft?.parsedIntent ?? null,
      { categoryLockedByUser: categoryLocked }
    );
  }, [
    needText,
    detailsText,
    selectedCategory,
    selectedSubcategory,
    location.selectedCity,
    location.selectedNeighborhood,
    location.resolvedNeighborhoodSlug,
    initialCategory,
    needDraft?.parsedIntent,
    draft.categoryLockedByUserRef,
  ]);

  const noAnalysisResult = useCallback(async () => null, []);
  const isAnalysisFresh = useCallback(() => false, []);
  const { goToLocation, prefetchLocationAnalyze } = useIntakeAnalyze({
    analysisEnabled: false,
    needText,
    detailsText,
    step,
    selectedCategory,
    selectedSubcategory,
    selectedCity: location.selectedCity,
    selectedNeighborhood: location.selectedNeighborhood,
    resolvedNeighborhoodSlug: location.resolvedNeighborhoodSlug,
    intakeAnalyzeCityHint,
    sortedCities: location.sortedCities,
    buildParsedFromForm,
    setStep,
    setError,
    setSelectedCategory,
    setSelectedSubcategory,
    setSelectedNeighborhood: location.setSelectedNeighborhood,
    setNeedDraft,
    syncNeedDraftFromFormFields,
    setNeedDraftFromAnalysis,
    getDraft,
    patchNeedDraftEntities,
    applyDetectedLocationFromDraft: location.applyDetectedLocationFromDraft,
    computeEnabledSectionsForLocation,
    setEnabledSections: draft.setEnabledSections,
    setAiShardStatus,
    setAiEnriching,
    cityLockedByUserRef: location.cityLockedByUserRef,
    neighborhoodLockedByUserRef: location.neighborhoodLockedByUserRef,
    categoryLockedByUserRef: draft.categoryLockedByUserRef,
    resolveIntakeCitySelectValue,
    isFreshForText: isAnalysisFresh,
    analyzing: false,
    analyzeNow: noAnalysisResult,
    waitForAnalysis: noAnalysisResult,
  });

  const goToForm = async () => {
    if (!needText.trim()) {
      toast.info('ابتدا نیاز خود را بنویسید');
      return;
    }
    if (!canProceedToIntakeLocation(needText, detailsText)) {
      toast.info('یک جمله کامل‌تر بنویسید یا توضیح بیشتری اضافه کنید');
      return;
    }
    setSeedText(needText.trim());
    // Auto-run the explicit local-Si analysis when entering the location
    // step so city/neighborhood resolve without requiring the manual button
    // (unique-city auto-fill; multi-city chips). Guarded: never double-fire
    // when a result is already showing or being computed.
    if (!postNatural.result && !postNatural.analyzing) {
      void analyzeAndApplyPostNatural();
    }
    goToLocation();
  };

  const goToPreview = async () => {
    const draftEntities = needDraft ? recordToEntities(needDraft.entities) : null;
    const categorySlug = selectedCategory || draftEntities?.categorySlug || '';
    const subcategorySlug = selectedSubcategory || draftEntities?.subcategorySlug || '';
    const selectedCategoryMeta = categorySlug ? getCategoryBySlug(categorySlug) : null;
    if (!categorySlug && !subcategorySlug) {
      toast.info('دسته‌بندی را انتخاب کنید');
      return;
    }
    if (selectedCategoryMeta?.depth === 0 && !subcategorySlug) {
      toast.info('لطفاً زیرشاخهٔ دقیق نیاز را انتخاب کنید');
      return;
    }
    const cityValue = location.selectedCity.trim() || draftEntities?.city?.trim() || '';
    if (!cityValue) {
      toast.info('شهر را انتخاب کنید');
      return;
    }
    const synced = syncNeedDraftFromFormFields(formFields, {
      categoryLockedByUser: draft.categoryLockedByUserRef.current,
    });
    if (!synced) {
      toast.error('پیش‌نویس نامعتبر است');
      return;
    }

    const validation = validateNeedDraftForPublish(synced);
    if (!validation.success) {
      for (const err of validation.errors) {
        trackValidationError({
          field: err.field,
          message: err.message,
          source: 'preview_gate',
          step: 'location',
        });
      }
      const msg = validation.errors.map((e) => e.message).join(' · ');
      toast.error(msg || 'برای پیش‌نمایش، فیلدهای الزامی را تکمیل کنید');
      return;
    }

    setError(null);
    const composed = composeListingFromDraft(synced);
    const deterministicTitle = resolveDeterministicListingTitle(synced).title;
    const smartTitle = generateSmartTitle(smartResult);
    const smartDesc = generateSmartDescription(
      smartResult,
      composeIntakeSourceText(needText, detailsText)
    );
    const preview = {
      title: deterministicTitle.trim() || smartTitle || '',
      description: composed.description.trim() || smartDesc || '',
      budgetMin: recordToEntities(synced.entities).budgetMin ?? synced.parsedIntent.budgetMin,
      budgetMax: recordToEntities(synced.entities).budgetMax ?? synced.parsedIntent.budgetMax,
      extras: listingPreview?.extras,
      titleSource: 'template',
    } as const;
    try {
      const draftForPreview = { ...synced, listingPreview: preview };
      const snapshot = await createIntakePublishSnapshot(draftForPreview, preview);
      setNeedDraft({ ...draftForPreview, publishSnapshot: snapshot });
      setListingPreview(preview);
    } catch {
      toast.error('ساخت snapshot پیش‌نمایش انجام نشد؛ دوباره تلاش کنید');
      return;
    }
    setStep('preview');
    setTitleEnriching(false);
    setDescEnriching(false);
  };

  const canGoToPreview =
    Boolean(
      (selectedSubcategory ||
        (selectedCategory && (getCategoryBySlug(selectedCategory)?.depth ?? 0) > 0)) &&
        location.selectedCity.trim()
    );
  const previewDisabledReason =
    (!selectedCategory && !selectedSubcategory) ||
    (Boolean(selectedCategory) && !selectedSubcategory && getCategoryBySlug(selectedCategory)?.depth === 0)
      ? 'دسته‌بندی را انتخاب کنید'
      : !location.selectedCity.trim()
        ? 'شهر را انتخاب کنید'
        : undefined;

  // Soft-apply analyzed category/location onto the form when user reaches location step.
  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    if (draft.enabledSections.size === 0 && needDraft.sections?.length) {
      draft.setEnabledSections(computeEnabledSectionsForLocation(needDraft));
    }
  }, [step, needDraft, draft]);

  const showLiveSummary =
    isIntakeComposeStep(step) || step === 'location' || step === 'preview';
  const stepCount = steps.length;
  const stepOrdinal = Math.min(activeStepIndex + 1, stepCount);

  const panelChrome = (
    <>
      <div className="intake-panel-card__meta">
        <Badge variant="outline" className="gap-1 shrink-0 px-2 py-0.5 text-[10px] sm:text-xs">
          <Sparkles className="size-3" />
          {INTAKE_COPY.stagedBadge}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          {INTAKE_COPY.stepOf(stepOrdinal, stepCount)}
        </span>
        {showLiveSummary ? (
          <div className="ms-auto lg:hidden">
            <IntakeMobileSummarySheet
              summary={liveSummary}
              analysisMode={analysisMode}
              inline
            />
          </div>
        ) : null}
      </div>
      <IntakeStepTimeline
        step={step}
        progressPercent={progress}
        onStepSelect={setStep}
        guardContext={wizardGuardContext}
      />
    </>
  );

  return (
    <>
      {step === 'done' && publishState.publishRedirect ? (
        <PublishSuccessOverlay
          message={publishState.publishSuccessCopy.message}
          subtitle={publishState.publishSuccessCopy.subtitle}
        />
      ) : null}
      {step === 'publishing' ? <IntakePublishingOverlay /> : null}
      <div
        className={cn(
          'intake-flow intake-flow--compact overflow-guard',
          showLiveSummary && 'layout-golden-split layout-golden-split--intake'
        )}
      >
        <div className="layout-golden-main flex min-h-0 flex-1 flex-col min-w-0">
          <div className="intake-steps-stack">
            {isIntakeComposeStep(step) && (
              <IntakeStepShell
                stepNumber={1}
                title={INTAKE_COPY.stepComposeTitle}
                titleRef={stepTitleRef}
                header={panelChrome}
                description={INTAKE_COPY.stepComposeDescription}
                actions={
                  <Button
                    className={`w-full sm:w-auto ${intakePrimaryCta}`}
                    onClick={() => void goToForm()}
                    onMouseEnter={prefetchLocationAnalyze}
                    onFocus={prefetchLocationAnalyze}
                    disabled={isLoading || !canProceedToIntakeLocation(needText, detailsText)}
                  >
                    {INTAKE_COPY.continueToForm}
                  </Button>
                }
              >
                <IntakeComposerTextarea
                  id="intake-need-text"
                  name="needText"
                  value={needText}
                  onChange={setNeedText}
                  placeholder="مثلاً: یک آپارتمان ۸۰ متری در فرامرز عباسی، رهن و اجاره…"
                  showCharCount={false}
                  showFooter={false}
                  highlightFromHome={homeSeedHighlight}
                  disabled={isLoading}
                  analyzing={false}
                  analysisMode={analysisMode}
                />
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setShowMoreDetails((v) => !v)}
                  >
                    {INTAKE_COPY.detailsMoreToggle}
                  </button>
                  {showMoreDetails ? (
                    <IntakeComposerTextarea
                      id="intake-details-text"
                      name="detailsText"
                      value={detailsText}
                      onChange={setDetailsText}
                      placeholder={INTAKE_COPY.detailsMorePlaceholder}
                      disabled={isLoading}
                      analyzing={false}
                      analysisMode={analysisMode}
                      className="mt-2"
                    />
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => void analyzeAndApplyPostNatural()}
                  disabled={isLoading || postNatural.analyzing || composedSourceText.trim().length < 3}
                >
                  <Sparkles className="size-4 me-1.5" />
                  {postNatural.analyzing ? 'در حال تحلیل…' : 'تکمیل هوشمند فرم'}
                </Button>
                {composedSourceText.trim().length >= 3 ? (
                  <PostNaturalAnalysisCard
                    result={postNatural.result}
                    analyzing={postNatural.analyzing}
                    error={postNatural.error}
                    onConfirmField={confirmPostNaturalField}
                    onConfirmCategory={confirmPostNaturalCategory}
                  />
                ) : null}
              </IntakeStepShell>
            )}

            {step === 'location' && (
              <IntakeStepShell
                stepNumber={2}
                title={INTAKE_COPY.stepFormTitle}
                titleRef={stepTitleRef}
                header={panelChrome}
                description={INTAKE_COPY.stepFormDescription}
                actions={
                  <>
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setStep('compose')}
                    >
                      <ArrowRight className="size-4 me-1" />
                      بازگشت
                    </Button>
                    <Button
                      className={`w-full sm:w-auto ${intakePrimaryCta}`}
                      onClick={goToPreview}
                      disabled={!canGoToPreview}
                      title={previewDisabledReason}
                    >
                      {needDraft && getPublishReadiness(needDraft).canPublish
                        ? 'ادامه به پیش‌نمایش'
                        : 'تکمیل اطلاعات و ادامه'}
                    </Button>
                  </>
                }
              >
                {locationScopeNotice && !location.selectedCity.trim() ? (
                  <p
                    role="status"
                    className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground"
                  >
                    {locationScopeNotice}
                  </p>
                ) : null}
                <IntakeTemplateForm
                  template={draft.intakeTemplate}
                  context={intakeFormContext}
                  enabledSections={draft.enabledSections}
                  onEnabledSectionsChange={draft.setEnabledSections}
                />
              </IntakeStepShell>
            )}

            {step === 'preview' && listingPreview && (
              <section className="intake-panel-card">
                <div className="intake-panel-card__chrome">{panelChrome}</div>
                <div className="intake-panel-card__body">
                  <NeedListingPreview
                    preview={listingPreview}
                    onChange={setListingPreview}
                    onRepolish={() => void publishState.repolishPreview()}
                    onPublish={() => void publishState.publish()}
                    isLoading={isLoading}
                    isRepublishing={publishState.isRepublishing}
                    isTitleEnriching={titleEnriching}
                    isDescEnriching={descEnriching}
                    publishDisabled={!publishState.canPublish}
                    categoryLabel={previewCategoryLabel}
                    cityLabel={previewCityLabel}
                    smartResult={smartResult}
                    nested
                  />
                </div>
              </section>
            )}

            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
        {showLiveSummary ? (
          <IntakeLiveSummaryAside summary={liveSummary} analysisMode={analysisMode} />
        ) : null}
      </div>
    </>
  );
}
