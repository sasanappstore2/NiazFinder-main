'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Info, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { NeedListingPreview } from './NeedListingPreview';
import type { IntakeAiShardKey, IntakeAiShardStatus } from './IntakeAiShardBar';
import { isRulesOnlyIntakeMode } from '@/lib/intake/rules-only-mode';
import { IntakeStepTimeline } from './IntakeStepTimeline';
import { PublishSuccessOverlay } from './PublishSuccessOverlay';
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

  const intakeIntelligence = useIntakeIntelligence({
    text: composedSourceText,
    enabled: intelligenceLiveEnabled,
    citySlug: intakeAnalyzeCityHint.citySlug,
    cityName: intakeAnalyzeCityHint.cityName,
    onDraft: (d) => {
      setNeedDraft(d);
      if (!draft.categoryLockedByUserRef.current) {
        const entities = d.entities as Record<string, unknown> | undefined;
        const leaf =
          (typeof entities?.subcategorySlug === 'string' && entities.subcategorySlug) ||
          (typeof entities?.categorySlug === 'string' && entities.categorySlug) ||
          d.parsedIntent?.subcategorySlug ||
          d.parsedIntent?.categorySlug;
        if (leaf) {
          draft.applyCategorySlug(leaf);
        }
      }
      location.applyDetectedLocationFromDraft(d);
    },
  });

  useEffect(() => {
    setError(null);
  }, [step, setError]);

  useEffect(() => {
    if (isRulesOnlyIntakeMode()) {
      setAiEnriching(intakeIntelligence.analyzing);
      return;
    }
    setAiEnriching(intakeIntelligence.analyzing);
    if (intakeIntelligence.aiInvoked && !intakeIntelligence.analyzing) {
      setAiShardStatus((prev) => ({ ...prev, need: 'done' }));
    } else if (intakeIntelligence.analyzing) {
      setAiShardStatus((prev) => ({ ...prev, need: 'running' }));
    }
  }, [intakeIntelligence.analyzing, intakeIntelligence.aiInvoked]);

  const liveListingCopy = useIntakeListingCopy(liveDraftForCopy, liveCopyStreamEnabled);

  useEffect(() => {
    reset();
    location.cityLockedByUserRef.current = false;
    location.neighborhoodLockedByUserRef.current = false;
    draft.categoryLockedByUserRef.current = false;
    setSelectedCategory('');
    setSelectedSubcategory('');
    location.setSelectedNeighborhood('');
    const seed = initialSeed.trim();
    setNeedText(seed);
    if (initialCity?.trim()) {
      const resolved =
        resolveIntakeCitySelectValue(location.sortedCities, {
          cityName: initialCity,
          citySlug: initialCity,
        }) ?? initialCity.trim();
      location.setSelectedCity(resolved);
    } else {
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
    location.sortedCities,
    location.setSelectedCity,
    location.cityLockedByUserRef,
    location.neighborhoodLockedByUserRef,
    draft.categoryLockedByUserRef,
  ]);

  useEffect(() => {
    if (draft.initialCategoryAppliedRef.current || !initialCategory?.trim()) return;
    draft.initialCategoryAppliedRef.current = true;
    draft.applyCategorySlug(initialCategory.trim());
  }, [initialCategory, draft]);

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
  }, [needDraft, projectedDraft, needText, detailsText, step]);

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

  return (
    <>
      {step === 'done' && publishState.publishRedirect ? (
        <PublishSuccessOverlay
          message={publishState.publishSuccessCopy.message}
          subtitle={publishState.publishSuccessCopy.subtitle}
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
                <Button
                  className="w-full sm:w-auto"
                  onClick={goToDetails}
                  disabled={isLoading || !needText.trim()}
                >
                  ادامه به توضیحات
                </Button>
              </section>
            )}

            {step === 'details' && (
              <section className="intake-form-card">
                <div className="intake-form-card__head">
                  <h2 className="intake-form-card__title">مرحله ۲: توضیحات</h2>
                  <p className="intake-form-card__desc">
                    محدودیت بودجه، شرایط خاص، و اولویت‌ها را بنویسید. اگر در مرحله قبل متن کامل
                    نوشتید، می‌توانید مستقیم ادامه دهید.
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

                <IntakeTemplateForm
                  template={draft.intakeTemplate}
                  context={draft.intakeRenderContext}
                  enabledSections={draft.enabledSections}
                  onEnabledSectionsChange={draft.setEnabledSections}
                />

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
                onRepolish={() => void publishState.repolishPreview()}
                onPublish={() => void publishState.publish()}
                isLoading={isLoading}
                isRepublishing={publishState.isRepublishing}
                isTitleEnriching={titleEnriching}
                isDescEnriching={descEnriching}
                publishDisabled={!publishState.canPublish}
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
