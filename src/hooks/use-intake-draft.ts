'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NeedDraft } from '@/contracts/need-intake';
import { categorySuggestionLabelFromSlug } from '@/lib/categories/format-category-suggestion-label';
import {
  getCategoryBySlug,
  normalizeCategoryPair,
} from '@/config/categories';
import { suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';
import { hasCategoryAmbiguity } from '@/components/need-intake/IntakeCategoryAmbiguityPrompt';
import {
  getBusinessCommercialPropertyCandidates,
  isAmbiguousCommercialSubtype,
} from '@/lib/need-intake/business-commercial-property-intent';
import { composeIntakeSourceText } from '@/lib/need-intake/compose-source-text';
import { whenToUrgency } from '@/lib/need-intake/intake-timing-options';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import {
  inferEntitiesFromCategorySlugs,
  patchNeedDraftEntities as patchDraftEntities,
  recordToEntities,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { resolveTemplate } from '@/intake/template/resolveTemplate';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { entityPatchForField } from '@/intake/state/updateDraftField';
import { isFieldFilled } from '@/intake/state/isFieldFilled';
import type { IntakeRenderContext } from '@/intake/rendering/types';
import type { IntakeTemplate } from '@/intake/template/types';
import { trackFieldChange } from '@/intake/telemetry/postIntakeTelemetry';

import { resolveRequiredFields } from '@/intake/template/required-field-resolver';
import { resolveSectionKeyForField } from '@/intake/template/sectionGroups';

function sectionKeysEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

export function computeEnabledSectionsForLocation(draft: NeedDraft): Set<string> {
  const entities = recordToEntities(draft.entities);
  const template = resolveTemplateFromDraftEntities(entities);
  const next = new Set<string>();

  const filledCtx = {
    entities,
    answers: draft.answers ?? {},
    selectedCategory: entities.categorySlug ?? undefined,
    selectedSubcategory: entities.subcategorySlug ?? undefined,
    selectedCity: entities.city ?? undefined,
    selectedNeighborhood: entities.neighborhood ?? undefined,
    sourceText: draft.sourceText,
    parsedBrand: draft.parsedIntent?.entities?.brand,
  };

  const leaf = entities.subcategorySlug || entities.categorySlug || '';
  const required = resolveRequiredFields({
    categorySlug: leaf,
    answers: draft.answers as Record<string, unknown>,
    entities: draft.entities as Record<string, unknown>,
  });
  // Critical fields are useful for matching, but not all are mandatory.
  const missingRequiredKeys = new Set(required.missingFieldKeys);

  for (const section of template.sections) {
    if (section.key === 'specs') continue;
    if (section.key === 'timing') {
      const hasTimingValue = section.fields.some((key) => {
        const meta = template.fieldMap[key];
        return meta ? isFieldFilled(meta, filledCtx) : false;
      });
      if (hasTimingValue) next.add('timing');
      continue;
    }
    if (template.mandatorySectionKeys.has(section.key)) {
      next.add(section.key);
      continue;
    }
    const hasFilled = section.fields.some((key) => {
      const meta = template.fieldMap[key];
      return meta ? isFieldFilled(meta, filledCtx) : false;
    });
    if (hasFilled) {
      next.add(section.key);
      continue;
    }
    const hasMissingRequired = section.fields.some((key) => missingRequiredKeys.has(key));
    if (hasMissingRequired) next.add(section.key);
  }

  // Also open sections for missing keys that live outside template.section.fields lists.
  for (const key of required.missingFieldKeys) {
    const sectionKey = resolveSectionKeyForField(key, leaf);
    if (sectionKey && sectionKey !== 'specs') next.add(sectionKey);
  }

  return next;
}

export interface UseIntakeDraftOptions {
  needText: string;
  detailsText: string;
  needDraft: NeedDraft | null;
  step: string;
  selectedCategory: string;
  selectedSubcategory: string;
  selectedCity: string;
  selectedNeighborhood: string;
  getDraft: () => NeedDraft | null;
  setNeedDraft: (draft: NeedDraft) => void;
  patchNeedDraftEntities: (patch: Record<string, unknown>) => void;
  onCategoryChange?: (category: string, subcategory: string) => void;
  locationContext: Pick<
    IntakeRenderContext,
    | 'onCityChange'
    | 'onNeighborhoodChange'
    | 'onMapPinChange'
    | 'onMyLocation'
    | 'onPromptNeighborhoodHandled'
    | 'neighborhoodOptions'
    | 'neighborhoodsLoading'
    | 'promptNeighborhoodPick'
    | 'myLocationLoading'
    | 'neighborhoodDisambiguationChips'
    | 'locationSuggestionChips'
    | 'onLocationSuggestionSelect'
  >;
}

export function useIntakeDraft({
  needText,
  detailsText,
  needDraft,
  step,
  selectedCategory,
  selectedSubcategory,
  selectedCity,
  selectedNeighborhood,
  getDraft,
  setNeedDraft,
  patchNeedDraftEntities,
  onCategoryChange,
  locationContext,
}: UseIntakeDraftOptions) {
  const [enabledSections, setEnabledSections] = useState<Set<string>>(() => new Set());
  const categoryLockedByUserRef = useRef(false);
  const [categoryLockedByUser, setCategoryLockedByUser] = useState(false);
  const initialCategoryAppliedRef = useRef(false);

  const selectedLeafCategorySlug = selectedSubcategory || selectedCategory;

  useEffect(() => {
    if (!needDraft) return;
    if (needDraft.categoryLockedByUser && !categoryLockedByUserRef.current) {
      categoryLockedByUserRef.current = true;
      setCategoryLockedByUser(true);
    }
  }, [needDraft?.categoryLockedByUser, needDraft]);

  const categorySourceText = useMemo(
    () => composeIntakeSourceText(needText, detailsText),
    [needText, detailsText]
  );

  const inferCategoryEntities = useCallback(
    (categorySlug: string, subcategorySlug?: string | null) => {
      const draft = getDraft();
      const userSetDeal = draft?.answers?._userSetDealType === true;
      return inferEntitiesFromCategorySlugs(categorySlug, subcategorySlug, {
        sourceText: categorySourceText,
        userDealType: userSetDeal && draft?.answers?.dealType != null
          ? String(draft.answers.dealType)
          : undefined,
      });
    },
    [categorySourceText, getDraft]
  );

  const draftEntities = needDraft ? recordToEntities(needDraft.entities) : null;

  const categorySuggestions = useMemo(() => {
    const source = `${needText}\n${detailsText}`;
    const commercialCandidates = getBusinessCommercialPropertyCandidates(source);
    const selectedLeaf = selectedSubcategory || draftEntities?.subcategorySlug || '';
    const selectedScope = selectedLeaf || selectedCategory || draftEntities?.categorySlug || '';
    const selectedDepth = getCategoryBySlug(selectedScope)?.depth ?? -1;
    if (selectedDepth === 2) return [];

    if (commercialCandidates.length > 0) {
      return commercialCandidates.filter((slug) => {
        if (!selectedScope || selectedDepth === 0) return true;
        return normalizeCategoryPair(slug).categorySlug === selectedScope;
      });
    }

    const ruleCandidates = needDraft?.parsedIntent?.categoryCandidates;
    // Prefer server category candidates — do not override with client keyword heuristics.
    if (ruleCandidates && ruleCandidates.length > 0 && !selectedScope) {
      return ruleCandidates
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6)
        .map((c) => c.slug);
    }

    // Server already resolved a leaf — no client keyword chip override.
    if (selectedScope) {
      return [];
    }

    const commercialAmbiguous = isAmbiguousCommercialSubtype(source);
    const candidates = suggestNeedCategoriesFromText(source, 8);
    const slugs: string[] = [];

    if (commercialCandidates.length > 0) {
      for (const slug of commercialCandidates) {
        if (!slugs.includes(slug)) slugs.push(slug);
      }
    }

    const rootFallback: string[] = [];
    for (const candidate of candidates) {
      const pair = normalizeCategoryPair(candidate.slug);
      const leaf = pair.subcategorySlug ?? pair.categorySlug;
      if (!leaf || slugs.includes(leaf) || rootFallback.includes(leaf)) continue;
      if (commercialAmbiguous && (leaf === 'beauty-health' || leaf === 'apartment-rent')) {
        continue;
      }
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
  }, [needDraft?.parsedIntent?.categoryCandidates, needText, detailsText, selectedCategory, selectedSubcategory, draftEntities?.categorySlug, draftEntities?.subcategorySlug]);

  const categoryAmbiguous = useMemo(
    () => hasCategoryAmbiguity(needDraft?.parsedIntent),
    [needDraft?.parsedIntent]
  );

  const commercialCategoryAmbiguous = useMemo(
    () => categoryAmbiguous || isAmbiguousCommercialSubtype(`${needText}\n${detailsText}`),
    [categoryAmbiguous, needText, detailsText]
  );

  const categorySuggestionOptions = useMemo(() => {
    const activeLeaf = selectedSubcategory || draftEntities?.subcategorySlug || selectedCategory || draftEntities?.categorySlug || '';
    if (getCategoryBySlug(activeLeaf)?.depth === 2) return [];
    const ruleCandidates = needDraft?.parsedIntent?.categoryCandidates;
    if (ruleCandidates && ruleCandidates.length > 0 && categorySuggestions.length === 0) {
      return ruleCandidates
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6)
        .map((c) => ({
          value: c.slug,
          label: c.label || categorySuggestionLabelFromSlug(c.slug),
        }));
    }
    return categorySuggestions.map((slug) => ({
      value: slug,
      label: categorySuggestionLabelFromSlug(slug),
    }));
  }, [categorySuggestions, needDraft?.parsedIntent?.categoryCandidates, selectedCategory, selectedSubcategory, draftEntities?.categorySlug, draftEntities?.subcategorySlug]);

  const intakeTemplate: IntakeTemplate = useMemo(() => {
    const base = resolveTemplate({
      categorySlug: selectedCategory || draftEntities?.categorySlug,
      subcategorySlug: selectedSubcategory || draftEntities?.subcategorySlug,
      vertical: draftEntities?.vertical,
      category: draftEntities?.category,
      transactionType: draftEntities?.transactionType,
    });
    if (!needDraft?.sections?.length) return base;
    return {
      ...base,
      sections: needDraft.sections.map((ds) => {
        const ts = base.sections.find((s) => s.key === ds.key);
        return {
          key: ds.key,
          label: ds.label,
          layout: ts?.layout,
          fields: [...new Set([...(ts?.fields ?? []), ...ds.fields])],
        };
      }),
    };
  }, [
    selectedCategory,
    selectedSubcategory,
    draftEntities?.categorySlug,
    draftEntities?.subcategorySlug,
    draftEntities?.vertical,
    draftEntities?.category,
    draftEntities?.transactionType,
    needDraft?.sections,
  ]);

  const applyCategorySlug = useCallback(
    (slug: string, opts?: { userInitiated?: boolean }) => {
      if (opts?.userInitiated) {
        categoryLockedByUserRef.current = true;
        setCategoryLockedByUser(true);
      }
      if (!slug.trim()) {
        onCategoryChange?.('', '');
        patchNeedDraftEntities({
          categorySlug: null,
          subcategorySlug: null,
          category: null,
        });
        return;
      }
      const normalized = normalizeCategoryPair(slug);
      onCategoryChange?.(normalized.categorySlug, normalized.subcategorySlug ?? '');
      patchNeedDraftEntities(inferCategoryEntities(normalized.categorySlug, normalized.subcategorySlug));
      if (opts?.userInitiated) {
        const current = getDraft();
        if (current) {
          setNeedDraft(
            recomputeNeedDraft({
              ...current,
              categoryLockedByUser: true,
              answers: { ...current.answers, _userSetCategory: true },
            })
          );
        }
      }
    },
    [onCategoryChange, patchNeedDraftEntities, inferCategoryEntities, getDraft, setNeedDraft]
  );

  const applyCategoryFromMegaMenu = useCallback(
    (payload: {
      slug: string;
      categorySlug: string;
      subcategorySlug: string | null;
    }) => {
      categoryLockedByUserRef.current = true;
      setCategoryLockedByUser(true);
      onCategoryChange?.(payload.categorySlug, payload.subcategorySlug ?? '');
      patchNeedDraftEntities(
        inferCategoryEntities(payload.categorySlug, payload.subcategorySlug)
      );
      const current = getDraft();
      if (current) {
        setNeedDraft(
          recomputeNeedDraft({
            ...current,
            categoryLockedByUser: true,
            answers: { ...current.answers, _userSetCategory: true },
          })
        );
      }
    },
    [onCategoryChange, patchNeedDraftEntities, inferCategoryEntities, getDraft, setNeedDraft]
  );

  const patchIntakeAnswer = useCallback(
    (key: string, value: string | number | string[]) => {
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

      const scalarAnswer = Array.isArray(value) ? value[0] ?? '' : String(value);
      const urgencyFromWhen =
        key === 'when'
          ? whenToUrgency(scalarAnswer)
          : key === 'urgency'
            ? scalarAnswer
            : undefined;

      // ودیعه ↔ رهن: same money in Iranian rent deals; keep answers in sync.
      const moneyMirror: Record<string, string | number | string[]> = {};
      if (key === 'deposit' || key === 'rahnAmount') {
        moneyMirror.deposit = answerValue;
        moneyMirror.rahnAmount = answerValue;
      }

      setNeedDraft(
        recomputeNeedDraft({
          ...base,
          answers: {
            ...base.answers,
            [key]: answerValue,
            ...moneyMirror,
            ...(key === 'dealType' ? { _userSetDealType: true } : {}),
          },
          ...(urgencyFromWhen
            ? {
                parsedIntent: {
                  ...base.parsedIntent,
                  urgency: urgencyFromWhen as NeedDraft['parsedIntent']['urgency'],
                },
              }
            : {}),
        })
      );
    },
    [getDraft, setNeedDraft]
  );

  const patchIntakeField = useCallback(
    (key: string, value: string | number | string[]) => {
      const meta = intakeTemplate.fieldMap[key];
      const draft = getDraft();
      const prevValue =
        meta?.storage === 'entity'
          ? draft?.entities?.[key]
          : draft?.answers?.[key];

      if (meta) {
        if (meta.storage === 'entity') {
          patchNeedDraftEntities(entityPatchForField(meta, value));
        } else {
          patchIntakeAnswer(key, value);
        }
      } else {
        patchIntakeAnswer(key, value);
      }

      trackFieldChange({
        fieldKey: key,
        fieldType: meta?.type ?? 'text',
        changedFrom: prevValue ?? null,
        changedTo: value,
        step: step as 'compose' | 'need' | 'details' | 'location' | 'preview',
      });
    },
    [intakeTemplate.fieldMap, patchIntakeAnswer, patchNeedDraftEntities, getDraft, step]
  );

  const intakeRenderContext: IntakeRenderContext = useMemo(
    () => ({
      needDraft,
      entities: draftEntities,
      answers: needDraft?.answers ?? {},
      selectedLeafCategorySlug,
      selectedCity,
      selectedNeighborhood,
      categorySuggestions: categorySuggestionOptions,
      commercialCategoryAmbiguous,
      categoryAmbiguous,
      onCategoryChange: (payload, opts) => {
        if (typeof payload === 'string') {
          applyCategorySlug(payload, opts);
          return;
        }
        applyCategoryFromMegaMenu(payload);
      },
      onFieldChange: patchIntakeField,
      ...locationContext,
    }),
    [
      needDraft,
      draftEntities,
      selectedLeafCategorySlug,
      selectedCity,
      selectedNeighborhood,
      categorySuggestionOptions,
      commercialCategoryAmbiguous,
      categoryAmbiguous,
      applyCategorySlug,
      applyCategoryFromMegaMenu,
      patchIntakeField,
      locationContext,
    ]
  );

  const intakeSectionKeysSig = needDraft?.sections?.map((s) => s.key).join('|') ?? '';
  const intakeFilledSig = [
    needDraft?.entities?.categorySlug,
    needDraft?.entities?.subcategorySlug,
    JSON.stringify(needDraft?.answers ?? {}),
  ].join('|');

  useEffect(() => {
    if (!needDraft?.sections?.length || step !== 'location') return;
    const template = resolveTemplateFromDraftEntities(recordToEntities(needDraft.entities));
    const validKeys = new Set(template.sections.map((s) => s.key));
    const computed = computeEnabledSectionsForLocation(needDraft);
    setEnabledSections((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        if (validKeys.has(key)) next.add(key);
      }
      for (const key of computed) {
        next.add(key);
      }
      return sectionKeysEqual(prev, next) ? prev : next;
    });
  }, [intakeSectionKeysSig, intakeFilledSig, step, needDraft]);

  const locationSectionFieldsSig =
    needDraft?.sections?.find((s) => s.key === 'location')?.fields.join(',') ?? '';

  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    const locationSection = needDraft.sections.find((s) => s.key === 'location');
    if (!locationSection || locationSection.fields.includes('neighborhood')) return;
    setNeedDraft(recomputeNeedDraft(needDraft));
  }, [step, locationSectionFieldsSig, needDraft, setNeedDraft]);

  const resetCategoryLocks = useCallback(() => {
    categoryLockedByUserRef.current = false;
    setCategoryLockedByUser(false);
    const current = getDraft();
    if (current) {
      setNeedDraft(
        recomputeNeedDraft({
          ...current,
          categoryLockedByUser: false,
          answers: { ...current.answers, _userSetCategory: false },
        })
      );
    }
  }, [getDraft, setNeedDraft]);

  const applyInitialCategoryIfNeeded = useCallback(
    (slug: string) => {
      if (initialCategoryAppliedRef.current || !slug.trim()) return;
      initialCategoryAppliedRef.current = true;
      // A top-level URL category is browsing context, not a form choice.
      // In particular `services` must not mask a property request in the text.
      if (getCategoryBySlug(slug.trim())?.depth !== 0) {
        applyCategorySlug(slug.trim());
      }
      const current = getDraft();
      if (current) {
        setNeedDraft({
          ...current,
          categoryHintSlug: slug.trim(),
          categoryLockedByUser: false,
        });
      }
    },
    [applyCategorySlug, getDraft, setNeedDraft]
  );

  return {
    intakeTemplate,
    intakeRenderContext,
    enabledSections,
    setEnabledSections,
    applyCategorySlug,
    resetCategoryLocks,
    applyInitialCategoryIfNeeded,
    categoryLockedByUserRef,
    categoryLockedByUser,
    initialCategoryAppliedRef,
    patchIntakeAnswer,
    patchIntakeField,
    selectedLeafCategorySlug,
    computeEnabledSectionsForLocation,
  };
}
