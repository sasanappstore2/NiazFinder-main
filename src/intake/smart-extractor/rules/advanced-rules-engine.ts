/**
 * Advanced rules engine — from SMART_INTAKE_IMPLEMENTATION_PLAN.md Step 2.2
 * Patterns: deposit+rent, full deposit, neighborhood, area, floor, rooms, amenities
 */

import type { AdvancedRulePatch, SmartTransactionType } from '../types';

interface ExtractionRule {
  id: string;
  field: string;
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray, text: string) => AdvancedRulePatch | null;
  confidence: number;
  priority: number;
}

export function parseAmount(value: string, unit: 'million' | 'billion' | 'raw' = 'million'): number {
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return 0;
  if (unit === 'raw') return n;
  if (unit === 'billion') return Math.round(n * 1_000_000_000);
  return Math.round(n * 1_000_000);
}

const EXTRACTION_RULES: ExtractionRule[] = [
  // Final rent/رهن correction after an earlier buy draft (Batch 10; beats buy_intent_override).
  {
    id: 'rent_intent_override',
    field: 'transaction',
    patterns: [
      /راستش\s*نه[\s\p{L}\d،,]{0,40}?می\s*خوام[\s\p{L}\d]{0,40}?(?:رهن|اجاره)\s*کنم/u,
      /راستش\s*(?:نه\s*)?می\s*خوام[\s\p{L}\d]{0,40}?(?:رهن|اجاره)\s*کنم/u,
      /در\s*واقع[\s\p{L}\d]{0,40}?(?:اجاره|رهن)\s*(?:می\s*خوام|کنم)?/u,
      /نه\s+می\s*خوام[\s\p{L}\d]{0,40}?(?:رهن|اجاره)\s*کنم/u,
    ],
    extractor: (_match, text) => {
      const hasDeposit = /رهن|ودیعه/u.test(text);
      const hasRent = /اجاره/u.test(text);
      let transactionType: SmartTransactionType = 'RENT';
      if (hasDeposit && hasRent) transactionType = 'DEPOSIT_AND_RENT';
      else if (hasDeposit && /رهن\s*کامل|فقط\s*رهن/u.test(text)) transactionType = 'FULL_DEPOSIT';
      else if (hasDeposit && !hasRent) transactionType = 'FULL_DEPOSIT';
      return { transactionType };
    },
    confidence: 0.94,
    priority: 13,
  },
  // Explicit buy correction / final buy intent beats earlier رهن+اجاره drafts (Batch 8/9).
  {
    id: 'buy_intent_override',
    field: 'transaction',
    patterns: [
      /راستش\s*می\s*خوام[\s\p{L}\d]{0,40}?بخرم/u,
      /در\s*واقع\s*(?:می\s*خوام[\s\p{L}\d]{0,40}?)?(?:بخرم|خرید)/u,
      /نه\s+می\s*خوام[\s\p{L}\d]{0,40}?بخرم/u,
      /(?<!ن)می\s*خوام[\s\p{L}\d]{0,40}?بخرم/u,
      /اجاره\s*نه\s*[,،]?\s*خرید/u,
      /رهن\s*(?:و\s*)?اجاره[\s\p{L}]{0,30}?(?:ولی|اما)?\s*(?:نه\s*)?(?:راستش\s*)?می\s*خوام\s*بخرم/u,
      /نه\s*بخرم\s*بهتره/u,
      /(?:^|\s)خرید(?:\s|$)/u,
    ],
    extractor: (_match, text) => {
      const patch: AdvancedRulePatch = { transactionType: 'BUY' as const };
      if (/پیش[\s‌-]*فروش|پیش[\s‌-]*خرید|پیشفروش/u.test(text)) {
        patch.categorySlug = 'pre-sale-services';
      }
      return patch;
    },
    confidence: 0.93,
    priority: 12,
  },
  {
    id: 'deposit_rent_combined',
    field: 'budget',
    patterns: [
      /(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)\s*رهن.*?(\d+(?:\.\d+)?)\s*(?:میلیون|تومان|تومن)?\s*اجاره/u,
      /رهن\s*(?:حدود|تقریبا|حدودا|تا)?\s*(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد).*?اجاره\s*(?:ماهی|ماهانه|ماه)?\s*(?:حدود|تقریبا|تا)?\s*(\d+(?:\.\d+)?)\s*(?:میلیون|تومان|تومن)?/u,
      /رهن\s*[:：]?\s*(\d+(?:\.\d+)?).*?اجاره\s*[:：]?\s*(\d+(?:\.\d+)?)/u,
      /ودیعه\s*[:：]?\s*(\d+(?:\.\d+)?).*?ماهانه\s*[:：]?\s*(\d+(?:\.\d+)?)/u,
    ],
    extractor: (match, text) => {
      const firstUnit: 'million' | 'billion' =
        text.includes('میلیارد') && text.indexOf('میلیارد') < (text.indexOf(match[2] ?? '') || text.length)
          ? 'billion'
          : 'million';
      return {
        depositAmount: parseAmount(match[1]!, firstUnit),
        rentAmount: parseAmount(match[2]!, 'million'),
        transactionType: 'DEPOSIT_AND_RENT' satisfies SmartTransactionType,
      };
    },
    confidence: 0.95,
    priority: 10,
  },
  {
    id: 'full_deposit',
    field: 'budget',
    patterns: [
      /رهن\s*کامل\s*(?:حدود|تقریبا|حدودا)?\s*(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)/u,
      /(?:حدود|تقریبا|حدودا)?\s*(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)\s*رهن\s*کامل/u,
      /فقط\s*رهن\s*(?:حدود|تقریبا|حدودا)?\s*(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)/u,
      /(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)\s*رهن\s*کامل/u,
    ],
    extractor: (match, text) => {
      // «رهن کامل نیست» must not become FULL_DEPOSIT
      if (/رهن\s*کامل\s*نیست/u.test(text)) return null;
      const idx = text.indexOf(match[1]!);
      const window = text.slice(Math.max(0, idx - 5), idx + match[1]!.length + 12);
      const isBillion = /میلیارد/.test(window) || (text.includes('میلیارد') && !/میلیون/.test(window));
      return {
        depositAmount: parseAmount(match[1]!, isBillion ? 'billion' : 'million'),
        transactionType: 'FULL_DEPOSIT',
      };
    },
    confidence: 0.95,
    priority: 9,
  },
  {
    id: 'rooms',
    field: 'property',
    patterns: [
      /(\d+)\s*خواب(?:ه|ه\s*خواب)?/u,
      /(\d+)\s*خوابه/u,
      /خواب\s*[:：]?\s*(\d+)/u,
      /(\d+)\s*bedroom/iu,
      /(\d+)\s*br\b/iu,
    ],
    extractor: (match) => {
      const rooms = parseInt(match[1]!, 10);
      if (rooms >= 1 && rooms <= 20) return { rooms };
      return null;
    },
    confidence: 0.92,
    priority: 8,
  },
  {
    id: 'area_advanced',
    field: 'property',
    patterns: [
      /(\d{2,4})\s*(?:متر|متری|مترمربع|m2|m²)/u,
      /(?:متراژ|مساحت|زیربنا)\s*[:：]?\s*(\d{2,4})/u,
    ],
    extractor: (match) => {
      const value = parseInt(match[1]!, 10);
      if (value >= 20 && value <= 10000) return { area: value };
      return null;
    },
    confidence: 0.9,
    priority: 7,
  },
  {
    id: 'floor_info',
    field: 'property',
    patterns: [
      /طبقه\s*(\d+)\s*از\s*(\d+)/u,
      /(\d+)\s*طبقه\s*از\s*(\d+)/u,
      /طبقه\s*(همکف|اول|دوم|سوم|چهارم|پنجم|ششم|\d+)/u,
    ],
    extractor: (match) => {
      if (match[2]) {
        return {
          floor: parseInt(match[1]!, 10),
          totalFloors: parseInt(match[2], 10),
        };
      }
      const floorWords: Record<string, number> = {
        همکف: 0,
        اول: 1,
        دوم: 2,
        سوم: 3,
        چهارم: 4,
        پنجم: 5,
        ششم: 6,
      };
      const raw = match[1]!;
      const floor = floorWords[raw] ?? parseInt(raw, 10);
      if (!Number.isFinite(floor)) return null;
      return { floor };
    },
    confidence: 0.85,
    priority: 6,
  },
  {
    id: 'neighborhood_with_context',
    field: 'location',
    patterns: [
      /(?:محله|منطقه|خیابان|بلوار|میدان|کوچه)\s+([؀-ۿا-یءٔآ]{2,30}?)(?=\s|،|,|\.|$|در|برای|با|نزدیک|تهران|مشهد|اصفهان|شیراز|کرج)/u,
      /(?:نزدیک|نبش|حوالی|اطراف)\s+([؀-ۿا-یءٔآ]{2,30}?)(?=\s|،|,|\.|$)/u,
      /(?:در|تو)\s+([؀-ۿا-یءٔآ]{2,20}?)(?=\s+(?:مشهد|تهران|اصفهان|شیراز|کرج)|،|,|\.|$)/u,
      /(سجاد|احمدآباد|وکیل[\s‌-]*آباد|کوه[\s‌-]*سنگی|قاسم[\s‌-]*آباد|الهیه|نیاوران|ونک|جردن|زعفرانیه|پاسداران|فرمانیه|تجریش|سعادت[\s‌-]*آباد|شهرک[\s‌-]*غرب|فردوسی|بنفشه|خیام|امامت)(?=$|\s|،|,|\.)/u,
    ],
    extractor: (match) => ({
      neighborhood: match[1]!.trim().replace(/\s+/g, ' '),
      needsDisambiguation: true,
    }),
    confidence: 0.8,
    priority: 5,
  },
  {
    id: 'buy_from_build_intent',
    field: 'budget',
    patterns: [
      /برای\s*ساخت/u,
      /می\s*خرم|میخرم|بخرم|خرید/u,
    ],
    extractor: () => ({
      transactionType: 'BUY' as const,
    }),
    confidence: 0.82,
    priority: 3,
  },
  {
    id: 'amenities',
    field: 'property',
    patterns: [/(پارکینگ|آسانسور|آسانسر|انباری)/u],
    extractor: (_match, text) => {
      const patch: AdvancedRulePatch = {};
      if (text.includes('پارکینگ')) patch.hasParking = true;
      if (text.includes('آسانسور') || text.includes('آسانسر')) patch.hasElevator = true;
      if (text.includes('انباری')) patch.hasStorage = true;
      return Object.keys(patch).length ? patch : null;
    },
    confidence: 0.9,
    priority: 4,
  },
];

