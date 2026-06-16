import { createHash } from 'crypto';
import { getCategoryPath } from '@/config/categories';
import type { NeedDraft, ParsedIntent, IntentType } from '@/contracts/need-intake';
import {
  recomputeNeedDraft,
  syncNeedDraftFromForm,
} from '@/intake/aggregate/needDraftAggregate';
import { getIntentsForCategory } from '@/config/need-intents';
import { getEffectiveIntakeSchema } from '@/lib/need-intake/essential-intake-schema';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import type { IntakeFieldBag, IntakeIntelligenceInput } from '@/intake/intelligence-engine/types';
import { fieldBagToRecord } from '@/intake/intelligence-engine/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import type { MissingFieldItem, WizardQuestion } from '@/intake/types';
import { buildNextQuestion } from '@/intake/wizard/wizardBuilder';
import { recordToEntities } from '@/intake/entities/entityRecord';

export interface NeedBuilderInput {
  sourceText: string;
  fields: IntakeFieldBag;
  gaps: IntakeParseGap[];
  formHints?: IntakeIntelligenceInput['formHints'];
  existingDraft?: NeedDraft | null;
}

export interface NeedBuilderOutput {
  draft: NeedDraft;
  parsedIntent: ParsedIntent;
  missingFields: MissingFieldItem[];
  nextQuestion: WizardQuestion | null;
}

function fieldBagToAnswers(fields: IntakeFieldBag): Record<string, string | number | boolean> {
  const answers: Record<string, string | number | boolean> = {};
  const set = (k: string, v: unknown) => {
    if (v == null || v === '') return;
    answers[k] = typeof v === 'number' ? v : String(v);
  };
  set('dealType', fields.dealType?.value);
  set('propertyKind', fields.propertyKind?.value);
  set('areaMin', fields.area?.value);
  set('rahnAmount', fields.rahnAmount?.value);
  set('monthlyRent', fields.monthlyRent?.value);
  set('deposit', fields.deposit?.value);
  set('budget', fields.budgetMax?.value);
  set('rooms', fields.rooms?.value);
  if (fields.neighborhood?.value && fields.city?.value) {
    answers.location = `${fields.neighborhood.value}? ${fields.city.value}`;
  } else if (fields.city?.value) {
    answers.location = String(fields.city.value);
  }
  if (fields.neighborhoodSlug?.value) {
    answers._neighborhoodSlug = String(fields.neighborhoodSlug.value);
  }
  return answers;
}

function resolveIntentForCategory(
  leafSlug: string,
  parsed: ParsedIntent,
  sourceText: string,
  categoryLocked: boolean
): IntentType {
  const allowed = getIntentsForCategory(leafSlug);
  const offers = /\u0641\u0631\u0648\u0634|\u0645\u06CC\u0641\u0631\u0648\u0634|\u0622\u06AF\u0647\u06CC/u.test(sourceText);
  const seeks = /\u0645\u06CC\u062E\u0648\u0627\u0645|\u062F\u0646\u0628\u0627\u0644|\u0646\u06CC\u0627\u0632/u.test(sourceText);
  const root = getCategoryPath(leafSlug)[0]?.slug ?? '';
  if (categoryLocked && root) {
    if (root === 'services') return 'service_request';
    if (root === 'jobs') return 'job_search';
    if (root === 'vehicles') {
      if (offers && allowed.includes('vehicle_listing')) return 'vehicle_listing';
      return 'vehicle_search';
    }
    if (
      root === 'electronics' ||
      root === 'home-appliances' ||
      root === 'personal-items' ||
      root === 'entertainment'
    ) {
      if (offers && allowed.includes('product_listing')) return 'product_listing';
      return 'product_search';
    }
    if (root === 'real-estate') {
      if (offers && allowed.includes('property_listing')) return 'property_listing';
      return 'property_search';
    }
  }

  if (allowed.includes(parsed.intentType)) return parsed.intentType;
  if (offers && allowed.includes('product_listing')) return 'product_listing';
  if (offers && allowed.includes('vehicle_listing')) return 'vehicle_listing';
  if (offers && allowed.includes('property_listing')) return 'property_listing';
  if (seeks && allowed.includes('product_search')) return 'product_search';
  if (seeks && allowed.includes('vehicle_search')) return 'vehicle_search';
  if (seeks && allowed.includes('property_search')) return 'property_search';
  if (allowed.includes('job_search')) return 'job_search';
  return allowed[0] ?? parsed.intentType;
}

function filterAnswersToSchema(
  answers: Record<string, unknown>,
  intentType: IntentType,
  categorySlug: string,
  parsed: ParsedIntent
): Record<string, string | number | boolean | string[]> {
  const schema = getEffectiveIntakeSchema(intentType, categorySlug, parsed, answers);
  const allowed = new Set(schema.fields.map((f) => f.key));
  const out: Record<string, string | number | boolean | string[]> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!allowed.has(k) && !k.startsWith('_')) continue;
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      (Array.isArray(v) && v.every((item) => typeof item === 'string'))
    ) {
      out[k] = v;
    }
  }
  return out;
}

