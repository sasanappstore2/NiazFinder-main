import { z } from 'zod';
import type { ServiceAreaEntry } from '@/lib/business/ecosystem/types';
import type {
  CollaborationAreaBand,
  CollaborationBudgetBand,
  CollaborationPostIntent,
  CollaborationPostScope,
  CollaborationPropertyKind,
  CollaborationSubjectKind,
  RegionalCollaborationPost,
} from '@prisma/client';

export const COLLABORATION_INTENT_LABELS: Record<CollaborationPostIntent, string> = {
  CLIENT_REFERRAL: 'مشتری دارم',
  SEEK_PARTNER: 'همکار می‌خواهم',
  CO_SHOWING: 'بازدید مشترک',
};

export const COLLABORATION_SCOPE_LABELS: Record<CollaborationPostScope, string> = {
  REGIONAL: 'منطقه من',
  CROSS_REGIONAL: 'منطقه دیگر',
};

export const SUBJECT_KIND_LABELS: Record<CollaborationSubjectKind, string> = {
  CLIENT: 'مشتری',
  PROPERTY: 'فایل ملکی',
  JOINT_VISIT: 'هم‌بازدید',
};

export const PROPERTY_KIND_LABELS: Record<CollaborationPropertyKind, string> = {
  APARTMENT: 'آپارتمان',
  VILLA: 'ویلا',
  LAND: 'زمین',
  COMMERCIAL: 'تجاری',
  OTHER: 'سایر',
};

export const AREA_BAND_LABELS: Record<CollaborationAreaBand, string> = {
  UNDER_80: 'زیر ۸۰ متر',
  BAND_80_120: '۸۰–۱۲۰ متر',
  BAND_120_180: '۱۲۰–۱۸۰ متر',
  OVER_180: 'بالای ۱۸۰ متر',
};

export const BUDGET_BAND_LABELS: Record<CollaborationBudgetBand, string> = {
  SALE_UNDER_3B: 'زیر ۳ میلیارد',
  SALE_3_5B: '۳–۵ میلیارد',
  SALE_5_8B: '۵–۸ میلیارد',
  SALE_8_12B: '۸–۱۲ میلیارد',
  SALE_OVER_12B: 'بالای ۱۲ میلیارد',
  RENT_UNDER_10M: 'زیر ۱۰ میلیون',
  RENT_10_20M: '۱۰–۲۰ میلیون',
  RENT_20_40M: '۲۰–۴۰ میلیون',
  RENT_OVER_40M: 'بالای ۴۰ میلیون',
};

export const DEAL_TYPE_OPTIONS = [
  { value: 'sell', label: 'خرید' },
  { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
  { value: 'rent_rahn_full', label: 'رهن کامل' },
  { value: 'rent_short_term', label: 'اجاره روزانه' },
] as const;

export type CollaborationDealType = (typeof DEAL_TYPE_OPTIONS)[number]['value'];

const RENT_DEAL_TYPES = new Set<CollaborationDealType>([
  'rent_rahn_ejare',
  'rent_rahn_full',
  'rent_short_term',
]);

export function isRentDealType(dealType: string): boolean {
  return RENT_DEAL_TYPES.has(dealType as CollaborationDealType);
}

export const SALE_BUDGET_BANDS = [
  'SALE_UNDER_3B',
  'SALE_3_5B',
  'SALE_5_8B',
  'SALE_8_12B',
  'SALE_OVER_12B',
] as const satisfies readonly CollaborationBudgetBand[];

export const RENT_BUDGET_BANDS = [
  'RENT_UNDER_10M',
  'RENT_10_20M',
  'RENT_20_40M',
  'RENT_OVER_40M',
] as const satisfies readonly CollaborationBudgetBand[];

export type CollaborationTargetArea = {
  cityId: string;
  city: string;
  neighborhoodId: string;
  neighborhood: string;
};

const targetAreaSchema = z.object({
  cityId: z.string().min(1),
  city: z.string().trim().min(1).max(60),
  neighborhoodId: z.string().min(1),
  neighborhood: z.string().trim().min(1).max(80),
});

export const createStructuredCollaborationPostSchema = z
  .object({
    subjectKind: z.enum(['CLIENT', 'PROPERTY', 'JOINT_VISIT']),
    dealType: z.enum(['sell', 'rent_rahn_ejare', 'rent_rahn_full', 'rent_short_term']),
    propertyKind: z.enum(['APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL', 'OTHER']),
    areaBand: z
      .enum(['UNDER_80', 'BAND_80_120', 'BAND_120_180', 'OVER_180'])
      .optional()
      .nullable(),
    budgetBand: z
      .enum([
        'SALE_UNDER_3B',
        'SALE_3_5B',
        'SALE_5_8B',
        'SALE_8_12B',
        'SALE_OVER_12B',
        'RENT_UNDER_10M',
        'RENT_10_20M',
        'RENT_20_40M',
        'RENT_OVER_40M',
      ])
      .optional()
      .nullable(),
    targetAreas: z.array(targetAreaSchema).min(1).max(3),
  })
  .superRefine((data, ctx) => {
    const cityIds = new Set(data.targetAreas.map((a) => a.cityId));
    if (cityIds.size > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'همه محله‌ها باید در یک شهر باشند',
        path: ['targetAreas'],
      });
    }

    if (data.budgetBand) {
      const rent = isRentDealType(data.dealType);
      const isRentBand = data.budgetBand.startsWith('RENT_');
      if (rent !== isRentBand) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'بازه قیمت با نوع معامله همخوانی ندارد',
          path: ['budgetBand'],
        });
      }
    }
  });