export interface AdvancedRulesResult {
  patch: AdvancedRulePatch;
  rulesUsed: string[];
  confidenceByField: Record<string, number>;
}

/**
 * Apply advanced extraction rules (highest priority wins per field key).
 */
export function applyAdvancedRules(normalizedText: string): AdvancedRulesResult {
  const sorted = [...EXTRACTION_RULES].sort((a, b) => b.priority - a.priority);
  const patch: AdvancedRulePatch = {};
  const rulesUsed: string[] = [];
  const confidenceByField: Record<string, number> = {};
  const claimed = new Set<string>();

  for (const rule of sorted) {
    for (const pattern of rule.patterns) {
      const match = normalizedText.match(pattern);
      if (!match) continue;
      const extracted = rule.extractor(match, normalizedText);
      if (!extracted) continue;

      let applied = false;
      for (const [key, value] of Object.entries(extracted)) {
        if (value === undefined || value === null) continue;
        if (claimed.has(key)) continue;
        (patch as Record<string, unknown>)[key] = value;
        claimed.add(key);
        applied = true;
      }
      if (applied) {
        rulesUsed.push(rule.id);
        confidenceByField[rule.field] = Math.max(
          confidenceByField[rule.field] ?? 0,
          rule.confidence
        );
      }
      break;
    }
  }

  // Last-mentioned correction wins when both buy & rent override cues appear (Batch 11).
  const lastTx = lastCorrectionTransactionType(normalizedText);
  if (lastTx === 'BUY') {
    if (patch.transactionType !== 'BUY') {
      patch.transactionType = 'BUY';
      rulesUsed.push('last_intent_wins');
    }
  } else if (lastTx === 'RENT') {
    const isBuy = patch.transactionType === 'BUY' || patch.transactionType === 'SELL';
    if (isBuy || !patch.transactionType) {
      patch.transactionType = inferRentFamilyFromText(normalizedText);
      rulesUsed.push('last_intent_wins');
    }
  }

  // Deposit/rent ranges: «رهن ۲۰۰ تا ۳۰۰ میلیون، اجاره ۵ تا ۷» (Batch 11).
  const depositRange = normalizedText.match(
    /رهن\s*(?:حدود|تقریبا|از|بین)?\s*(\d+(?:\.\d+)?)\s*(?:تا|-)\s*(\d+(?:\.\d+)?)\s*میلیون/u
  );
  if (depositRange?.[1] && depositRange[2]) {
    const depositMin = parseAmount(depositRange[1], 'million');
    const depositMax = parseAmount(depositRange[2], 'million');
    patch.depositMin = depositMin;
    patch.depositMax = depositMax;
    if (patch.depositAmount == null) patch.depositAmount = depositMax;
    rulesUsed.push('deposit_range');
  }
  const rentRange = normalizedText.match(
    /اجاره\s*(?:ماهی|ماهانه|ماه)?\s*(?:حدود|تقریبا|از|بین)?\s*(\d+(?:\.\d+)?)\s*(?:تا|-)\s*(\d+(?:\.\d+)?)\s*میلیون/u
  );
  if (rentRange?.[1] && rentRange[2]) {
    const rentMin = parseAmount(rentRange[1], 'million');
    const rentMax = parseAmount(rentRange[2], 'million');
    patch.rentMin = rentMin;
    patch.rentMax = rentMax;
    if (patch.rentAmount == null) patch.rentAmount = rentMax;
    rulesUsed.push('rent_range');
  }

  return { patch, rulesUsed, confidenceByField };
}

