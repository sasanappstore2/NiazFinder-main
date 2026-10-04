import 'server-only';

import { getCategoryBySlug, normalizeCategoryPair } from '@/config/categories';
import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import {
  classifyVertical,
  type ClassifierVertical,
} from '@/lib/need-intake/vertical-classifier';
import type { IntentType } from '@/contracts/need-intake';
import type { CategoryCandidateOption } from '@/contracts/need-intake';
import {
  candidateToCategoryMatchResult,
  matchCategoryCandidatesFromRules,
  matchCategoryFromRules,
  pickClearCategoryFromRules,
} from '@/intake/rules/registry.server';
import { isCategoryAmbiguous } from '@/intake/rules/registry-match';
import {
  isDisambigAiEnabled,
  isIntakeAiGloballyDisabled,
  REGISTRY_CATEGORY_OVERRIDE_THRESHOLD,
  RULES_CATEGORY_MIN_CONFIDENCE,
} from '@/intake/rules/config';
import type { CategoryMatchCandidate, CategoryMatchResult } from '@/intake/rules/types';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import {
  INTENT_SLICE_INTENT_TYPES,
  INTENT_SLICE_VERTICALS,
} from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import {
  buildCategoryIntentPickPrompt,
  buildCategoryIntentSuggestPrompt,
  CATEGORY_INTENT_SYSTEM_PROMPT,
  type CategoryIntentLlmPayload,
} from '@/intake/intelligence-engine/category/category-intent-prompt';

export type CategoryIntentMethod =
  | 'rules-clear'
  | 'rules-ambiguous'
  | 'ai-pick'
  | 'ai-suggest-revalidate'
  | 'rules-fallback'
  | 'unresolved'
  | 'locked';

export interface CategoryIntentEngineResult {
  match: CategoryMatchResult | null;
  candidates: CategoryMatchCandidate[];
  ambiguous: boolean;
  intent: IntentSliceResult | null;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  method: CategoryIntentMethod;
}

function isVertical(v: string): v is ClassifierVertical {
  return (INTENT_SLICE_VERTICALS as readonly string[]).includes(v);
}

function isIntentType(v: string): v is IntentType {
  return (INTENT_SLICE_INTENT_TYPES as readonly string[]).includes(v);
}

function intentTypeFromVertical(vertical: ClassifierVertical, text: string): IntentType {
  const offers = /فروش|می‌فروش|میفروش|آگهی|واگذار/u.test(text);
  switch (vertical) {
    case 'real-estate':
      return offers ? 'property_listing' : 'property_search';
    case 'vehicles':
      return offers ? 'vehicle_listing' : 'vehicle_search';
    case 'products':
      return offers ? 'product_listing' : 'product_search';
    case 'services':
      return 'service_request';
    case 'jobs':
      return 'job_search';
    case 'social':
      return 'help_request';
    default:
      return 'general';
  }
}

