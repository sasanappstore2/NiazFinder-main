import type { NeedDraft } from '@/contracts/need-intake';
import type {
  NeedIntelligenceProfile,
  NeedMotivation,
  NeedUrgency,
} from '@/contracts/need-intelligence';
import { PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import { inferV2DealType } from '@/lib/intake-v2/v2-essential-fields';

function uniq(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

function mergeStringLists(
  base: string[] | undefined,
  next: string[] | undefined
): string[] | undefined {
  const merged = uniq([...(base ?? []), ...(next ?? [])]);
  return merged.length ? merged : undefined;
}

function mergeProfiles(
  base: NeedIntelligenceProfile,
  patch: NeedIntelligenceProfile
): NeedIntelligenceProfile {
  return {
    ...base,
    ...patch,
    location: patch.location ? { ...base.location, ...patch.location } : base.location,
    budget: patch.budget ? { ...base.budget, ...patch.budget } : base.budget,
    area: patch.area ? { ...base.area, ...patch.area } : base.area,
    mustHave: mergeStringLists(base.mustHave, patch.mustHave),
    niceToHave: mergeStringLists(base.niceToHave, patch.niceToHave),
    priorities: mergeStringLists(base.priorities, patch.priorities),
    lifestyleSignals: mergeStringLists(base.lifestyleSignals, patch.lifestyleSignals),
    locationPreferences: mergeStringLists(base.locationPreferences, patch.locationPreferences),
    freeformNotes: mergeStringLists(base.freeformNotes, patch.freeformNotes),
  };
}

function inferUrgency(text: string): NeedUrgency | undefined {
  if (/فوری|همین\s*امروز|الان|زود\s*تر/i.test(text)) return 'URGENT';
  if (/تا\s*آخر\s*ماه|این\s*هفته|زود/i.test(text)) return 'HIGH';
  if (/عجله\s*ندار|آرام|وقت\s*دار/i.test(text)) return 'LOW';
  return undefined;
}

function inferMotivation(text: string): NeedMotivation | undefined {
  if (/مزون|مغازه|دفتر|تجاری|کسب|فروشگاه|کسب\s*و\s*کار/i.test(text)) return 'business';
  if (/سرمایه|سود|اجاره\s*دادن/i.test(text)) return 'investment';
  if (/سکونت|زندگی|خانواده|ساکن/i.test(text)) return 'residence';
  if (/مهاجرت|خارج/i.test(text)) return 'migration';
  return undefined;
}

function extractLocationPreferences(text: string): string[] {
  const prefs: string[] = [];
  const pasaj = text.match(/پاساژ\s+([^\s،.\n]+)/u);
  if (pasaj?.[1]) prefs.push(`پاساژ ${pasaj[1].trim()}`);
  if (/نزدیک\s*مترو|کنار\s*مترو/i.test(text)) prefs.push('نزدیک مترو');
  if (/نزدیک\s*مدرسه/i.test(text)) prefs.push('نزدیک مدرسه');
  return prefs;
}

function extractMustHave(text: string): string[] {
  const items: string[] = [];
  if (/حتما\s*همکف|فقط\s*همکف|هم\s*کف\s*باش/i.test(text)) items.push('همکف');
  if (/پارکینگ\s*دار|حتما\s*پارکینگ/i.test(text)) items.push('پارکینگ');
  if (/انباری\s*دار|حتما\s*انباری|با\s*انباری/i.test(text)) items.push('انباری');
  if (/نور\s*گیر|نور\s*خوب/i.test(text)) items.push('نورگیر');
  return items;
}

function extractNiceToHave(text: string): string[] {
  const items: string[] = [];
  if (/ترجیح|بهتر\s*باش|دوست\s*دار|هم\s*باشه/i.test(text)) {
    const pasaj = text.match(/پاساژ\s+([^\s،.\n]+)/u);
    if (pasaj?.[1]) items.push(`پاساژ ${pasaj[1].trim()}`);
  }
  return items;
}

function parseLocationFromDraft(draft: NeedDraft): NeedIntelligenceProfile['location'] {
  const loc = String(draft.answers.location ?? '').trim();
  const parts = loc.split(/[،,]/).map((p) => p.trim()).filter(Boolean);
  const city = draft.parsedIntent.city ?? (parts.length >= 2 ? parts[parts.length - 1] : parts[0]);
  const neighborhood =
    parts.length >= 2
      ? parts[0]
      : draft.parsedIntent.entities?.area ?? undefined;
  return {
    city: city ?? undefined,
    neighborhood: neighborhood ?? undefined,
  };
}

/** Rule-based Core / Decision / Smart extraction from cumulative chat text. */
export function extractV2Intelligence(
  rawText: string,
  draft: NeedDraft
): NeedIntelligenceProfile {
  const norm = normalizeIntakeText(rawText);
  const slots = extractPropertySlotsFromText(rawText);
  const dealType = inferV2DealType(
    draft.parsedIntent.categorySlug,
    draft.answers,
    draft.parsedIntent.entities ?? {}
  );
  const kind = String(
    draft.answers.propertyKind ?? draft.parsedIntent.entities?.propertyKind ?? ''
  );

  const approximate = /حدود(?:اً|ا)/u.test(norm);
  const areaMin = draft.answers.areaMin ?? (slots.areaMin ? Number(slots.areaMin) : undefined);
  const areaMax = draft.answers.areaMax ?? (slots.areaMax ? Number(slots.areaMax) : undefined);

  const patch: NeedIntelligenceProfile = {
    transaction: dealType || undefined,
    propertyType: kind ? (PROPERTY_KIND_LABELS[kind] ?? kind) : undefined,
    location: parseLocationFromDraft(draft),
    budget:
      draft.answers.budget != null
        ? { max: Number(draft.answers.budget) }
        : draft.parsedIntent.budgetMax
          ? { max: draft.parsedIntent.budgetMax }
          : undefined,
    area:
      areaMin != null || areaMax != null
        ? {
            min: areaMin != null ? Number(areaMin) : undefined,
            max: areaMax != null ? Number(areaMax) : undefined,
            approximate: approximate || undefined,
          }
        : undefined,
    urgency: inferUrgency(norm),
    motivation: inferMotivation(norm),
    mustHave: extractMustHave(norm),
    niceToHave: extractNiceToHave(norm),
    locationPreferences: extractLocationPreferences(norm),
    lifestyleSignals: /مدرسه|مترو|خانواده|بچه/i.test(norm)
      ? ['خانواده/محله']
      : undefined,
  };

  if (draft.answers.deposit != null || draft.answers.monthlyRent != null) {
    patch.financialStatus = 'mixed';
  }

  return mergeProfiles(draft.intelligenceProfile ?? {}, patch);
}