function inferRentFamilyFromText(text: string): SmartTransactionType {
  const hasDeposit = /رهن|ودیعه/u.test(text);
  const hasRent = /اجاره/u.test(text);
  if (hasDeposit && hasRent) return 'DEPOSIT_AND_RENT';
  if (hasDeposit) return 'FULL_DEPOSIT';
  return 'RENT';
}

const BUY_CORRECTION_RES = [
  /راستش\s*می\s*خوام[\s\p{L}\d]{0,40}?بخرم/u,
  /در\s*واقع\s*(?:می\s*خوام[\s\p{L}\d]{0,40}?)?(?:بخرم|خرید)/u,
  /اجاره\s*نه\s*[,،]?\s*خرید/u,
  /نه\s*بخرم\s*بهتره/u,
];

const RENT_CORRECTION_RES = [
  /راستش\s*نه[\s\p{L}\d،,]{0,40}?می\s*خوام[\s\p{L}\d]{0,40}?(?:رهن|اجاره)\s*کنم/u,
  /راستش\s*(?:نه\s*)?می\s*خوام[\s\p{L}\d]{0,40}?(?:رهن|اجاره)\s*کنم/u,
  /در\s*واقع[\s\p{L}\d]{0,40}?(?:اجاره|رهن)\s*(?:می\s*خوام|کنم)?/u,
  /نه\s+می\s*خوام[\s\p{L}\d]{0,40}?(?:رهن|اجاره)\s*کنم/u,
];

function lastCorrectionTransactionType(
  text: string
): SmartTransactionType | null {
  let bestAt = -1;
  let best: SmartTransactionType | null = null;
  for (const re of BUY_CORRECTION_RES) {
    const m = text.match(re);
    if (m?.index != null && m.index >= bestAt) {
      bestAt = m.index;
      best = 'BUY';
    }
  }
  for (const re of RENT_CORRECTION_RES) {
    const m = text.match(re);
    if (m?.index != null && m.index >= bestAt) {
      bestAt = m.index;
      best = 'RENT';
    }
  }
  return best;
}

export const __testing = { EXTRACTION_RULES, parseAmount };
