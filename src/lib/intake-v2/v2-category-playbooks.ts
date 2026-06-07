import type { FieldOption, NeedDraft } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
} from '@/config/need-schemas/labels';
import { REAL_ESTATE_LEAF_SLUGS } from '@/lib/need-intake/dataset/real-estate-leaf-slugs';
import { getV2RequiredFieldKeys } from '@/lib/intake-v2/v2-essential-fields';
import {
  areaPresetChips,
  budgetPresetChips,
  depositPresetChips,
  floorPresetChips,
  monthlyRentPresetChips,
  roomsPresetChips,
} from '@/lib/intake-v2/v2-chip-presets';

function dealTypeChips(): FieldOption[] {
  return Object.entries(PROPERTY_DEAL_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

function propertyKindChips(): FieldOption[] {
  return Object.entries(PROPERTY_KIND_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

export interface PlaybookContext {
  draft: NeedDraft;
  fieldKey: string;
}

export interface CategoryPlaybook {
  slug: string;
  fieldOrder: string[];
  questionTemplates: Record<string, (ctx: PlaybookContext) => string>;
  chipPresets: Record<string, () => FieldOption[]>;
  skipAllowed: string[];
  synonyms: string[];
}

const DEFAULT_QUESTIONS: Record<string, (ctx: PlaybookContext) => string> = {
  dealType: () => 'نوع معامله چیه؟ خرید، فروش، اجاره یا رهن؟',
  propertyKind: () => 'چه نوع ملکی می‌خواهید؟',
  location: () => 'کدام شهر و محله دقیق مدنظر است؟',
  budget: (ctx) => `برای ${ctxLabel(ctx)}، بودجه تقریبی چقدر است؟`,
  deposit: (ctx) => `برای ${ctxLabel(ctx)}، مبلغ ودیعه (رهن) چقدر در نظر دارید؟`,
  monthlyRent: (ctx) => `برای ${ctxLabel(ctx)}، اجاره ماهانه چقدر مناسب است؟`,
  rahnAmount: (ctx) => `برای ${ctxLabel(ctx)}، مبلغ رهن چقدر باشد؟`,
  rooms: (ctx) => `برای ${ctxLabel(ctx)}، چند خواب می‌خواهید؟`,
  areaMin: (ctx) => `برای ${ctxLabel(ctx)}، متراژ تقریباً چقدر می‌خواهید؟`,
  floorMin: (ctx) => `برای ${ctxLabel(ctx)}، طبقه مدنظر کدام است؟`,
  nightlyRent: (ctx) => `برای ${ctxLabel(ctx)}، اجاره روزانه چقدر مناسب است؟`,
  guestCount: () => 'تعداد نفر یا مهمان چند نفر است؟',
};

function ctxLabel(ctx: PlaybookContext): string {
  const path = getCategoryPath(ctx.draft.parsedIntent.categorySlug);
  const leaf = path[path.length - 1]?.title ?? 'ملک';
  const parsed = ctx.draft.parsedIntent;
  const hood =
    parsed.entities?.area ??
    (parsed.neighborhoodSlug ? String(parsed.neighborhoodSlug) : '');
  const city = parsed.city ?? '';
  if (hood && city) return `${leaf} در ${hood}، ${city}`;
  if (city) return `${leaf} — ${city}`;
  return leaf;
}

function baseFieldOrder(slug: string, dealType: string): string[] {
  return getV2RequiredFieldKeys(slug, dealType);
}

function buildPlaybook(slug: string): CategoryPlaybook {
  const isCommercial = /^(shop|office)-/.test(slug);
  const isLand = slug.startsWith('land-');
  const isShort = /short-rent|suite-apartment-rent|workspace-short-rent/.test(slug);

  const synonyms: string[] = [];
  if (isCommercial) synonyms.push('مزون', 'مغازه', 'غرفه', 'ویترین', 'سرقفلی');
  if (slug.includes('apartment')) synonyms.push('آپارتمان', 'واحد');
  if (slug.includes('villa')) synonyms.push('ویلا', 'خانه');
  if (isLand) synonyms.push('زمین', 'کلنگی');
  if (/^industrial-/.test(slug)) synonyms.push('انبار', 'سوله', 'صنعتی');
  if (slug.includes('apartment')) synonyms.push('انباری', 'پارکینگ');

  const chipPresets: Record<string, () => FieldOption[]> = {
    dealType: dealTypeChips,
    propertyKind: propertyKindChips,
    deposit: depositPresetChips,
    monthlyRent: monthlyRentPresetChips,
    budget: budgetPresetChips,
    areaMin: areaPresetChips,
    floorMin: floorPresetChips,
    rooms: roomsPresetChips,
  };

  const skipAllowed = isShort ? ['guestCount', 'nightlyRent'] : ['details'];

  return {
    slug,
    fieldOrder: baseFieldOrder(slug, 'rent_monthly'),
    questionTemplates: { ...DEFAULT_QUESTIONS },
    chipPresets,
    skipAllowed,
    synonyms,
  };
}

const PLAYBOOKS = new Map<string, CategoryPlaybook>();

for (const slug of REAL_ESTATE_LEAF_SLUGS) {
  PLAYBOOKS.set(slug, buildPlaybook(slug));
}

PLAYBOOKS.set('residential-rent', buildPlaybook('apartment-rent'));
PLAYBOOKS.set('residential-sale', buildPlaybook('apartment-sale'));
PLAYBOOKS.set('commercial-rent', buildPlaybook('shop-rent'));

export function getCategoryPlaybook(categorySlug: string): CategoryPlaybook {
  return PLAYBOOKS.get(categorySlug) ?? buildPlaybook('apartment-rent');
}

export function getPlaybookFieldOrder(categorySlug: string): string[] {
  return getCategoryPlaybook(categorySlug).fieldOrder;
}

export function getPlaybookQuestion(
  draft: NeedDraft,
  fieldKey: string
): string {
  const playbook = getCategoryPlaybook(draft.parsedIntent.categorySlug);
  const ctx: PlaybookContext = { draft, fieldKey };
  const fn =
    playbook.questionTemplates[fieldKey] ?? DEFAULT_QUESTIONS[fieldKey];
  if (fn) return fn(ctx);
  return `لطفاً ${fieldKey} را بگویید.`;
}

export function getPlaybookChips(
  draft: NeedDraft,
  fieldKey: string
): FieldOption[] | undefined {
  const playbook = getCategoryPlaybook(draft.parsedIntent.categorySlug);
  const factory = playbook.chipPresets[fieldKey];
  return factory?.();
}

export function isFieldSkippable(categorySlug: string, fieldKey: string): boolean {
  return getCategoryPlaybook(categorySlug).skipAllowed.includes(fieldKey);
}
