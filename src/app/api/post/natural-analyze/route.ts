import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCategoryBySlug, getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import {
  ALL_LOCATION_CITIES,
  citySlugToPersianName,
  locationCityIdToSlug,
} from '@/lib/search/city-slugs';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import {
  getNeighborhoodsForCity,
  resolveCatalogCityByName,
  resolveCatalogCityMention,
} from '@/lib/neighborhoods/server';
import { guardIntakePayloadSize, guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';
import {
  findNeighborhoodInAnyCity,
  findNeighborhoodNameAcrossCities,
  type NationwideNeighborhoodGroup,
} from '@/lib/need-intake/neighborhood-catalog.server';
import { resolvePostNeighborhoodInCity } from '@/lib/need-intake/laya/post-neighborhood-resolver';
import {
  buildPostDecisionQuestions,
  type PostDecisionQuestion,
} from '@/lib/need-intake/laya/post-decision-questions';
import {
  POST_LAYA_MODEL,
  postNaturalAnalyzeRequestSchema,
  postNaturalAnalyzeResponseSchema,
  type PostNaturalAnalyzeRequest,
  type PostNaturalField,
} from '@/lib/need-intake/laya/post-natural-contract';
import {
  extractPostNaturalFields,
  hasPostDecisionTextEvidence,
} from '@/lib/need-intake/laya/post-natural-extractor';
import { normalizePostNaturalText } from '@/lib/need-intake/laya/post-natural-normalization';

export const runtime = 'nodejs';

const MAX_LAYA_TIMEOUT_MS = 15_000;

type LayaAnswer = {
  type?: string;
  choice?: string;
  noul?: number;
  confidence?: number;
  answer_confidence?: number;
};

type LayaResponse = {
  answers?: Record<string, LayaAnswer>;
  usage?: Record<string, number>;
};

function finiteEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function labelForCategory(slug: string): string {
  return getCategoryBySlug(slug)?.title ?? slug;
}

function isLocked(request: PostNaturalAnalyzeRequest, key: string): boolean {
  const locked = new Set(request.lockedFieldKeys ?? []);
  if (locked.has(key)) return true;
  if (
    request.categoryLockedByUser &&
    ['categorySlug', 'subcategorySlug', 'category', 'category_candidate'].includes(key)
  ) {
    return true;
  }
  if (request.cityLockedByUser && ['city', 'citySlug'].includes(key)) return true;
  if (request.neighborhoodLockedByUser && ['neighborhood', 'neighborhoodSlug'].includes(key)) {
    return true;
  }
  if (
    locked.has('dealType') ||
    locked.has('transactionType') ||
    locked.has('deal_type')
  ) {
    if (['dealType', 'transactionType', 'transaction_type'].includes(key)) return true;
  }
  return false;
}

function filterLockedPatch(
  request: PostNaturalAnalyzeRequest,
  entities: Record<string, unknown>,
  answers: Record<string, unknown>,
  warnings: string[]
) {
  const nextEntities: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entities)) {
    if (isLocked(request, key)) {
      // Preserving an explicitly selected location is normal context, not a
      // conflict worth surfacing in the user's analysis card.
      if (!['city', 'citySlug', 'neighborhood', 'neighborhoodSlug'].includes(key)) {
        warnings.push(`مقدار دستی ${key} حفظ شد.`);
      }
      continue;
    }
    nextEntities[key] = value;
  }
  const nextAnswers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (isLocked(request, key)) {
      if (!['city', 'citySlug', 'neighborhood', 'neighborhoodSlug'].includes(key)) {
        warnings.push(`مقدار دستی ${key} حفظ شد.`);
      }
      continue;
    }
    nextAnswers[key] = value;
  }
  return { entities: nextEntities, answers: nextAnswers };
}

function layaGate(answer: LayaAnswer): { confidence: number; accepted: boolean } {
  const confidence = Number(answer.answer_confidence ?? answer.confidence ?? 0);
  const minConfidence = finiteEnv('LAYA_POST_MIN_CONFIDENCE', 0.82);
  const autoApply = process.env.LAYA_POST_AUTO_APPLY === 'true';
  return {
    confidence: Number.isFinite(confidence) ? confidence : 0,
    // Model-backed categorical decisions stay proposals by default. Enabling
    // auto-apply is an explicit, calibrated rollout decision. Laya's current
    // action probability is not a correctness/reliability signal.
    accepted: autoApply && confidence >= minConfidence,
  };
}