function entitiesForLockedCategory(
  parsedEntities: ParsedIntent['entities'] | undefined,
  leafSlug: string,
  locked: boolean
): ParsedIntent['entities'] {
  if (!locked || !parsedEntities) return parsedEntities ?? {};
  const root = getCategoryPath(leafSlug)[0]?.slug ?? '';
  const out = { ...parsedEntities };
  const stripAlways = ['vehicleKind', 'propertyKind', 'dealType', 'serviceKind'] as const;
  for (const key of stripAlways) {
    if (root === 'real-estate' && key === 'propertyKind') continue;
    if (root === 'vehicles' && key === 'vehicleKind') continue;
    delete out[key];
  }
  return out;
}

/** Sole module allowed to produce parsedIntent, listingPreview, completion scores. */
export function buildNeedFromFields(input: NeedBuilderInput): NeedBuilderOutput {
  const { sourceText, fields, formHints, existingDraft } = input;
  const parsedBase = parseIntentFromText(sourceText);
  const categoryLocked = formHints?.categoryLockedByUser ?? false;

  const categorySlug = String(fields.categorySlug?.value ?? parsedBase.categorySlug ?? '');
  const subcategorySlug = String(
    fields.subcategorySlug?.value ?? parsedBase.subcategorySlug ?? ''
  );
  const leafSlug = subcategorySlug || categorySlug;

  const form = {
    needText: sourceText,
    detailsText: '',
    categorySlug: formHints?.categorySlug ?? categorySlug,
    subcategorySlug: formHints?.subcategorySlug ?? subcategorySlug,
    city: String(fields.city?.value ?? formHints?.city ?? parsedBase.city ?? ''),
    neighborhood: String(fields.neighborhood?.value ?? formHints?.neighborhood ?? ''),
    neighborhoodSlug: fields.neighborhoodSlug?.value
      ? String(fields.neighborhoodSlug.value)
      : null,
  };

  let draft = syncNeedDraftFromForm(existingDraft ?? null, form, {
    categoryLockedByUser: formHints?.categoryLockedByUser,
  });

  const answers = fieldBagToAnswers(fields);
  const intentType = categoryLocked
    ? resolveIntentForCategory(leafSlug, parsedBase, sourceText, categoryLocked)
    : parsedBase.intentType;

  draft = recomputeNeedDraft({
    ...draft,
    answers: filterAnswersToSchema(
      { ...draft.answers, ...answers },
      intentType,
      leafSlug,
      draft.parsedIntent
    ),
    fieldMeta: fieldBagToRecord(fields),
    parsedIntent: {
      ...draft.parsedIntent,
      ...(categoryLocked
        ? {
            city: parsedBase.city,
            urgency: parsedBase.urgency,
            confidence: parsedBase.confidence,
          }
        : parsedBase),
      intentType,
      categorySlug: categoryLocked ? leafSlug : categorySlug || parsedBase.categorySlug,
      subcategorySlug: subcategorySlug || parsedBase.subcategorySlug,
      city: form.city || parsedBase.city,
      parseGaps: input.gaps.map((g) => ({
        id: g.id,
        kind: g.kind === 'clarify' ? 'uncertain' : g.kind,
        messageFa: g.messageFa,
        fieldKey: g.fieldKey,
      })),
      entities: {
        ...entitiesForLockedCategory(parsedBase.entities, leafSlug, categoryLocked),
        ...(fields.dealType?.value ? { dealType: String(fields.dealType.value) } : {}),
        ...(fields.propertyKind?.value ? { propertyKind: String(fields.propertyKind.value) } : {}),
        ...(fields.area?.value != null ? { areaMin: String(fields.area.value) } : {}),
        ...(fields.rahnAmount?.value != null
          ? { rahnAmount: String(fields.rahnAmount.value) }
          : {}),
        ...(fields.monthlyRent?.value != null
          ? { monthlyRent: String(fields.monthlyRent.value) }
          : {}),
      },
    },
  });

  const slotExtras = extractPropertySlotsFromText(sourceText);
  if (slotExtras.nightlyRent) {
    draft = recomputeNeedDraft({
      ...draft,
      answers: { ...draft.answers, nightlyRent: Number(slotExtras.nightlyRent) },
      parsedIntent: {
        ...draft.parsedIntent,
        entities: {
          ...draft.parsedIntent.entities,
          nightlyRent: slotExtras.nightlyRent,
          ...(slotExtras.nightlyRent && !draft.parsedIntent.entities?.dealType
            ? { dealType: 'rent_short_term' }
            : {}),
        },
      },
    });
  }

  const titleResult = resolveDeterministicListingTitle(draft);
  const listing = composeListingFromDraft(draft);
  draft = recomputeNeedDraft({
    ...draft,
    listingPreview: {
      title: titleResult.title,
      description: listing.description,
      titleSource: 'template',
      descriptionSource: 'template',
    },
  });

  const entities = recordToEntities(draft.entities);
  const nextQuestion = buildNextQuestion(entities, draft.missingFields ?? []);

  return {
    draft,
    parsedIntent: draft.parsedIntent,
    missingFields: draft.missingFields,
    nextQuestion,
  };
}

export function buildTraceId(sourceText: string): string {
  return createHash('sha256').update(sourceText.trim()).digest('hex').slice(0, 16);
}
