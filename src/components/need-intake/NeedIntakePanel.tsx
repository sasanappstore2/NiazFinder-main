'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NeedListingPreview } from './NeedListingPreview';
import type { IntakeAiShardKey, IntakeAiShardStatus } from './IntakeAiShardBar';
import { IntakeAiShardBar } from './IntakeAiShardBar';
import {
  shardStatusFromNeedDraft,
} from './intake-shard-status';
import { buildIntakeProgressSnapshot } from '@/lib/need-intake/intake-progress-tracker';
import { IntakeStepTimeline } from './IntakeStepTimeline';
import { PublishSuccessOverlay } from './PublishSuccessOverlay';
import { IntakeStepShell } from './IntakeStepShell';
import { IntakeComposerTextarea } from './IntakeComposerTextarea';
import { IntakeAiUnderstandingCard } from './IntakeAiUnderstandingCard';
import { IntakeLiveListingSnippet } from './IntakeLiveListingSnippet';
import { IntakeLiveSummaryAside } from './IntakeLiveSummaryAside';
import { IntakeMobileSummarySheet } from './IntakeMobileSummarySheet';
import { IntakePublishingOverlay } from './IntakePublishingOverlay';
import { intakePrimaryCta } from './intake-ui-tokens';
import { INTAKE_COPY } from './intake-copy';
import { cn } from '@/lib/utils';
import type { IntakeWizardGuardContext } from '@/lib/need-intake/intake-wizard-guards';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { getLeadPhone, setLeadPhone as persistLeadPhone } from '@/lib/lead-draft';
import { buildSummary } from '@/lib/need-intake/question-engine';
import { useIntakeFormProjection } from '@/hooks/use-intake-form-projection';
import { useIntakeListingCopy } from '@/hooks/use-intake-listing-copy';
import { useIntakeIntelligence } from '@/hooks/use-intake-intelligence';
import { useIntakeAnalyze } from '@/hooks/use-intake-analyze';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { isAmbiguousCommercialSubtype } from '@/lib/need-intake/business-commercial-property-intent';
import { buildParsedIntentFromForm, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';
import {
  resolveIntakeCitySelectValue,
  resolveManagedCityForNeighborhoods,
} from '@/lib/need-intake/sync-intake-location-form';
import { normalizeCategoryPair } from '@/config/categories';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { IntakeTemplateForm } from '@/intake/rendering/IntakeTemplateForm';
import type { ParsedIntent } from '@/contracts/need-intake';
import {
  computeEnabledSectionsForLocation,
  useIntakeDraft,
} from '@/hooks/use-intake-draft';
import { useIntakeLocation } from '@/hooks/use-intake-location';
import { useIntakePublish } from '@/hooks/use-intake-publish';
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
  const [aiEnriching, setAiEnriching] = useState(false);
  const [aiShardStatus, setAiShardStatus] = useState<
    Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>>
  >({});
  const [titleEnriching, setTitleEnriching] = useState(false);
  const [descEnriching, setDescEnriching] = useState(false);
  const [liveSummary, setLiveSummary] = useState('');

  const location = useIntakeLocation({
    initialCity,
    needDraft,
    step,
    patchNeedDraftEntities,
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
    key: 'need' | 'details' | 'location' | 'preview';
    title: string;
    subtitle: string;
  }> = [
    { key: 'need', title: 'نیاز', subtitle: 'چه چیزی می‌خواهید؟' },
    { key: 'details', title: 'توضیحات', subtitle: 'جزئیات کاربردی را اضافه کنید' },
    { key: 'location', title: 'دسته و مکان', subtitle: 'دسته، شهر و محله را تایید کنید' },
    { key: 'preview', title: 'پیش‌نمایش و انتشار', subtitle: 'بازبینی نهایی قبل از ثبت' },
  ];
  const activeStepIndex = Math.max(0, steps.findIndex((s) => s.key === step));
  const progress = ((activeStepIndex + 1) / steps.length) * 100;
  const stepTitleRef = useRef<HTMLHeadingElement | null>(null);
  const homeSeedHighlight = Boolean(initialSeed.trim()) && step === 'details';

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
    const resolvedName =
      resolveIntakeCitySelectValue(location.sortedCities, {
        cityName: location.selectedCity,
        citySlug: initialCity,
      }) ?? location.selectedCity.trim();
    const meta = resolvedName
      ? resolveManagedCityForNeighborhoods(location.sortedCities, resolvedName)
      : null;
    const citySlug =
      initialCity?.trim() ||
      (meta ? locationCityIdToSlug(meta.id) : '') ||
      undefined;
    return {
      cityName: resolvedName || undefined,
      citySlug,
    };
  }, [location.selectedCity, location.sortedCities, initialCity]);

  const { projectedDraft, liveDraftForCopy, liveCopyStreamEnabled } = useIntakeFormProjection({
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

  const intelligenceLiveEnabled =
    Boolean(composedSourceText.trim()) && (step === 'need' || step === 'details');

  const intakeAnalyzeFormHints = useMemo(() => {
    if (!draft.categoryLockedByUser) return undefined;
    return {
      categorySlug: selectedCategory || undefined,
      subcategorySlug: selectedSubcategory || undefined,
      categoryLockedByUser: true as const,
    };
  }, [selectedCategory, selectedSubcategory, draft.categoryLockedByUser]);

  const intakeIntelligence = useIntakeIntelligence({
    text: composedSourceText,
    enabled: intelligenceLiveEnabled,
    citySlug: intakeAnalyzeCityHint.citySlug,
    cityName: intakeAnalyzeCityHint.cityName,
    formHints: intakeAnalyzeFormHints,
    debounceMs: step === 'details' ? 500 : 600,
    forceAi: step === 'need',
    onDraft: (d) => {
      setNeedDraft(d);
      if (!draft.categoryLockedByUserRef.current) {
        const ambiguousCommercial = isAmbiguousCommercialSubtype(composedSourceText);
        const entities = d.entities as Record<string, unknown> | undefined;
        const leaf =
          (typeof entities?.subcategorySlug === 'string' && entities.subcategorySlug) ||
          (typeof entities?.categorySlug === 'string' && entities.categorySlug) ||
          d.parsedIntent?.subcategorySlug ||
          d.parsedIntent?.categorySlug;
        if (leaf && !ambiguousCommercial) {
          draft.applyCategorySlug(leaf);
        }
      }
      if (
        !location.cityLockedByUserRef.current ||
        !location.neighborhoodLockedByUserRef.current
      ) {
        location.applyDetectedLocationFromDraft(d);
      }
    },
  });

  const intakeFormContext = useMemo(
    () => ({
      ...draft.intakeRenderContext,
      filterSuggestions: intakeIntelligence.filterSuggestionChips,
      criticalFieldKeys: new Set(draft.intakeTemplate.criticalFields),
      onFilterSuggestionSelect: (fieldKey: string, value: string | number | string[]) => {
        const parsed =
          typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
        draft.patchIntakeField(fieldKey, parsed as string | number | string[]);
      },
    }),
    [
      draft.intakeRenderContext,
      draft.intakeTemplate.criticalFields,
      draft.patchIntakeField,
      intakeIntelligence.filterSuggestionChips,
    ]
  );

  useEffect(() => {
    setError(null);
  }, [step, setError]);

  useEffect(() => {
    if (step !== 'need' && step !== 'details' && step !== 'location') return;
    const draftForShards = needDraft ?? projectedDraft;
    const progressOpts = { needText, detailsText };
    setAiShardStatus(
      shardStatusFromNeedDraft(draftForShards, intakeIntelligence.analyzing || aiEnriching, progressOpts)
    );
    if (step === 'need' || step === 'details') {
      setAiEnriching(intakeIntelligence.analyzing);
    }
  }, [
    step,
    needText,
    detailsText,
    needDraft,
    projectedDraft,
    intakeIntelligence.analyzing,
    aiEnriching,
  ]);

  const intakeProgressSnapshot = useMemo(
    () =>
      buildIntakeProgressSnapshot(needDraft ?? projectedDraft, {
        enriching: intakeIntelligence.analyzing || aiEnriching,
        needText,
        detailsText,
      }),
    [
      needDraft,
      projectedDraft,
      intakeIntelligence.analyzing,
      aiEnriching,
      needText,
      detailsText,
    ]
  );

  const showAiShardBar = composedSourceText.trim().length >= 3;

  useEffect(() => {
    if (step !== 'details' || !composedSourceText.trim()) return;
    if (intakeIntelligence.isFreshForText(composedSourceText)) return;
    void intakeIntelligence.analyzeNow();
  }, [step, composedSourceText, intakeIntelligence.analyzeNow, intakeIntelligence.isFreshForText]);

  const liveListingCopy = useIntakeListingCopy(liveDraftForCopy, liveCopyStreamEnabled);

  const pendingInitialCityRef = useRef<string | null>(null);

  useEffect(() => {
    reset();
    location.resetLocationLocks();
    draft.resetCategoryLocks();
    setSelectedCategory('');
    setSelectedSubcategory('');
    location.setSelectedNeighborhood('');
    const seed = initialSeed.trim();
    setNeedText(seed);
    if (initialCity?.trim()) {
      pendingInitialCityRef.current = initialCity.trim();
      location.lockCityByUser();
    } else {
      pendingInitialCityRef.current = null;
      location.setSelectedCity('');
    }
    const phone = initialPhone?.trim() || getLeadPhone();
    if (phone) setLeadPhone(phone);

    if (seed) {
      setSeedText(seed);
      setStep('details');
    } else {
      setStep('need');
    }
  }, [
    initialSeed,
    initialCity,
    initialPhone,
    reset,
    setStep,
    setLeadPhone,
    setSeedText,
    location.setSelectedCity,
    location.resetLocationLocks,
    location.lockCityByUser,
    draft.resetCategoryLocks,
  ]);

  useEffect(() => {
    const pending = pendingInitialCityRef.current;
    if (!pending || location.sortedCities.length === 0) return;
    const resolved =
      resolveIntakeCitySelectValue(location.sortedCities, {
        cityName: pending,
        citySlug: pending,
      }) ?? pending;
    location.setSelectedCity(resolved);
    pendingInitialCityRef.current = null;
  }, [initialCity, location.sortedCities, location.setSelectedCity]);

  useEffect(() => {
    if (!initialCategory?.trim()) return;
    draft.applyInitialCategoryIfNeeded(initialCategory.trim());
  }, [initialCategory, draft.applyInitialCategoryIfNeeded]);

  useEffect(() => {
    if (step !== 'need' && step !== 'details') return;

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
    if (step !== 'need' && step !== 'details') return;
    if (!needText.trim()) return;
    if (draft.categoryLockedByUserRef.current) return;
    // Category comes from /api/intake/analyze (rules engine) while typing — avoid local overwrite.
    if (intelligenceLiveEnabled) return;

    const timer = window.setTimeout(() => {
      const sourceText = composeIntakeSourceText(needText, detailsText);
      const resolved = resolveIntakeCategory({
        sourceText,
        formCategorySlug: selectedCategory,
        formSubcategorySlug: selectedSubcategory,
        categoryLockedByUser: false,
      });
      if (resolved.source !== 'text' || !resolved.categorySlug) return;
      if (isAmbiguousCommercialSubtype(sourceText)) return;
      const normalized = normalizeCategoryPair(resolved.categorySlug, resolved.subcategorySlug);
      const nextLeaf = normalized.subcategorySlug ?? normalized.categorySlug;
      const currentLeaf = selectedSubcategory || selectedCategory;
      if (nextLeaf && nextLeaf !== currentLeaf) {
        draft.applyCategorySlug(nextLeaf);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [step, needText, detailsText, selectedCategory, selectedSubcategory, draft, intelligenceLiveEnabled]);

  useEffect(() => {
    if (step === 'need' || step === 'details' || step === 'done' || step === 'publishing') return;
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
    if ((step === 'need' || step === 'details') && intakeIntelligence.intentGist) {
      setLiveSummary(intakeIntelligence.intentGist);
      return;
    }
    let d = needDraft ?? projectedDraft;
    if (step === 'need' || step === 'details') {
      if (projectedDraft) {
        d = projectedDraft;
      } else if (needDraft?.sourceText?.trim() !== composed) {
        d = null;
      }
    }
    if (!d) {
      setLiveSummary('');
      return;
    }
    setLiveSummary(buildSummary(d.parsedIntent, d.answers, d.sourceText));
  }, [
    needDraft,
    projectedDraft,
    needText,
    detailsText,
    step,
    intakeIntelligence.intentGist,
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

  const goToDetails = async () => {
    if (!needText.trim()) {
      toast.info('ابتدا نیاز خود را بنویسید');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await intakeIntelligence.analyzeNow();
      if (!res && needText.trim().length >= 3) {
        toast.warning('تحلیل هوش مصنوعی کامل نشد؛ می‌توانید ادامه دهید');
      }
      setSeedText(needText.trim());
      setStep('details');
    } catch {
      toast.error('خطا در تحلیل نیاز');
    } finally {
      setLoading(false);
    }
  };

  const { goToLocation, prefetchLocationAnalyze } = useIntakeAnalyze({
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
    isFreshForText: intakeIntelligence.isFreshForText,
    analyzing: intakeIntelligence.analyzing,
    analyzeNow: intakeIntelligence.analyzeNow,
    waitForAnalysis: intakeIntelligence.waitForAnalysis,
  });

  const goToPreview = () => {
    const draftEntities = needDraft ? recordToEntities(needDraft.entities) : null;
    const categorySlug = selectedCategory || draftEntities?.categorySlug || '';
    const subcategorySlug = selectedSubcategory || draftEntities?.subcategorySlug || '';
    if (!categorySlug && !subcategorySlug) {
      toast.info('دسته‌بندی را انتخاب کنید');
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
    setListingPreview({
      title: deterministicTitle,
      description: composed.description,
      budgetMin: synced.parsedIntent.budgetMin,
      budgetMax: synced.parsedIntent.budgetMax,
      extras: listingPreview?.extras,
      titleSource: 'template',
    });
    setStep('preview');
    setTitleEnriching(false);
    setDescEnriching(false);
  };

  const canGoToPreview =
    Boolean(selectedCategory || selectedSubcategory) && Boolean(location.selectedCity.trim());
  const previewDisabledReason =
    !selectedCategory && !selectedSubcategory
      ? 'دسته‌بندی را انتخاب کنید'
      : !location.selectedCity.trim()
        ? 'شهر را انتخاب کنید'
        : undefined;

  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    if (draft.categoryLockedByUserRef.current) return;

    const entities = recordToEntities(needDraft.entities);
    const leaf = entities.subcategorySlug || entities.categorySlug;
    if (leaf && !selectedCategory && !selectedSubcategory && !isAmbiguousCommercialSubtype(composedSourceText)) {
      draft.applyCategorySlug(leaf);
    }

    if (!location.selectedCity.trim() && entities.city?.trim()) {
      location.applyDetectedLocationFromDraft(needDraft);
    }

    if (draft.enabledSections.size === 0 && needDraft.sections?.length) {
      draft.setEnabledSections(computeEnabledSectionsForLocation(needDraft));
    }
  }, [
    step,
    needDraft,
    composedSourceText,
    selectedCategory,
    selectedSubcategory,
    location.selectedCity,
    location.applyDetectedLocationFromDraft,
    draft,
  ]);

  const showLiveSummary =
    step === 'need' ||
    step === 'details' ||
    step === 'location' ||
    step === 'preview';
  const liveSnippet =
    liveListingCopy &&
    (liveListingCopy.title || liveListingCopy.description || liveListingCopy.streaming) ? (
      <IntakeLiveListingSnippet
        title={liveListingCopy.title}
        description={liveListingCopy.description}
        streaming={liveListingCopy.streaming}
      />
    ) : null;

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
            <IntakeMobileSummarySheet summary={liveSummary} inline />
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
          'intake-flow intake-flow--compact overflow-guard pb-[calc(var(--mobile-nav-offset)+0.5rem)] lg:pb-0',
          showLiveSummary && 'layout-golden-split layout-golden-split--intake'
        )}
      >
        <div className="layout-golden-main flex min-h-0 flex-1 flex-col min-w-0">
          <div className="intake-steps-stack">
            {step === 'need' && (
              <IntakeStepShell
                stepNumber={1}
                title="نیاز"
                titleRef={stepTitleRef}
                header={panelChrome}
                description={INTAKE_COPY.stepNeedDescription}
                actions={
                  <Button
                    className={`w-full sm:w-auto ${intakePrimaryCta}`}
                    onClick={() => void goToDetails()}
                    disabled={
                      isLoading ||
                      !needText.trim() ||
                      (intelligenceLiveEnabled && intakeIntelligence.analyzing)
                    }
                  >
                    {intelligenceLiveEnabled && intakeIntelligence.analyzing
                      ? 'در حال تحلیل…'
                      : 'ادامه به توضیحات'}
                  </Button>
                }
              >
                <IntakeComposerTextarea
                  id="intake-need-text"
                  name="needText"
                  value={needText}
                  onChange={setNeedText}
                  placeholder="مثلاً: یک آپارتمان در فرامرز عباسی میخوام"
                  disabled={isLoading}
                  analyzing={intelligenceLiveEnabled && intakeIntelligence.analyzing}
                />
                {needText.trim().length >= 3 ? (
                  <IntakeAiUnderstandingCard
                    intentGist={intakeIntelligence.intentGist}
                    fieldMeta={intakeIntelligence.fieldMeta}
                    analyzing={intelligenceLiveEnabled && intakeIntelligence.analyzing}
                    aiInvoked={intakeIntelligence.aiInvoked}
                    className="mt-3"
                  />
                ) : null}
                {showAiShardBar ? (
                  <IntakeAiShardBar
                    snapshot={intakeProgressSnapshot}
                    active={aiEnriching || intakeIntelligence.analyzing}
                  />
                ) : null}
              </IntakeStepShell>
            )}

            {step === 'details' && (
              <IntakeStepShell
                stepNumber={2}
                title="توضیحات"
                titleRef={stepTitleRef}
                header={panelChrome}
                description="بودجه، شرایط خاص و اولویت‌ها را بنویسید."
                actions={
                  <>
                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => setStep('need')}>
                      <ArrowRight className="size-4 ml-1" />
                      بازگشت
                    </Button>
                    <Button
                      className={`w-full sm:w-auto ${intakePrimaryCta}`}
                      onClick={() => goToLocation()}
                      onMouseEnter={prefetchLocationAnalyze}
                      onFocus={prefetchLocationAnalyze}
                      disabled={!canProceedToIntakeLocation(needText, detailsText) || isLoading}
                    >
                      ادامه به دسته و مکان
                    </Button>
                  </>
                }
              >
                <IntakeComposerTextarea
                  id="intake-details-text"
                  name="detailsText"
                  value={detailsText}
                  onChange={setDetailsText}
                  placeholder="مثلاً: ۱۰ میلیارد بودجه، دو خواب، نزدیک مترو..."
                  showCharProgress
                  highlightFromHome={homeSeedHighlight}
                  disabled={isLoading}
                  analyzing={intelligenceLiveEnabled && intakeIntelligence.analyzing}
                />
                {composedSourceText.trim().length >= 3 ? (
                  <IntakeAiUnderstandingCard
                    intentGist={intakeIntelligence.intentGist}
                    fieldMeta={intakeIntelligence.fieldMeta}
                    analyzing={intelligenceLiveEnabled && intakeIntelligence.analyzing}
                    aiInvoked={intakeIntelligence.aiInvoked}
                    className="mt-3"
                  />
                ) : null}
                {liveSnippet}
                {showAiShardBar ? (
                  <IntakeAiShardBar
                    snapshot={intakeProgressSnapshot}
                    active={aiEnriching || intakeIntelligence.analyzing}
                  />
                ) : null}
              </IntakeStepShell>
            )}

            {step === 'location' && (
              <IntakeStepShell
                stepNumber={3}
                title="دسته و مکان"
                titleRef={stepTitleRef}
                header={panelChrome}
                description="دسته، شهر و محله را انتخاب یا ویرایش کنید."
                actions={
                  <>
                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => setStep('details')}>
                      <ArrowRight className="size-4 ml-1" />
                      بازگشت
                    </Button>
                    <Button
                      className={`w-full sm:w-auto ${intakePrimaryCta}`}
                      onClick={goToPreview}
                      disabled={!canGoToPreview}
                      title={previewDisabledReason}
                    >
                      {needDraft?.completionState === 'READY_TO_PUBLISH'
                        ? 'ادامه به پیش‌نمایش'
                        : 'تکمیل اطلاعات و ادامه'}
                    </Button>
                  </>
                }
              >
                <IntakeTemplateForm
                  template={draft.intakeTemplate}
                  context={intakeFormContext}
                  enabledSections={draft.enabledSections}
                  onEnabledSectionsChange={draft.setEnabledSections}
                />
                {liveSnippet}
                {showAiShardBar ? (
                  <IntakeAiShardBar
                    snapshot={intakeProgressSnapshot}
                    active={aiEnriching || intakeIntelligence.analyzing}
                    compact
                  />
                ) : null}
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
        {showLiveSummary ? <IntakeLiveSummaryAside summary={liveSummary} /> : null}
      </div>
    </>
  );
}
