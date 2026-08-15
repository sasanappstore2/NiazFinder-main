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
import { IntakeCategoryAmbiguityPrompt } from './IntakeCategoryAmbiguityPrompt';
import { IntakeLocationAmbiguityPrompt } from './IntakeLocationAmbiguityPrompt';
import { IntakeLiveListingSnippet } from './IntakeLiveListingSnippet';
import { IntakeLiveSummaryAside } from './IntakeLiveSummaryAside';
import { IntakeMobileSummarySheet } from './IntakeMobileSummarySheet';
import { IntakePublishingOverlay } from './IntakePublishingOverlay';
import { intakePrimaryCta } from './intake-ui-tokens';
import { INTAKE_COPY } from './intake-copy';
import { cn } from '@/lib/utils';
import type { IntakeWizardGuardContext } from '@/lib/need-intake/intake-wizard-guards';
import { isIntakeComposeStep } from '@/lib/need-intake/intake-wizard-steps';
import { getIntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { getLeadPhone, setLeadPhone as persistLeadPhone } from '@/lib/lead-draft';
import { buildSummary } from '@/lib/need-intake/question-engine';
import { useIntakeFormProjection } from '@/hooks/use-intake-form-projection';
import { useIntakeListingCopy } from '@/hooks/use-intake-listing-copy';
import { useIntakeIntelligence } from '@/hooks/use-intake-intelligence';
import { intakeTextSignature, useRealtimeExtraction } from '@/hooks/use-realtime-extraction';
import {
  mergeIntakeSources,
  pickNeighborhoodSoftFill,
  type SmartFieldProposal,
} from '@/lib/need-intake/intake-merge-policy';
import { UNDERSTANDING_CATEGORY_MIN_CONFIDENCE } from '@/lib/need-intake/build-intake-understanding';
import {
  NEIGHBORHOOD_SOFT_FILL_MIN_CONFIDENCE,
  mayAutoApplyLocation,
  mayPrefillNeighborhood,
  sanitizeDraftForComposeAutoApply,
} from '@/lib/need-intake/compose-auto-apply';
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
import { isAmbiguousCommercialSubtype } from '@/lib/need-intake/business-commercial-property-intent';
import { buildParsedIntentFromForm, recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { resolveRequiredFields } from '@/intake/template/required-field-resolver';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';
import {
  resolveIntakeCitySelectValue,
  resolveManagedCityForNeighborhoods,
} from '@/lib/need-intake/sync-intake-location-form';
import { normalizeCategoryPair } from '@/config/categories';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { IntakeTemplateForm } from '@/intake/rendering/IntakeTemplateForm';
import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
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

function smartProposalsEqual(a: SmartFieldProposal[], b: SmartFieldProposal[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (
      left.fieldKey !== right.fieldKey ||
      left.confidence !== right.confidence ||
      left.value !== right.value ||
      left.label !== right.label
    ) {
      return false;
    }
  }
  return true;
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
  /** Fields the user manually edited — soft-fill must not overwrite (Batch 7). */
  const userOverriddenFieldsRef = useRef(new Set<string>());
  const softFillActiveRef = useRef(false);
  const sourceCoreRef = useRef('');
  const lastSoftFillTxRef = useRef<string | null>(null);

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
  const configuredAnalysisMode = getIntakeAnalysisMode();

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

  /** Live smart-extract is off — Intelligence Engine is the single compose source. */
  const smartRealtime = useRealtimeExtraction({
    debounceMs: 300,
    preferredCity: intakeAnalyzeCityHint.cityName || undefined,
    preferredCitySlug: intakeAnalyzeCityHint.citySlug || undefined,
    useAI: false,
    enabled: false,
  });
  const { result: smartResult, extracting: smartExtracting } = smartRealtime;

  /** Smart proposals from merge policy — never auto-written into NeedDraft. */
  const [smartProposals, setSmartProposals] = useState<SmartFieldProposal[]>([]);
  const neighborhoodSoftFill = useMemo(() => {
    const soft = pickNeighborhoodSoftFill(
      smartResult,
      {
        cityLockedByUser: location.cityLockedByUserRef.current,
        neighborhoodLockedByUser: location.neighborhoodLockedByUserRef.current,
      },
      NEIGHBORHOOD_SOFT_FILL_MIN_CONFIDENCE
    );
    if (soft) {
      return { neighborhood: soft.neighborhood, confidence: soft.confidence };
    }
    const hood = smartProposals.find((p) => p.fieldKey === 'neighborhood');
    if (!hood || typeof hood.value !== 'string') return null;
    if (hood.confidence < NEIGHBORHOOD_SOFT_FILL_MIN_CONFIDENCE) return null;
    return { neighborhood: hood.value, confidence: hood.confidence };
  }, [smartProposals, smartResult, location.cityLockedByUser, location.selectedNeighborhood]);

  useEffect(() => {
    // Dual-pipeline merge: intelligence owns NeedDraft; smart is proposal-only.
    // Do not depend on the `location` object — it is a new reference every render.
    if (!isIntakeComposeStep(step)) {
      setSmartProposals((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (!smartResult || smartExtracting) return;
    const currentSig = intakeTextSignature(needText, detailsText);
    const merged = mergeIntakeSources({
      currentSourceSig: currentSig,
      locks: {
        categoryLockedByUser: draft.categoryLockedByUser,
        cityLockedByUser: location.cityLockedByUserRef.current,
        neighborhoodLockedByUser: location.neighborhoodLockedByUserRef.current,
        dealLockedByUser:
          needDraft?.answers?._userSetDealType === true ||
          (typeof needDraft?.answers?.dealType === 'string' &&
            draft.categoryLockedByUser &&
            Boolean(needDraft.answers.dealType)),
        lockedFieldKeys: [...userOverriddenFieldsRef.current],
      },
      smart: {
        result: smartResult,
        sourceSig: smartResult._sourceSig ?? currentSig,
        receivedAtMs: Date.now(),
        requestId: smartResult._requestId,
      },
      intelligence:
        needDraft && composedSourceText.trim()
          ? {
              draft: needDraft,
              sourceSig: currentSig,
              receivedAtMs: Date.now(),
            }
          : null,
    });
    if (!merged.smartIsFresh) {
      setSmartProposals((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setSmartProposals((prev) =>
      smartProposalsEqual(prev, merged.proposals) ? prev : merged.proposals
    );
    lastSoftFillTxRef.current = smartResult.transaction.type ?? lastSoftFillTxRef.current;
  }, [
    step,
    smartResult,
    smartExtracting,
    needText,
    detailsText,
    needDraft,
    composedSourceText,
    draft.categoryLockedByUser,
  ]);

  useEffect(() => {
    if (!isIntakeComposeStep(step)) {
      smartRealtime.clear();
    }
  }, [step, smartRealtime.clear]);
  const intelligenceLiveEnabled =
    Boolean(composedSourceText.trim()) && isIntakeComposeStep(step);

  const intakeAnalyzeFormHints = useMemo(() => {
    const lockedFieldKeys: string[] = [];
    const dealLocked =
      needDraft?.answers?._userSetDealType === true ||
      (typeof needDraft?.answers?.dealType === 'string' &&
        draft.categoryLockedByUser &&
        Boolean(needDraft.answers.dealType));
    if (dealLocked) lockedFieldKeys.push('dealType', 'transactionType');

    // Only user-confirmed locks — URL category/city are analyze hints, not locks.
    const hasAnyLock =
      draft.categoryLockedByUser ||
      location.cityLockedByUserRef.current ||
      location.neighborhoodLockedByUserRef.current ||
      lockedFieldKeys.length > 0;

    if (!hasAnyLock) return undefined;

    return {
      categorySlug: draft.categoryLockedByUser ? selectedCategory || undefined : undefined,
      subcategorySlug: draft.categoryLockedByUser ? selectedSubcategory || undefined : undefined,
      city: location.cityLockedByUserRef.current ? location.selectedCity || undefined : undefined,
      neighborhood: location.neighborhoodLockedByUserRef.current
        ? location.selectedNeighborhood || undefined
        : undefined,
      categoryLockedByUser: draft.categoryLockedByUser || undefined,
      cityLockedByUser: location.cityLockedByUserRef.current || undefined,
      neighborhoodLockedByUser: location.neighborhoodLockedByUserRef.current || undefined,
      dealLockedByUser: dealLocked || undefined,
      lockedFieldKeys: lockedFieldKeys.length ? lockedFieldKeys : undefined,
    };
  }, [
    selectedCategory,
    selectedSubcategory,
    draft.categoryLockedByUser,
    location.selectedCity,
    location.selectedNeighborhood,
    needDraft?.answers?._userSetDealType,
    needDraft?.answers?.dealType,
  ]);

  const intakeIntelligence = useIntakeIntelligence({
    text: composedSourceText,
    enabled: intelligenceLiveEnabled,
    citySlug: intakeAnalyzeCityHint.citySlug,
    cityName: intakeAnalyzeCityHint.cityName,
    formHints: intakeAnalyzeFormHints,
    debounceMs: 400,
    forceAi: false,
    // Auto-apply in background — user can correct fields on the location step.
    onDraft: (d: NeedDraft) => {
      if (!isIntakeComposeStep(step)) return;
      const sanitized = sanitizeDraftForComposeAutoApply(d);
      setNeedDraft(sanitized);

      // M2/M4: clear stale auto-fills when new analysis refuses to write.
      const entities = sanitized.entities as Record<string, unknown> | undefined;
      if (
        !draft.categoryLockedByUserRef.current &&
        !entities?.categorySlug &&
        !entities?.subcategorySlug &&
        !sanitized.parsedIntent?.categorySlug &&
        !sanitized.parsedIntent?.subcategorySlug
      ) {
        if (selectedCategory || selectedSubcategory) {
          setSelectedCategory('');
          setSelectedSubcategory('');
        }
      }

      if (!draft.categoryLockedByUserRef.current) {
        const ambiguousCommercial = isAmbiguousCommercialSubtype(composedSourceText);
        const leaf =
          (typeof entities?.subcategorySlug === 'string' && entities.subcategorySlug) ||
          (typeof entities?.categorySlug === 'string' && entities.categorySlug) ||
          sanitized.parsedIntent?.subcategorySlug ||
          sanitized.parsedIntent?.categorySlug;
        const categoryConfidence = Math.max(
          Number(sanitized.fieldMeta?.subcategorySlug?.confidence ?? 0),
          Number(sanitized.fieldMeta?.categorySlug?.confidence ?? 0)
        );
        const currentLeaf = selectedSubcategory || selectedCategory;
        if (
          leaf &&
          !ambiguousCommercial &&
          leaf !== currentLeaf &&
          categoryConfidence >= UNDERSTANDING_CATEGORY_MIN_CONFIDENCE
        ) {
          draft.applyCategorySlug(leaf);
        }
      }
      if (
        !location.cityLockedByUserRef.current ||
        !location.neighborhoodLockedByUserRef.current
      ) {
        location.applyDetectedLocationFromDraft(sanitized);
      }

      // Clear neighborhood auto-fill when refused.
      if (
        !location.neighborhoodLockedByUserRef.current &&
        !mayPrefillNeighborhood(sanitized) &&
        location.selectedNeighborhood.trim()
      ) {
        location.setSelectedNeighborhood('');
      }
      if (
        !location.cityLockedByUserRef.current &&
        !mayAutoApplyLocation(sanitized, 'city') &&
        location.selectedCity.trim() &&
        !initialCity?.trim()
      ) {
        location.setSelectedCity('');
      }
    },
  });

  const analysisMode = intakeIntelligence.analysisMode ?? configuredAnalysisMode;

  const locationProceedOpts = useMemo(() => {
    const entities = needDraft ? recordToEntities(needDraft.entities) : null;
    return {
      hasCategory: Boolean(
        selectedCategory ||
          selectedSubcategory ||
          entities?.categorySlug ||
          entities?.subcategorySlug ||
          needDraft?.parsedIntent?.categorySlug
      ),
      hasCity: Boolean(
        location.selectedCity || entities?.city || needDraft?.parsedIntent?.city
      ),
    };
  }, [
    needDraft,
    selectedCategory,
    selectedSubcategory,
    location.selectedCity,
  ]);

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
        filterSuggestions: intakeIntelligence.filterSuggestionChips,
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
      intakeIntelligence.filterSuggestionChips,
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
    setAiShardStatus(
      shardStatusFromNeedDraft(draftForShards, intakeIntelligence.enriching || aiEnriching, progressOpts)
    );
    if (isIntakeComposeStep(step)) {
      setAiEnriching(intakeIntelligence.enriching);
    }
  }, [
    step,
    needText,
    detailsText,
    needDraft,
    projectedDraft,
    intakeIntelligence.analyzing,
    intakeIntelligence.enriching,
    aiEnriching,
  ]);

  const intakeProgressSnapshot = useMemo(
    () =>
      buildIntakeProgressSnapshot(needDraft ?? projectedDraft, {
        enriching: intakeIntelligence.enriching || aiEnriching,
        needText,
        detailsText,
      }),
    [
      needDraft,
      projectedDraft,
      intakeIntelligence.enriching,
      aiEnriching,
      needText,
      detailsText,
    ]
  );

  const showAiShardBar = composedSourceText.trim().length >= 3;

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
    // URL city is an analyze hint only — do not lock or preselect until user confirms.
    if (initialCity?.trim()) {
      pendingInitialCityRef.current = initialCity.trim();
    } else {
      pendingInitialCityRef.current = null;
    }
    location.setSelectedCity('');
    const phone = initialPhone?.trim() || getLeadPhone();
    if (phone) setLeadPhone(phone);

    if (seed) {
      setSeedText(seed);
      setShowMoreDetails(false);
    }
    setStep('compose');
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
    draft.resetCategoryLocks,
  ]);

  useEffect(() => {
    // Keep pending URL city as analyze hint via intakeAnalyzeCityHint; do not fill the form.
    pendingInitialCityRef.current = null;
  }, [initialCity, location.sortedCities]);

  // URL category=… is a hint for ranking, not a form lock / auto-select.

  useEffect(() => {
    if (!isIntakeComposeStep(step)) return;

    // Live analyze is source of truth — only project locally as offline/rules fallback.
    if (intelligenceLiveEnabled) return;

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
    intelligenceLiveEnabled,
  ]);

  useEffect(() => {
    if (!isIntakeComposeStep(step)) return;
    if (!needText.trim()) return;
    if (draft.categoryLockedByUserRef.current) return;
    // Category comes from /api/intake/analyze while typing — avoid local overwrite.
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
    if (isIntakeComposeStep(step) && intakeIntelligence.agent?.description) {
      setLiveSummary(intakeIntelligence.agent.description);
      return;
    }
    if (isIntakeComposeStep(step) && intakeIntelligence.intentGist) {
      setLiveSummary(intakeIntelligence.intentGist);
      return;
    }
    // Prefer analyze draft when live intelligence is on; local projection is fallback only.
    let d = needDraft;
    if (!d && !intelligenceLiveEnabled) {
      d = projectedDraft;
    } else if (isIntakeComposeStep(step) && needDraft?.sourceText?.trim() !== composed && !intelligenceLiveEnabled) {
      d = projectedDraft;
    }
    if (!d) {
      const softHood =
        neighborhoodSoftFill && neighborhoodSoftFill.confidence >= 0.75
          ? `محله پیشنهادی: ${neighborhoodSoftFill.neighborhood}`
          : '';
      setLiveSummary(softHood);
      return;
    }
    const base = buildSummary(d.parsedIntent, d.answers, d.sourceText);
    const softHood =
      neighborhoodSoftFill &&
      neighborhoodSoftFill.confidence >= 0.75 &&
      !location.selectedNeighborhood
        ? ` · محله پیشنهادی: ${neighborhoodSoftFill.neighborhood}`
        : '';
    setLiveSummary(`${base}${softHood}`);
  }, [
    needDraft,
    projectedDraft,
    needText,
    detailsText,
    step,
    intakeIntelligence.intentGist,
    intakeIntelligence.agent?.description,
    intelligenceLiveEnabled,
    neighborhoodSoftFill,
    location.selectedNeighborhood,
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

  const goToForm = async () => {
    if (!needText.trim()) {
      toast.info('ابتدا نیاز خود را بنویسید');
      return;
    }
    if (!canProceedToIntakeLocation(needText, detailsText, locationProceedOpts)) {
      toast.info('یک جمله کامل‌تر بنویسید یا توضیح بیشتری اضافه کنید');
      return;
    }
    setSeedText(needText.trim());
    goToLocation();
  };

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
    const smartTitle = generateSmartTitle(smartRealtime.result);
    const smartDesc = generateSmartDescription(
      smartRealtime.result,
      composeIntakeSourceText(needText, detailsText)
    );
    setListingPreview({
      title: deterministicTitle.trim() || smartTitle || '',
      description: composed.description.trim() || smartDesc || '',
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

  // Soft-apply analyzed category/location onto the form when user reaches location step.
  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    if (draft.enabledSections.size === 0 && needDraft.sections?.length) {
      draft.setEnabledSections(computeEnabledSectionsForLocation(needDraft));
    }
  }, [step, needDraft, draft]);

  const showLiveSummary =
    isIntakeComposeStep(step) || step === 'location' || step === 'preview';
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
                    disabled={
                      isLoading ||
                      !canProceedToIntakeLocation(needText, detailsText, locationProceedOpts)
                    }
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
                  showCharProgress
                  highlightFromHome={homeSeedHighlight}
                  disabled={isLoading}
                  analyzing={intelligenceLiveEnabled && intakeIntelligence.enriching}
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
                {composedSourceText.trim().length >= 3 ? (
                  <IntakeAiUnderstandingCard
                    intentGist={intakeIntelligence.intentGist}
                    fieldMeta={intakeIntelligence.fieldMeta}
                    analyzing={false}
                    enriching={intelligenceLiveEnabled && intakeIntelligence.enriching}
                    stale={
                      Boolean(composedSourceText.trim()) &&
                      !intakeIntelligence.isFreshForText(composedSourceText)
                    }
                    aiInvoked={intakeIntelligence.aiInvoked}
                    analysisMode={analysisMode}
                    className="mt-3"
                  />
                ) : null}
                {isIntakeComposeStep(step) ? (
                  <div className="mt-3 space-y-2">
                    <IntakeCategoryAmbiguityPrompt
                      needDraft={needDraft}
                      selectedSlug={selectedSubcategory || selectedCategory}
                      onApplyCategory={(slug) => {
                        draft.applyCategorySlug(slug);
                        toast.success('دسته‌بندی انتخاب شد');
                      }}
                    />
                    <IntakeLocationAmbiguityPrompt
                      needDraft={needDraft}
                      onApplyCity={(cityIdOrName) => {
                        const hit = needDraft?.parsedIntent?.cityCandidates?.find(
                          (c) => c.cityId === cityIdOrName || c.label === cityIdOrName
                        );
                        const name = hit?.label ?? cityIdOrName;
                        location.lockCityByUser();
                        location.setSelectedCity(name);
                        toast.success('شهر انتخاب شد');
                      }}
                      onApplyNeighborhood={(name, id, opts) => {
                        if (opts?.fromUser !== false) {
                          location.neighborhoodLockedByUserRef.current = true;
                        }
                        location.setSelectedNeighborhood(name);
                        if (id) {
                          patchNeedDraftEntities({ neighborhood: name, neighborhoodSlug: id });
                        }
                        toast.success('محله انتخاب شد');
                      }}
                    />
                  </div>
                ) : null}
                {liveSnippet}
                {showAiShardBar ? (
                  <IntakeAiShardBar
                    snapshot={intakeProgressSnapshot}
                    active={aiEnriching || intakeIntelligence.enriching}
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
                      <ArrowRight className="size-4 ml-1" />
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
                    active={aiEnriching || intakeIntelligence.enriching}
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
                    smartResult={smartRealtime.result}
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