export type CreateStructuredCollaborationPostInput = z.infer<
  typeof createStructuredCollaborationPostSchema
>;

/** @deprecated Use createStructuredCollaborationPostSchema */
export const createCollaborationPostSchema = createStructuredCollaborationPostSchema;

export function pickRegionalArea(
  areas: ServiceAreaEntry[],
  areaIndex?: number
): ServiceAreaEntry | null {
  if (!areas.length) return null;
  const idx = areaIndex ?? 0;
  return areas[idx] ?? areas[0] ?? null;
}

export function subjectKindToIntent(
  subjectKind: CollaborationSubjectKind
): CollaborationPostIntent {
  switch (subjectKind) {
    case 'CLIENT':
      return 'CLIENT_REFERRAL';
    case 'PROPERTY':
      return 'SEEK_PARTNER';
    case 'JOINT_VISIT':
      return 'CO_SHOWING';
    default:
      return 'CLIENT_REFERRAL';
  }
}

export function dealTypeLabel(dealType: string): string {
  return DEAL_TYPE_OPTIONS.find((d) => d.value === dealType)?.label ?? dealType;
}

export function parseTargetAreasJson(json: string | null | undefined): CollaborationTargetArea[] {
  if (!json || json === '[]') return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CollaborationTargetArea =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CollaborationTargetArea).cityId === 'string' &&
        typeof (item as CollaborationTargetArea).neighborhoodId === 'string'
    );
  } catch {
    return [];
  }
}

export function buildCollaborationHeadline(input: {
  subjectKind: CollaborationSubjectKind;
  dealType: string;
  propertyKind: CollaborationPropertyKind;
  areaBand?: CollaborationAreaBand | null;
  budgetBand?: CollaborationBudgetBand | null;
  targetAreas: CollaborationTargetArea[];
}): string {
  const segments: string[] = [
    `${SUBJECT_KIND_LABELS[input.subjectKind]} ${dealTypeLabel(input.dealType)} ${PROPERTY_KIND_LABELS[input.propertyKind]}`,
  ];

  if (input.areaBand) {
    segments.push(AREA_BAND_LABELS[input.areaBand]);
  }
  if (input.budgetBand) {
    segments.push(BUDGET_BAND_LABELS[input.budgetBand]);
  }

  const hoods = input.targetAreas.map((a) => a.neighborhood).filter(Boolean);
  if (hoods.length) {
    segments.push(hoods.join(' / '));
  }

  let headline = segments.join(' · ');
  if (headline.length > 120) {
    headline = `${headline.slice(0, 117)}…`;
  }
  return headline;
}

