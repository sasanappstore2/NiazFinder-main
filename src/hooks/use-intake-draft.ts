'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NeedDraft } from '@/contracts/need-intake';
import { categorySuggestionLabelFromSlug } from '@/lib/categories/format-category-suggestion-label';
import {
  getCategoryBySlug,
  normalizeCategoryPair,
} from '@/config/categories';
import { suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';
import { composeIntakeSourceText } from '@/lib/need-intake/compose-source-text';
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
import type { IntakeRenderContext } from '@/intake/rendering/types';
import type { IntakeTemplate } from '@/intake/template/types';
import { trackFieldChange } from '@/intake/telemetry/postIntakeTelemetry';

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
  for (const section of draft.sections ?? []) {
    if (template.mandatorySectionKeys.has(section.key)) {
      next.add(section.key);
    }
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
  const initialCategoryAppliedRef = useRef(false);

  const selectedLeafCategorySlug = selectedSubcategory || selectedCategory;

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

  const categorySuggestionOptions = useMemo(() => {
    return categorySuggestions.map((slug) => ({
      value: slug,
      label: categorySuggestionLabelFromSlug(slug),
    }));
  }, [categorySuggestions]);

  const draftEntities = needDraft ? recordToEntities(needDraft.entities) : null;

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
      onCategoryChange?.(payload.categorySlug, payload.subcategorySlug ?? '');
      patchNeedDraftEntities(
        inferCategoryEntities(payload.categorySlug, payload.subcategorySlug)
      );
      const current = getDraft();
      if (current) {
        setNeedDraft(
          recomputeNeedDraft({
            ...current,
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
        step: step as 'need' | 'details' | 'location' | 'preview',
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
      applyCategorySlug,
      applyCategoryFromMegaMenu,
      patchIntakeField,
      locationContext,
    ]
  );

  const intakeSectionKeysSig = needDraft?.sections?.map((s) => s.key).join('|') ?? '';

  useEffect(() => {
    if (!needDraft?.sections?.length || step !== 'location') return;
    const template = resolveTemplateFromDraftEntities(recordToEntities(needDraft.entities));
    const validKeys = new Set(needDraft.sections.map((s) => s.key));
    setEnabledSections((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        if (validKeys.has(key)) next.add(key);
      }
      for (const section of needDraft.sections) {
        if (template.mandatorySectionKeys.has(section.key)) {
          next.add(section.key);
        }
      }
      return sectionKeysEqual(prev, next) ? prev : next;
    });
  }, [intakeSectionKeysSig, step, needDraft]);

  const locationSectionFieldsSig =
    needDraft?.sections?.find((s) => s.key === 'location')?.fields.join(',') ?? '';

  useEffect(() => {
    if (step !== 'location' || !needDraft) return;
    const locationSection = needDraft.sections.find((s) => s.key === 'location');
    if (!locationSection || locationSection.fields.includes('neighborhood')) return;
    setNeedDraft(recomputeNeedDraft(needDraft));
  }, [step, locationSectionFieldsSig, needDraft, setNeedDraft]);

  return {
    intakeTemplate,
    intakeRenderContext,
    enabledSections,
    setEnabledSections,
    applyCategorySlug,
    categoryLockedByUserRef,
    initialCategoryAppliedRef,
    patchIntakeAnswer,
    patchIntakeField,
    selectedLeafCategorySlug,
    computeEnabledSectionsForLocation,
  };
}