/** Strong commercial leaf hints when registry keyword order misses (e.g. مغازه … اجاره‌ای). */
function commercialSlugHints(text: string): string[] {
  const hints: string[] = [];
  // Product nouns must outrank generic condition words such as «کم‌کارکرد».
  // Without this guard, the large legacy vehicle rule pack can win for a TV
  // purchase and the LLM may then confirm the wrong vehicle category.
  if (
    /تلویزیون|ال[‌\s-]*ای[‌\s-]*دی|صوتی\s*و\s*تصویری/u.test(text) &&
    !/تعمیر|خرابی|نصب|عیب/u.test(text)
  ) {
    hints.push('audio-video');
  }
  // Do not treat «رهگیری» / «فرهنگیان» as رهن, or «اینترنت» as رنت.
  const rentish =
    /اجاره|اجاره‌ای|(?<![\u0600-\u06FF])رهن(?!گیری|گ)|ودیعه|(?<![\u0600-\u06FFa-zA-Z])رنت(?![\u0600-\u06FFa-zA-Z])/u.test(
      text
    );
  const saleish =
    /فروش(?!ی)|می‌فروش|میفروش|برای خرید|دنبال خرید|قصد خرید|می[\u200c\s]*خرم|میخرم|می‌خرم|بخرم|می[\u200c\s]*خوام\s*بخرم|میخوام\s*بخرم/u.test(
      text
    );
  const strongRent =
    /برای اجاره|رهن و اجاره|اجاره‌ای|اجاره‌اش|ودیعه|اجاره روزانه|(?<![\u0600-\u06FF])رهن(?!گیری|گ)/u.test(
      text
    );
  const strongBuy = /برای خرید|دنبال خرید|قصد خرید/u.test(text);
  const budgetish = /بودجه|میلیارد\s*تومان|میلیون\s*تومان/u.test(text);
  const hasPropertyContext =
    /\d[\d۰-۹]*\s*متر|متراژ|بودجه|میلیارد|رهن|ودیعه|اجاره|ملک|آپارتمان|اپارتمان|ویلا|مغازه|دفتر|سوله|واحد|مسکونی/u.test(
      text
    );
  // Allow gap: «می‌خوام آپارتمان مسکونی بخرم»
  const buyPhrase =
    /برای خرید|دنبال خرید|قصد خرید|می[\u200c\s]*خرم|میخرم|می‌خرم|بخرم|می[\u200c\s]*خوام[\u0600-\u06FF\u200c\s،,]{0,48}بخرم|میخوام[\u0600-\u06FF\u200c\s،,]{0,48}بخرم/u.test(
      text
    );

  // Motorcycle before car: bare «موتور» + brand often loses to car/honda collisions.
  if (
    /موتور\s*سیکلت|موتورسیکلت|موتور\s*هوندا|موتور\s*یاماها|موتور\s*باجاج/u.test(text) ||
    (/\bموتور\b|موتور/u.test(text) &&
      /هوندا|یاماها|باجاج|کوزاکی|کواساکی|سی\s*جی|CDI|CG\s*\d/iu.test(text) &&
      !/موتور\s*برق|موتورخانه|موتور\s*آسانسور|ماشین|خودرو|پژو|پراید/u.test(text))
  ) {
    hints.push('motorcycle');
  }

  // Lost & found: «گم کردم» + item must not fall through to empty / phones.
  if (/گم\s*کرد|گم\s*شد|مفقود|پیدا\s*کردم/u.test(text)) {
    hints.push('lost-found');
  }

  // Personal bags/shoes (avoid lost-found «کیف» keyword collision).
  if (
    /کیف\s*چرم|کیف\s*زنانه|کیف\s*مردانه|کفش\s*ورزشی|کفش\s*مجلسی/u.test(text) &&
    !/گم\s*کرد|گم\s*شد|مفقود/u.test(text)
  ) {
    hints.push('clothing');
  }

  // Locksmith service (کلیدساز) — not apartment-sale.
  if (/کلیدساز|قفل\s*ساز|قفل‌سازی|باز\s*کردن\s*قفل/u.test(text)) {
    hints.push('locksmith-repair');
  }

  // Hiring / jobs — «منشی اداری» must not fall into office-sale/rent.
  if (
    /استخدام|به\s*دنبال\s*(?:منشی|کارمند)|نیروی\s*(?:کار|انسانی)/u.test(text) &&
    !/املاک|آپارتمان|سوله|مغازه|اجاره\s*دفتر|خرید\s*دفتر/u.test(text)
  ) {
    hints.push('admin-management');
  }

  // Clinic / dental office rent → commercial office, not residential apartment.
  if (/کلینیک|مطب|دندانپزشک/u.test(text) && rentish) {
    hints.push('office-rent');
  }

  if (
    (/مغازه|غرفه|فروشگاه|مزون/u.test(text) && hasPropertyContext) ||
    (/ویترین/u.test(text) && !/آپارتمان|اپارتمان|ویلا|سوئیت/u.test(text))
  ) {
    if ((rentish && !buyPhrase && !saleish) || (strongRent && !strongBuy && !buyPhrase)) {
      hints.push('shop-rent');
    } else if (saleish || buyPhrase || budgetish || /بخرم|خرید/u.test(text)) {
      hints.push('shop-sale');
    }
  }
  if (
    /دفتر\s*(?:کار|اداری|معماری|وکالت)|ملک\s*(?:اداری|تجاری)|\bآفیس\b|office/iu.test(
      text
    )
  ) {
    if ((rentish && !buyPhrase && !saleish) || (strongRent && !strongBuy && !buyPhrase)) {
      hints.push('office-rent');
    } else if (saleish || buyPhrase || budgetish) {
      hints.push('office-sale');
    }
  }
  // Partnership / pre-sale before bare land so «زمین + مشارکت در ساخت» does not become land-sale.
  if (/مشارکت\s*در\s*ساخت|مشارکت\s*ساخت/u.test(text)) {
    hints.push('construction-partnership');
  }
  if (/پیش[\u200c\s]*فروش|پیشفروش/u.test(text) && /آپارتمان|واحد|پروژه|مسکن/u.test(text)) {
    hints.push('pre-sale-services');
  }
  // Industrial / land / agency — colloquial phrasing often skips contiguous «خرید سوله».
  if (/سوله|کارگاه\s*صنعتی|انبار\s*صنعتی/u.test(text)) {
    if ((rentish && !buyPhrase && !saleish) || (strongRent && !strongBuy && !buyPhrase)) {
      hints.push('industrial-rent');
    } else if (saleish || buyPhrase || /بخرم|خرید/u.test(text)) {
      hints.push('industrial-sale');
    }
  }
  // «شهرک ویلایی» is a neighborhood label, not villa property (colloquial-0567).
  const textSansVillaHood = text.replace(/شهرک\s*ویلایی/gu, ' ');
  const hasVillaProperty =
    /خانه\s*ویلایی|باغ[\s‌]*ویلا|(?<![\u0600-\u06FF])ویلا(?!یی)/u.test(textSansVillaHood) ||
    /اجاره\s*ویلا|خرید\s*ویلا|ویلا\s*(?:اجاره|بخرم|مسکونی)/u.test(textSansVillaHood);
  if (
    /زمین|کلنگی/u.test(text) &&
    !/سوله|مغازه|دفتر|آپارتمان|مشارکت/u.test(text) &&
    !hasVillaProperty
  ) {
    // Never treat bare «زمین یا کلنگی» as rent — buy ads use the same phrase (#165/#579).
    if (
      /اجاره\s*(?:ماهانه|ماهی|ماهانهٔ)?\s*(?:ی\s*)?(?:زمین|کلنگی)|زمین\s*(?:یا\s*کلنگی)?\s*اجاره|کلنگی\s*اجاره/u.test(
        text
      ) ||
      ((rentish || strongRent) && !buyPhrase && !saleish)
    ) {
      hints.push('land-rent');
    } else if (saleish || buyPhrase || /بخرم|خرید/u.test(text)) {
      hints.push('land-sale');
    }
  }
  if (/مشاور\s*املاک|آژانس\s*املاک|بنگاه\s*املاک/u.test(text)) {
    hints.push('agency-services');
  }
  // Short-term workspace / suite / villa — before residential apartment heuristics.
  const shortTerm =
    /کوتاه[\u200c\s]*مدت|اجاره\s*روزانه|چند\s*روز|حداکثر\s*دو\s*هفته|هفتگی/u.test(text);
  if (shortTerm && /فضای\s*کار|کار\s*اشتراکی|workspace/iu.test(text)) {
    hints.push('workspace-short-rent');
  } else if (shortTerm && /سوئیت|آپارتمان|اپارتمان/u.test(text)) {
    hints.push('suite-apartment-rent');
  } else if (shortTerm && hasVillaProperty) {
    hints.push('villa-short-rent');
  }
  if (hasVillaProperty) {
    if ((rentish && !saleish && !buyPhrase) || (strongRent && !strongBuy && !buyPhrase)) {
      hints.push('villa-rent');
    } else if (saleish || buyPhrase || budgetish) {
      hints.push('villa-sale');
    }
  } else if (
    /آپارتمان|اپارتمان|سوئیت|خانه|خونه|واحد|مسکونی/u.test(text) &&
    !/روزانه|شبانه|کوتاه\s*مدت|کلینیک|مطب|دندانپزشک|کلیدساز/u.test(text)
  ) {
    if ((rentish && !saleish && !buyPhrase) || (strongRent && !strongBuy && !buyPhrase)) {
      hints.push('apartment-rent');
    } else if (
      /آپارتمان|اپارتمان|خانه|خونه|واحد|مسکونی/u.test(text) &&
      (saleish || buyPhrase || budgetish)
    ) {
      hints.push('apartment-sale');
    }
  }
  return hints;
}