export function resolveCollaborationScope(
  targetAreas: CollaborationTargetArea[],
  authorAreas: ServiceAreaEntry[]
): CollaborationPostScope {
  if (!targetAreas.length || !authorAreas.length) return 'CROSS_REGIONAL';
  const targetCity = targetAreas[0]?.city;
  const matchesAuthor = authorAreas.some(
    (a) => normalizeToken(a.city) === normalizeToken(targetCity)
  );
  return matchesAuthor ? 'REGIONAL' : 'CROSS_REGIONAL';
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function areaMatchesCity(area: ServiceAreaEntry, city: string | null | undefined): boolean {
  const target = normalizeToken(city);
  if (!target) return false;
  return normalizeToken(area.city) === target || normalizeToken(area.city).includes(target);
}

function areaMatchesNeighborhood(
  area: ServiceAreaEntry,
  neighborhood: string | null | undefined,
  neighborhoodId: string | null | undefined
): boolean {
  if (neighborhoodId && area.neighborhoodId === neighborhoodId) return true;
  const target = normalizeToken(neighborhood);
  if (!target) return false;
  return normalizeToken(area.neighborhood) === target;
}

function legacyPostVisible(
  post: Pick<
    RegionalCollaborationPost,
    | 'scope'
    | 'city'
    | 'neighborhood'
    | 'neighborhoodId'
    | 'targetCity'
    | 'targetNeighborhood'
  >,
  areas: ServiceAreaEntry[]
): boolean {
  if (post.scope === 'REGIONAL') {
    return areas.some(
      (area) =>
        areaMatchesCity(area, post.city) ||
        areaMatchesNeighborhood(area, post.neighborhood, post.neighborhoodId)
    );
  }

  return areas.some(
    (area) =>
      areaMatchesCity(area, post.targetCity) ||
      areaMatchesNeighborhood(area, post.targetNeighborhood, null)
  );
}

export function isCollaborationPostVisibleToAreas(
  post: Pick<
    RegionalCollaborationPost,
    | 'scope'
    | 'city'
    | 'neighborhood'
    | 'neighborhoodId'
    | 'targetCity'
    | 'targetNeighborhood'
    | 'targetAreasJson'
    | 'status'
  >,
  areas: ServiceAreaEntry[]
): boolean {
  if (post.status !== 'active') return false;
  if (!areas.length) return false;

  const targets = parseTargetAreasJson(post.targetAreasJson);
  if (targets.length > 0) {
    return targets.some((target) =>
      areas.some(
        (area) =>
          areaMatchesCity(area, target.city) ||
          areaMatchesNeighborhood(area, target.neighborhood, target.neighborhoodId)
      )
    );
  }

  return legacyPostVisible(post, areas);
}

export function collaborationTypeLabel(post: {
  subjectKind?: CollaborationSubjectKind | null;
  intent: CollaborationPostIntent;
}): string {
  if (post.subjectKind) {
    return SUBJECT_KIND_LABELS[post.subjectKind];
  }
  return COLLABORATION_INTENT_LABELS[post.intent];
}

export type CollaborationPostAreaInput = {
  scope: CollaborationPostScope;
  city: string | null;
  neighborhood: string | null;
  targetCity: string | null;
  targetNeighborhood: string | null;
  targetAreasJson?: string | null;
};

export function formatCollaborationPostArea(post: CollaborationPostAreaInput): string {
  const targets = parseTargetAreasJson(post.targetAreasJson);
  if (targets.length > 0) {
    const city = targets[0]?.city;
    const hoods = targets.map((t) => t.neighborhood).join(' / ');
    return city ? `${city} · ${hoods}` : hoods;
  }

  if (post.scope === 'CROSS_REGIONAL') {
    const parts = [post.targetNeighborhood, post.targetCity].filter(Boolean);
    return parts.length ? `منطقه دیگر: ${parts.join('، ')}` : 'منطقه دیگر';
  }
  const parts = [post.neighborhood, post.city].filter(Boolean);
  return parts.join('، ') || 'منطقه من';
}