function decisionValue(answer: LayaAnswer | undefined): string | undefined {
  const value = answer?.choice?.trim();
  return value && value !== 'unknown' ? value : undefined;
}

async function callLocalLaya(
  sourceText: string,
  normalizedText: string,
  questions: Record<string, PostDecisionQuestion>,
  context: Record<string, unknown>
): Promise<{ status: 'ready' | 'unavailable'; result?: LayaResponse; latencyMs: number }> {
  const configuredUrl = process.env.LAYA_POST_URL?.trim() || 'http://127.0.0.1:8101/predict';
  let url: string;
  try {
    const parsedUrl = new URL(configuredUrl);
    if (
      parsedUrl.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(parsedUrl.hostname)
    ) {
      return { status: 'unavailable', latencyMs: 0 };
    }
    url = parsedUrl.toString();
  } catch {
    return { status: 'unavailable', latencyMs: 0 };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MAX_LAYA_TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: {
          text: sourceText,
          normalized_text: normalizedText,
          context,
        },
        questions,
      }),
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      return { status: 'unavailable', latencyMs: Date.now() - started };
    }
    const data = (await response.json()) as LayaResponse;
    return { status: 'ready', result: data, latencyMs: Date.now() - started };
  } catch {
    return { status: 'unavailable', latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveNeighborhood(
  request: PostNaturalAnalyzeRequest,
  phrase: string | undefined,
  cityName: string | undefined
) {
  if (!cityName?.trim() || (!phrase?.trim() && !request.sourceText.trim())) {
    return { candidates: [] as Array<{ slug: string; label: string; city?: string }> };
  }
  const hintedCitySlug = request.citySlug?.trim();
  const hintedCityName = hintedCitySlug ? citySlugToPersianName(hintedCitySlug) : null;
  // The resolved Persian city name is authoritative. A stale URL slug must
  // never silently search a different city's neighborhood catalog.
  const catalogCity = await resolveCatalogCityByName(cityName, hintedCitySlug);
  let cityId: string;
  if (catalogCity && !('ambiguous' in catalogCity)) {
    cityId = catalogCity.cityId;
  } else if (catalogCity && 'ambiguous' in catalogCity) {
    // A selected city in the location system can disambiguate catalog aliases;
    // without it, refusing to search is safer than selecting a different city.
    const registeredSlug = findCitySlug(cityName);
    if (registeredSlug && hintedCityName === cityName.trim()) cityId = registeredSlug;
    else return { candidates: [] as Array<{ slug: string; label: string; city?: string }>, cityAmbiguous: true as const };
  } else {
    cityId =
      hintedCitySlug && hintedCityName === cityName.trim()
        ? hintedCitySlug
        : findCitySlug(cityName) ?? cityName.trim();
  }
  const neighborhoods = await getNeighborhoodsForCity(cityId);
  if (!neighborhoods.length) {
    return { candidates: [] as Array<{ slug: string; label: string; city?: string }> };
  }

  // The same resolver is used by the form when it enters the location step.
  // This prevents API/form disagreement about an otherwise valid city hit.
  const resolution = resolvePostNeighborhoodInCity(
    neighborhoods,
    phrase ?? '',
    cityName,
    request.sourceText
  );
  const hit = resolution.hit;
  if (hit) {
    return {
      hit: {
        slug: hit.id,
        label: hit.name,
        city: cityName,
        lat: hit.centroid?.lat,
        lng: hit.centroid?.lng,
      },
      candidates: [] as Array<{ slug: string; label: string; city?: string }>,
    };
  }

  if (resolution.candidates.length > 0) {
    return {
      candidates: resolution.candidates.slice(0, 4).map((neighborhood) => ({
        slug: neighborhood.id,
        label: neighborhood.name,
        city: cityName,
      })),
    };
  }
  return { candidates: [] as Array<{ slug: string; label: string; city?: string }> };
}

function addLayaField(
  fields: PostNaturalField[],
  key: string,
  value: unknown,
  answer: LayaAnswer,
  requiresConfirmation: boolean,
  evidence: string
) {
  fields.push({
    key,
    value,
    confidence: Number(answer.answer_confidence ?? answer.confidence ?? 0),
    source: 'laya',
    requiresConfirmation,
    evidence,
  });
}

function canonicalKeyForLayaQuestion(key: string): string | undefined {
  if (key === 'transaction_type') return 'dealType';
  if (key === 'property_kind') return 'propertyKind';
  if (key === 'deed_type') return 'deedType';
  if (key === 'usage') return 'usageType';
  if (['parking', 'elevator', 'storage'].includes(key)) return key;
  return undefined;
}

function applyLayaAnswer(
  key: string,
  answer: LayaAnswer | undefined,
  fields: PostNaturalField[],
  entities: Record<string, unknown>,
  answers: Record<string, unknown>,
  categoryCandidates: Array<{ slug: string; label: string }>,
  request: PostNaturalAnalyzeRequest,
  warnings: string[]
): { provisionalCategory?: { slug: string; confidence: number; reason?: string; requiresConfirmation: boolean } } {
  const value = decisionValue(answer);
  if (!answer || !value) return {};
  const gate = layaGate(answer);
  const accepted = gate.accepted && !isLocked(request, key);
  const requiresConfirmation = !accepted;

  // Exact deterministic extraction has priority over a model suggestion. This
  // prevents a Laya guess from duplicating or overwriting a value already
  // proved by the parser. A disagreement is visible as a warning.
  const canonicalKey = canonicalKeyForLayaQuestion(key);
  const deterministicField = canonicalKey
    ? fields.find(
        (field) =>
          field.key === canonicalKey &&
          field.source === 'deterministic-parser'
      )
    : undefined;
  if (deterministicField) {
    if (String(deterministicField.value) !== value) {
      warnings.push(`پیشنهاد Laya برای ${canonicalKey} با استخراج قطعی متن اختلاف داشت؛ مقدار قطعی حفظ شد.`);
    }
    return {};
  }

  if (key === 'category_candidate') {
    const candidate = categoryCandidates.find((item) => item.slug === value);
    if (!candidate) return {};
    addLayaField(fields, 'categorySlug', value, answer, requiresConfirmation, candidate.label);
    if (accepted && !request.categoryLockedByUser) {
      const pair = normalizeCategoryPair(value);
      entities.categorySlug = pair.categorySlug;
      entities.subcategorySlug = pair.subcategorySlug;
      return {
        provisionalCategory: {
          slug: value,
          confidence: gate.confidence,
          reason: `Laya مسیر ${candidate.label} را بین گزینه‌های محدودشده پیشنهاد کرد.`,
          requiresConfirmation: false,
        },
      };
    }
    return {
      provisionalCategory: {
        slug: value,
        confidence: gate.confidence,
        reason: `پیشنهاد Laya برای ${candidate.label}.`,
        requiresConfirmation: true,
      },
    };
  }

  if (key === 'transaction_type') {
    const transaction = mapDealTypeToTransaction(value);
    if (!transaction) return {};
    addLayaField(fields, 'dealType', value, answer, requiresConfirmation, 'نوع معامله از متن');
    if (accepted) {
      entities.transactionType = transaction;
      answers.dealType = value;
    }
    return {};
  }

  if (key === 'property_kind') {
    addLayaField(fields, 'propertyKind', value, answer, requiresConfirmation, 'نوع ملک از متن');
    if (accepted) {
      entities.propertyKind = value;
      answers.propertyKind = value;
    }
    return {};
  }

  if (key === 'deed_type') {
    addLayaField(fields, 'deedType', value, answer, requiresConfirmation, 'نوع سند از متن');
    if (accepted) {
      entities.deedType = value;
      answers.deedType = value;
    }
    return {};
  }

  if (key === 'usage') {
    addLayaField(fields, 'usageType', value, answer, requiresConfirmation, 'کاربری از متن');
    if (accepted) answers.usageType = value;
    return {};
  }

  if (['parking', 'elevator', 'storage'].includes(key)) {
    addLayaField(fields, key, value, answer, requiresConfirmation, `${key} از متن`);
    if (accepted && value === 'yes') {
      const previous = Array.isArray(answers.amenities) ? answers.amenities : [];
      answers.amenities = [...new Set([...previous, key])];
    }
  }
  return {};
}

function findCitySlug(cityName: string | undefined): string | undefined {
  if (!cityName?.trim()) return undefined;
  const city = ALL_LOCATION_CITIES.find((item) => item.name === cityName.trim());
  return city ? locationCityIdToSlug(city.id) : undefined;
}

function compactLocationLabel(value: string): string {
  return normalizePostNaturalText(value).toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}

/**
 * A token in the text can be both a small Iranian city and a neighborhood
 * label of the user's selected city («مهران» تهران، «چشمه علی» داخل
 * «صفائیه (چشمه علی)»). When the selected city's own catalog knows the name
 * as a neighborhood/area label, the mention is the neighborhood, not a city
 * override — the text city candidate echoes the selected-city scope.
 */
async function textCityCandidateEchoesContextCity(
  candidateName: string,
  contextCityName: string | undefined,
  contextCitySlug: string | undefined
): Promise<boolean> {
  if (!contextCityName?.trim() || !candidateName.trim()) return false;
  if (candidateName.trim() === contextCityName.trim()) return false;
  const candidate = compactLocationLabel(candidateName);
  if (!candidate) return false;
  const candidateCompact = candidate.replace(/\s+/gu, '');
  const catalogCity = await resolveCatalogCityByName(contextCityName, contextCitySlug);
  const cityId = catalogCity && !('ambiguous' in catalogCity) ? catalogCity.cityId : undefined;
  const neighborhoods = cityId
    ? await getNeighborhoodsForCity(cityId)
    : contextCitySlug?.trim() && (await getNeighborhoodsForCity(contextCitySlug.trim())).length
      ? await getNeighborhoodsForCity(contextCitySlug.trim())
      : [];
  if (!neighborhoods.length) return false;
  return neighborhoods.some((neighborhood) =>
    [neighborhood.name, ...(neighborhood.areas ?? [])].some((label) => {
      const normalizedLabel = compactLocationLabel(label);
      if (!normalizedLabel) return false;
      const labelCompact = normalizedLabel.replace(/\s+/gu, '');
      return (
        labelCompact === candidateCompact ||
        normalizedLabel.split(' ').includes(candidate) ||
        (candidateCompact.length >= 3 && labelCompact.includes(candidateCompact))
      );
    })
  );
}

export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'post-natural-analyze', 24);
  if (rateLimited) return rateLimited;
  const oversized = guardIntakePayloadSize(request, 96_000);
  if (oversized) return oversized;

  const started = Date.now();
  const requestId = randomUUID();
  try {
    const body = await request.json().catch(() => null);
    const parsed = postNaturalAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'درخواست تحلیل طبیعی معتبر نیست', code: 'invalid_request' },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const deterministic = extractPostNaturalFields(input.sourceText);
    const warnings = [...deterministic.warnings];
    const gaps = [...deterministic.gaps];
    const entities = { ...deterministic.entities };
    const answers = { ...deterministic.answers };
    const fields = [...deterministic.fields];

    const catalogCityMention = await resolveCatalogCityMention(input.sourceText, input.citySlug?.trim());
    const ambiguousCityMention = Boolean(catalogCityMention && 'ambiguous' in catalogCityMention);
    let resolvedTextCity = catalogCityMention && !('ambiguous' in catalogCityMention)
      ? catalogCityMention
      : null;

    // If multiple neighborhood files share a city label, use the app's
    // canonical city registry only when its slug points to one of those exact
    // catalog entries. Otherwise leave the city unresolved for the user.
    if (ambiguousCityMention && deterministic.cityCandidate) {
      const registeredSlug = findCitySlug(deterministic.cityCandidate);
      const disambiguated = registeredSlug
        ? await resolveCatalogCityByName(deterministic.cityCandidate, registeredSlug)
        : null;
      if (disambiguated && !('ambiguous' in disambiguated)) resolvedTextCity = disambiguated;
    }

    // A text city mention — from the catalog-city trie or the app registry —
    // that is also a neighborhood label of the user's selected city is an
    // echo of the selection, not a different city.
    const textCityMention = resolvedTextCity?.cityName ?? deterministic.cityCandidate ?? '';
    const textCityEchoed =
      !input.cityLockedByUser && textCityMention.trim()
        ? await textCityCandidateEchoesContextCity(
            textCityMention,
            input.cityName?.trim(),
            input.citySlug?.trim()
          )
        : false;

    // Exact nationwide neighborhood→city inference: when the text names a
    // neighborhood but no city at all, an exact catalog-name match in exactly
    // ONE city is deterministic evidence for that city (e.g. «جردن» → تهران).
    // Matches in several cities stay a manual choice; the fuzzy whole-text
    // scorer below only runs when there is no exact signal at all (it can
    // mistake measurements like «۱۳۰ متری» for a «۳۰ متری» street elsewhere).
    const exactHoodCityGroups: NationwideNeighborhoodGroup[] =
      !input.cityLockedByUser &&
      !resolvedTextCity &&
      !deterministic.cityCandidate &&
      !input.cityName?.trim() &&
      !input.citySlug?.trim() &&
      !ambiguousCityMention &&
      deterministic.neighborhoodPhrase
        ? findNeighborhoodNameAcrossCities(deterministic.neighborhoodPhrase)
        : [];
    const exactUniqueHoodCity =
      exactHoodCityGroups.length === 1 ? exactHoodCityGroups[0]! : null;
    const crossCityHoodGroups =
      exactHoodCityGroups.length > 1 ? exactHoodCityGroups.slice(0, 4) : [];

    // With no city in the text and no selected-city context, a strong
    // neighborhood-catalog hit names the city the user is asking about.
    // An exact unique nationwide match outranks the fuzzy scorer; a
    // multi-city exact match suppresses it (no silent single-city pick).
    const cityFromHoodMatch = exactUniqueHoodCity
      ? {
          city: exactUniqueHoodCity.city,
          cityId: findCitySlug(exactUniqueHoodCity.city) ?? exactUniqueHoodCity.cityId,
          slug: exactUniqueHoodCity.entries[0]?.slug ?? '',
          name: exactUniqueHoodCity.entries[0]?.name ?? '',
          score: 999,
        }
      : crossCityHoodGroups.length > 0
        ? null
        : !input.cityLockedByUser &&
            !resolvedTextCity &&
            !deterministic.cityCandidate &&
            !input.cityName?.trim()
          ? findNeighborhoodInAnyCity(input.sourceText, input.citySlug?.trim() || null)
          : null;

    const contextualCityName = input.cityName?.trim();
    const textCityAuthoritative = Boolean(resolvedTextCity) && !textCityEchoed;
    let cityName = input.cityLockedByUser
      ? contextualCityName || deterministic.cityCandidate
      : (textCityAuthoritative ? resolvedTextCity!.cityName : undefined) ||
        (ambiguousCityMention && !resolvedTextCity
          ? contextualCityName
          : (deterministic.cityCandidate && !textCityEchoed
              ? deterministic.cityCandidate
              : undefined) ||
            cityFromHoodMatch?.city ||
            contextualCityName);
    let citySlug = input.cityLockedByUser && input.citySlug?.trim()
      ? input.citySlug.trim()
      : textCityAuthoritative
        ? locationCityIdToSlug(resolvedTextCity!.cityId)
        : cityFromHoodMatch?.cityId || findCitySlug(cityName) || input.citySlug?.trim();

    if (ambiguousCityMention && !resolvedTextCity) {
      warnings.push('نام شهر در کاتالوگ چند برداشت دارد؛ برای جلوگیری از انتخاب شهر اشتباه، شهر را دستی انتخاب کنید.');
    }
    if (
      !input.cityLockedByUser &&
      resolvedTextCity &&
      !textCityEchoed &&
      resolvedTextCity.cityName !== input.cityName?.trim()
    ) {
      entities.city = resolvedTextCity.cityName;
      entities.citySlug = citySlug;
      fields.push({
        key: 'city',
        value: resolvedTextCity.cityName,
        confidence: 1,
        source: 'deterministic-parser',
        requiresConfirmation: false,
        evidence: 'نام دقیق شهر در متن با کاتالوگ کامل مکان‌های پروژه تطبیق داده شد',
      });
    } else if (
      !input.cityLockedByUser &&
      !ambiguousCityMention &&
      deterministic.cityCandidate &&
      !textCityEchoed
    ) {
      cityName = deterministic.cityCandidate;
      citySlug = findCitySlug(cityName);
      entities.city = cityName;
      entities.citySlug = citySlug;
      if (cityName !== input.cityName?.trim()) {
        fields.push({
          key: 'city',
          value: cityName,
          confidence: 1,
          source: 'deterministic-parser',
          requiresConfirmation: false,
          evidence: 'نام شهر صریح در متن؛ شهر انتخاب‌شدهٔ کاربر قفل نشده بود',
        });
      }
    }

    if (textCityEchoed && textCityMention.trim()) {
      warnings.push(
        `نام «${textCityMention}» هم شهر است و هم محله‌ای در شهر انتخابی شما («${input.cityName?.trim()}»)؛ شهر انتخابی حفظ شد.`
      );
      fields.push({
        key: 'city',
        value: textCityMention,
        confidence: 1,
        source: 'deterministic-parser',
        requiresConfirmation: true,
        evidence: 'این نام با محله‌ای در شهر انتخاب‌شده نیز تطبیق دارد؛ در صورت تمایل تأیید کنید',
      });
    }

    if (
      input.cityLockedByUser &&
      resolvedTextCity &&
      cityName &&
      resolvedTextCity.cityName !== cityName
    ) {
      warnings.push(`شهر نوشته‌شده در متن «${resolvedTextCity.cityName}» است؛ شهر انتخاب‌شدهٔ شما «${cityName}» حفظ شد.`);
    }

    const location = await resolveNeighborhood(input, deterministic.neighborhoodPhrase, cityName);
    // Multi-city exact matches (no city anywhere to scope by): one ranked
    // candidate per city so the user can pick the right city fast. An exact
    // unique match already set cityName above, so its city-scoped resolver
    // runs instead and this list stays empty.
    const crossCityCandidates: Array<{
      slug: string;
      label: string;
      city?: string;
      citySlug?: string;
    }> = crossCityHoodGroups.flatMap((group) => {
      const best = group.entries[0];
      if (!best) return [];
      return [{ slug: best.slug, label: best.name, city: group.city, citySlug: group.cityId }];
    });
    const locationCandidates: Array<{
      slug: string;
      label: string;
      city?: string;
      citySlug?: string;
    }> = location.candidates.length > 0 ? location.candidates : crossCityCandidates;
    if ('cityAmbiguous' in location && location.cityAmbiguous) {
      warnings.push('نام شهر با چند کاتالوگ مکانی تطبیق دارد؛ محله خودکار انتخاب نشد.');
    }
    if (location.hit && !input.neighborhoodLockedByUser) {
      const missingNeighborhood = gaps.indexOf('neighborhood');
      if (missingNeighborhood >= 0) gaps.splice(missingNeighborhood, 1);
      entities.neighborhood = location.hit.label;
      entities.neighborhoodSlug = location.hit.slug;
      if (location.hit.lat != null && location.hit.lng != null) {
        entities.lat = location.hit.lat;
        entities.lng = location.hit.lng;
      }
      fields.push({
        key: 'neighborhood',
        value: location.hit.label,
        confidence: 1,
        source: 'deterministic-parser',
        requiresConfirmation: false,
        evidence: 'محله با catalog شهر تطبیق داده شد',
      });
    } else if (locationCandidates.length > 0) {
      gaps.push('neighborhood');
      warnings.push(
        crossCityCandidates.length > 0 && deterministic.neighborhoodPhrase
          ? `نام «${deterministic.neighborhoodPhrase}» در چند شهر وجود دارد؛ برای انتخاب سریع، شهر را از گزینه‌ها انتخاب کنید.`
          : 'یک یا چند محلهٔ نزدیک پیدا شد؛ انتخاب نهایی با شماست.'
      );
    }

    // The selected city is the request's location context even when the text
    // never names it — emit it so the draft does not come back city-less.
    // When the city itself was inferred from a neighborhood mention (no
    // context at all), it stays a proposal for the user to confirm.
    if (
      !input.cityLockedByUser &&
      (!resolvedTextCity || textCityEchoed || resolvedTextCity.cityName === input.cityName?.trim()) &&
      (!deterministic.cityCandidate || textCityEchoed) &&
      cityName?.trim()
    ) {
      const inferred = !contextualCityName;
      // An exact unique nationwide neighborhood match is deterministic
      // evidence (not a guess): apply it, keep it editable via the warning.
      const exactAuto = inferred && Boolean(exactUniqueHoodCity);
      entities.city = cityName;
      entities.citySlug = citySlug;
      fields.push({
        key: 'city',
        value: cityName,
        confidence: exactAuto ? 0.9 : 1,
        source: 'existing-context',
        requiresConfirmation: inferred && !exactAuto,
        evidence: exactAuto
          ? `نام محلهٔ «${deterministic.neighborhoodPhrase}» فقط در شهر ${cityName} یافت شد؛ شهر از محله استخراج شد`
          : inferred
            ? 'شهر از محلهٔ ذکرشده در متن شناسایی شد؛ لطفاً تأیید کنید'
            : 'شهر انتخاب‌شدهٔ کاربر به‌عنوان بافت مکانی درخواست ثبت شد',
      });
      if (exactAuto) {
        warnings.push(`شهر «${cityName}» از روی نام محله استخراج شد؛ در صورت نیاز می‌توانید تغییرش دهید.`);
      }
    }

    // A resolved city is never still missing (previously even an explicit
    // «فولادشهر» text left 'city' in gaps/missingFieldKeys).
    if (entities.city) {
      const missingCity = gaps.indexOf('city');
      if (missingCity >= 0) gaps.splice(missingCity, 1);
    }

    let categoryCandidates = deterministic.categoryCandidates;
    const hasRealEstateCandidates = categoryCandidates.some(
      (candidate) => getCategoryPath(candidate.slug)[0]?.slug === 'real-estate'
    );
    if (hasRealEstateCandidates && !hasPostDecisionTextEvidence('category_candidate', input.sourceText)) {
      const hintedSlug = input.subcategorySlug?.trim() || input.categorySlug?.trim();
      const hintedPair = hintedSlug ? normalizeCategoryPair(hintedSlug) : null;
      const hintedLeaf = hintedPair?.subcategorySlug || hintedPair?.categorySlug || '';
      const matchesHint = categoryCandidates.some((candidate) => candidate.slug === hintedLeaf);
      if (matchesHint) categoryCandidates = categoryCandidates.filter((candidate) => candidate.slug === hintedLeaf);
    }
    const categoryQuestionCandidates = categoryCandidates.length >= 2 ? categoryCandidates : [];
    const questions = buildPostDecisionQuestions({
      categoryCandidates: categoryQuestionCandidates,
      // A neighborhood question needs a selected city to scope candidates;
      // city-less multi-city matches stay a manual chip choice, never a Laya pick.
      neighborhoodCandidates: cityName
        ? locationCandidates.map((candidate) => ({
            slug: candidate.slug,
            label: candidate.label,
          }))
        : [],
      includePropertyFields: deterministic.includePropertyFields,
    });
    const layaStateContext = {
      city: cityName,
      city_locked_by_user: Boolean(input.cityLockedByUser),
      category: input.categorySlug || input.subcategorySlug || null,
      category_locked_by_user: Boolean(input.categoryLockedByUser),
      neighborhood_candidates: locationCandidates.map((candidate) => candidate.label),
    };
    const laya = Object.keys(questions).length
      ? await callLocalLaya(input.sourceText, deterministic.normalizedText, questions, layaStateContext)
      : { status: 'unavailable' as const, latencyMs: 0 };

    let provisionalCategory:
      | { slug: string; confidence: number; reason?: string; requiresConfirmation: boolean }
      | undefined;
    if (laya.status === 'ready') {
      for (const [key, answer] of Object.entries(laya.result?.answers ?? {})) {
        if (!answer || typeof answer !== 'object') continue;
        if (key === 'neighborhood_candidate') {
          const selectedSlug = decisionValue(answer);
          if (!selectedSlug || isLocked(input, 'neighborhood')) continue;
          const candidate = locationCandidates.find((item) => item.slug === selectedSlug);
          if (!candidate) continue;
          const rawConfidence = Number(answer.answer_confidence ?? answer.confidence ?? 0);
          const confidence = Number.isFinite(rawConfidence)
            ? Math.min(1, Math.max(0, rawConfidence))
            : 0;
          // A model selection among plausible areas is always a proposal. The
          // user confirms it, at which point the normal location controller
          // resolves the canonical slug and synchronizes the map/form state.
          fields.push({
            key: 'neighborhood',
            value: candidate.label,
            confidence,
            source: 'laya',
            requiresConfirmation: true,
            evidence: `پیشنهاد Laya از میان گزینه‌های شهر ${candidate.city ?? cityName ?? 'انتخاب‌شده'}؛ نیازمند تأیید شما`,
          });
          continue;
        }
        if (!hasPostDecisionTextEvidence(key, input.sourceText)) continue;
        const result = applyLayaAnswer(
          key,
          answer,
          fields,
          entities,
          answers,
          categoryQuestionCandidates,
          input,
          warnings
        );
        if (result.provisionalCategory) provisionalCategory = result.provisionalCategory;
      }
    } else if (Object.keys(questions).length) {
      warnings.push('Laya در دسترس نیست؛ فیلدهای قطعی حفظ شدند و ادامهٔ کار دستی است.');
    }

    if (provisionalCategory && !provisionalCategory.requiresConfirmation) {
      const pair = normalizeCategoryPair(provisionalCategory.slug);
      entities.categorySlug = pair.categorySlug;
      entities.subcategorySlug = pair.subcategorySlug;
    }

  if (input.categorySlug && !input.categoryLockedByUser) {
    entities.categoryHintSlug = input.categorySlug;
  }
    if (cityName && input.cityLockedByUser) {
      // The selected city is context and is never replaced by a text result.
      entities.city = cityName;
      entities.citySlug = citySlug;
    }

    const filtered = filterLockedPatch(input, entities, answers, warnings);
    const guardedFields = fields.map((field) =>
      isLocked(input, field.key)
        ? {
            ...field,
            requiresConfirmation: true,
            evidence: field.evidence
              ? `مقدار دستی حفظ شد؛ ${field.evidence}`
              : 'مقدار دستی حفظ شد',
          }
        : field
    );
    const response = {
      schemaVersion: 2 as const,
      requestId,
      revision: input.draftRevision ?? 0,
      normalizedText: deterministic.normalizedText,
      draftPatch: {
        entities: filtered.entities,
        answers: filtered.answers,
      },
      fields: guardedFields,
      provisionalCategory,
      categoryCandidates,
      locationCandidates,
      gaps: [...new Set(gaps)],
      warnings: [...new Set(warnings)],
      missingFieldKeys: [...new Set(gaps)],
      laya: {
        status: laya.status,
        model: POST_LAYA_MODEL,
        latencyMs: laya.latencyMs,
        ...(laya.result?.usage ? { usage: laya.result.usage } : {}),
      },
      latencyMs: Date.now() - started,
    };
    const contract = postNaturalAnalyzeResponseSchema.safeParse(response);
    if (!contract.success) {
      console.error('[post/natural-analyze] response contract violation', contract.error.flatten());
      return NextResponse.json({ error: 'پاسخ تحلیل معتبر نیست', code: 'contract_violation' }, { status: 500 });
    }
    return NextResponse.json(contract.data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      {
        error: 'تحلیل طبیعی موقتاً در دسترس نیست؛ فرم دستی همچنان فعال است.',
        code: 'natural_analyze_failed',
        requestId,
      },
      { status: 503 }
    );
  }
}