function rulesIntentFallback(text: string): IntentSliceResult {
  const classified = classifyVertical(text);
  const vertical = classified.vertical;
  return {
    vertical,
    intentType: intentTypeFromVertical(vertical, text),
    keywords: classified.signals.slice(0, 5),
    confidence: Math.min(1, Math.max(0.35, classified.certainty || classified.score / 10)),
    source: 'skipped',
  };
}

function parseCategoryIntentLlm(content: string | null): CategoryIntentLlmPayload | null {
  if (!content) return null;
  const json = parseAiJsonPayload(content);
  if (!json || typeof json !== 'object') return null;
  const raw = json as Record<string, unknown>;
  const vertical = String(raw.vertical ?? '').trim();
  const intentType = String(raw.intentType ?? '').trim();
  if (!isVertical(vertical) || !isIntentType(intentType)) return null;

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 5)
    : [];
  const categoryRaw = raw.category;
  const category =
    categoryRaw == null || categoryRaw === ''
      ? null
      : String(categoryRaw).trim() || null;
  const confidence =
    typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.65;

  return { vertical, intentType, keywords, category, confidence };
}

async function callCategoryIntentLlm(prompt: string): Promise<string | null> {
  const chat = await localChatCompletions(
    [
      { role: 'system', content: CATEGORY_INTENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 220, temperature: 0.05 }
  );
  return chat?.content?.trim() ?? null;
}

function registryLeafExists(slug: string): boolean {
  return Boolean(getCategoryBySlug(slug));
}

function resolveMatchFromSlug(
  text: string,
  slug: string,
  candidates: CategoryMatchCandidate[]
): CategoryMatchResult | null {
  const hit = candidates.find((c) => c.slug === slug);
  if (hit) return candidateToCategoryMatchResult(text, hit, []);
  if (!registryLeafExists(slug)) return null;
  const pair = normalizeCategoryPair(slug);
  const leaf = pair.subcategorySlug ?? pair.categorySlug;
  return {
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug ?? leaf,
    confidence: 0.72,
    score: 0.72,
    matchedRules: [`ai:${slug}`],
  };
}

export function categoryCandidatesForUi(
  candidates: CategoryMatchCandidate[]
): CategoryCandidateOption[] {
  return candidates.map((c) => {
    const meta = getCategoryBySlug(c.slug);
    return {
      slug: c.slug,
      label: meta?.title ?? c.slug,
      confidence: c.confidence,
      matchedRules: c.matchedRules.slice(0, 3),
    };
  });
}

export interface CategoryIntentEngineInput {
  text: string;
  /** Prefer these as slugHints for rules shortlist (optional). */
  slugHints?: string[];
  categoryLockedByUser?: boolean;
  lockedCategorySlug?: string | null;
  lockedSubcategorySlug?: string | null;
  /** Force AI even if intent-slice flag is off (when disambig AI is on). */
  forceAi?: boolean;
}

/**
 * Single category+intent path for /post analyze:
 * rules shortlist → clear accept → else one LLM pick/suggest → registry validate.
 * Does not touch city/neighborhood.
 */
export async function runCategoryIntentEngine(
  input: CategoryIntentEngineInput
): Promise<CategoryIntentEngineResult> {
  const started = performance.now();
  const text = input.text.trim();

  if (input.categoryLockedByUser && input.lockedCategorySlug) {
    const pair = normalizeCategoryPair(
      input.lockedCategorySlug,
      input.lockedSubcategorySlug ?? undefined
    );
    const leaf = pair.subcategorySlug ?? pair.categorySlug;
    const match: CategoryMatchResult = {
      categorySlug: pair.categorySlug,
      subcategorySlug: pair.subcategorySlug ?? leaf,
      confidence: 1,
      score: 1,
      matchedRules: ['user-lock'],
    };
    return {
      match,
      candidates: [],
      ambiguous: false,
      intent: rulesIntentFallback(text),
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'locked',
    };
  }

  const rulesIntent = rulesIntentFallback(text);
  const slugHints = [
    ...(input.slugHints ?? []),
    ...commercialSlugHints(text),
  ].filter(Boolean);

  const candidates = matchCategoryCandidatesFromRules(text, {
    slugHints: slugHints.length ? slugHints : undefined,
  });
  const clear = pickClearCategoryFromRules(text, {
    slugHints: slugHints.length ? slugHints : undefined,
  });

  const commercialForced = commercialSlugHints(text)[0] ?? null;
  if (commercialForced && registryLeafExists(commercialForced)) {
    const clearLeaf = clear
      ? (clear.subcategorySlug ?? clear.categorySlug)
      : null;
    const clearIsRepair =
      Boolean(clearLeaf) &&
      (clearLeaf!.includes('repair') || clearLeaf === 'repairs' || clearLeaf === 'services');
    const forcedIsEstate =
      /apartment|villa|shop|office|land|suite|rent|sale|partnership|industrial|agency|workspace/u.test(
        commercialForced
      );
    const conflicts =
      !clearLeaf ||
      (commercialForced === 'motorcycle' && clearLeaf !== 'motorcycle') ||
      (commercialForced === 'lost-found' && clearLeaf !== 'lost-found') ||
      (commercialForced === 'clothing' &&
        clearLeaf !== 'clothing' &&
        clearLeaf !== 'personal-items') ||
      (commercialForced === 'bags-shoes' &&
        clearLeaf !== 'bags-shoes' &&
        !clearLeaf.includes('bag') &&
        !clearLeaf.includes('shoe')) ||
      (commercialForced === 'locksmith-repair' &&
        clearLeaf !== 'locksmith-repair' &&
        !clearLeaf.includes('locksmith')) ||
      (commercialForced.includes('shop') && !clearLeaf.includes('shop')) ||
      (commercialForced.includes('office') && !clearLeaf.includes('office')) ||
      (commercialForced.includes('villa') && !clearLeaf.includes('villa')) ||
      (commercialForced.includes('apartment') && !clearLeaf.includes('apartment')) ||
      (commercialForced.includes('industrial') && !clearLeaf.includes('industrial')) ||
      (commercialForced.includes('land') && !clearLeaf.includes('land')) ||
      (commercialForced.includes('agency') && !clearLeaf.includes('agency')) ||
      (commercialForced.includes('partnership') && !clearLeaf.includes('partnership')) ||
      (commercialForced.includes('pre-sale') && !clearLeaf.includes('pre-sale')) ||
      (commercialForced.includes('workspace') && !clearLeaf.includes('workspace')) ||
      (commercialForced.includes('suite') && !clearLeaf.includes('suite')) ||
      (commercialForced === 'villa-short-rent' && !clearLeaf.includes('villa')) ||
      (commercialForced === 'admin-management' &&
        clearLeaf !== 'admin-management' &&
        !clearLeaf.includes('admin') &&
        clearLeaf !== 'jobs' &&
        !clearLeaf.includes('office-jobs')) ||
      (commercialForced === 'audio-video' &&
        clearLeaf !== 'audio-video' &&
        !clearLeaf.includes('audio')) ||
      (commercialForced.includes('sale') && clearLeaf.includes('rent')) ||
      (commercialForced.includes('rent') && clearLeaf.includes('sale') && !clearLeaf.includes('rent')) ||
      (clearIsRepair && forcedIsEstate);
    if (conflicts) {
      const forcedMatch = resolveMatchFromSlug(text, commercialForced, candidates);
      if (forcedMatch) {
        return {
          match: forcedMatch,
          candidates:
            candidates.some((c) => c.slug === commercialForced)
              ? candidates
              : [
                  {
                    slug: commercialForced,
                    score: 12,
                    confidence: 0.92,
                    matchedRules: [`hint:${commercialForced}`],
                    source: 'registry' as const,
                  },
                  ...candidates,
                ],
          ambiguous: false,
          intent: rulesIntent,
          aiInvoked: false,
          aiProvider: null,
          aiLatencyMs: Math.round(performance.now() - started),
          method: 'rules-clear',
        };
      }
    }
  }

  if (clear && !isCategoryAmbiguous(candidates)) {
    // forceAi must not re-run category LLM on a strong clear match — gist + scoped
    // field-fill handle enrichment. Escalate only when clear confidence is weak.
    const clearConf = clear.confidence ?? 0;
    const weakClear = clearConf < RULES_CATEGORY_MIN_CONFIDENCE;
    if (!(input.forceAi && weakClear)) {
      return {
        match: clear,
        candidates,
        ambiguous: false,
        intent: rulesIntent,
        aiInvoked: false,
        aiProvider: null,
        aiLatencyMs: Math.round(performance.now() - started),
        method: 'rules-clear',
      };
    }
  }

  const ambiguous = isCategoryAmbiguous(candidates);
  // Category LLM: ambiguous / empty shortlist / forceAi with weak-or-empty rules.
  // Strong clear matches never reach here (see above).
  const aiEnabled =
    !isIntakeAiGloballyDisabled() &&
    isDisambigAiEnabled() &&
    (ambiguous || candidates.length === 0 || Boolean(input.forceAi));

  if (!aiEnabled) {
    if (ambiguous) {
      return {
        match: null,
        candidates,
        ambiguous: true,
        intent: rulesIntent,
        aiInvoked: false,
        aiProvider: null,
        aiLatencyMs: Math.round(performance.now() - started),
        method: 'rules-ambiguous',
      };
    }
    const fallback = matchCategoryFromRules(text, { slugHints });
    return {
      match: fallback,
      candidates,
      ambiguous: false,
      intent: rulesIntent,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: Math.round(performance.now() - started),
      method: fallback ? 'rules-fallback' : 'unresolved',
    };
  }

  // --- LLM path (single call when possible) ---
  let llmPayload: CategoryIntentLlmPayload | null = null;

  if (candidates.length > 0) {
    const pickList = candidates.slice(0, 8).map((c) => ({
      slug: c.slug,
      title: getCategoryBySlug(c.slug)?.title ?? c.slug,
    }));
    const pickRaw = await callCategoryIntentLlm(
      buildCategoryIntentPickPrompt(text, pickList)
    );
    llmPayload = parseCategoryIntentLlm(pickRaw);

    if (llmPayload?.category) {
      const allowed = new Set(candidates.map((c) => c.slug));
      if (allowed.has(llmPayload.category)) {
        const match = resolveMatchFromSlug(text, llmPayload.category, candidates);
        if (match) {
          return {
            match,
            candidates,
            ambiguous: true,
            intent: {
              vertical: llmPayload.vertical,
              intentType: llmPayload.intentType,
              keywords: llmPayload.keywords,
              confidence: llmPayload.confidence,
              source: 'ai',
            },
            aiInvoked: true,
            aiProvider: 'local-llm',
            aiLatencyMs: Math.round(performance.now() - started),
            method: 'ai-pick',
          };
        }
      }
    }
  }

  const suggestRaw = await callCategoryIntentLlm(buildCategoryIntentSuggestPrompt(text));
  const suggestPayload = parseCategoryIntentLlm(suggestRaw) ?? llmPayload;
  const intentFromAi: IntentSliceResult | null = suggestPayload
    ? {
        vertical: suggestPayload.vertical,
        intentType: suggestPayload.intentType,
        keywords: suggestPayload.keywords,
        confidence: suggestPayload.confidence,
        source: 'ai',
      }
    : rulesIntent;

  if (suggestPayload?.category) {
    const allowedSuggest = new Set(candidates.map((c) => c.slug));
    // When a shortlist exists, never accept a slug outside it (hallucination guard).
    const inShortlist =
      candidates.length === 0 || allowedSuggest.has(suggestPayload.category);

    if (inShortlist) {
      const revalidated = matchCategoryFromRules(text, {
        slugHints: [suggestPayload.category, ...suggestPayload.keywords],
      });
      if (
        revalidated &&
        revalidated.confidence >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD * 0.85 &&
        (candidates.length === 0 ||
          allowedSuggest.has(revalidated.subcategorySlug ?? revalidated.categorySlug))
      ) {
        return {
          match: revalidated,
          candidates,
          ambiguous: candidates.length >= 2,
          intent: intentFromAi,
          aiInvoked: true,
          aiProvider: 'local-llm',
          aiLatencyMs: Math.round(performance.now() - started),
          method: 'ai-suggest-revalidate',
        };
      }
      const direct = resolveMatchFromSlug(text, suggestPayload.category, candidates);
      if (direct && registryLeafExists(suggestPayload.category)) {
        return {
          match: direct,
          candidates,
          ambiguous: candidates.length >= 2,
          intent: intentFromAi,
          aiInvoked: true,
          aiProvider: 'local-llm',
          aiLatencyMs: Math.round(performance.now() - started),
          method: 'ai-suggest-revalidate',
        };
      }
    }
  }

  return {
    match: null,
    candidates,
    // Only UI-ambiguous when multiple registry hypotheses remain.
    // Empty shortlist + failed LLM is unresolved → caller may legacy-fallback.
    ambiguous: candidates.length >= 2,
    intent: intentFromAi,
    aiInvoked: true,
    aiProvider: 'local-llm',
    aiLatencyMs: Math.round(performance.now() - started),
    method: candidates.length >= 2 ? 'rules-ambiguous' : 'unresolved',
  };
}
