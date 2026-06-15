import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { NeedIntelligenceProfile } from '@/contracts/need-intelligence';
import { PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { formatNeedBudgetLabel } from '@/lib/need/format-need-budget';
import { dealLabelForCategory } from '@/lib/need-intake/listing-title';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import {
  buildJobListingCopyTemplate,
  buildServiceListingCopyTemplate,
  jobsServicesCopyToDescription,
} from '@/lib/need-intake/intake-jobs-services-copy-template';

const POLISH_PASSES = 4;
const MAX_DESCRIPTION_LENGTH = 2000;

const MACHINE_LABEL_PREFIXES = [
  '\u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647',
  '\u062F\u0633\u062A\u0647',
  '\u0634\u0631\u062D \u062E\u062F\u0645\u062A',
  '\u0646\u06CC\u0627\u0632 \u062E\u062F\u0645\u0627\u062A',
  '\u0645\u062D\u062F\u0648\u062F\u0647',
  '\u0646\u0648\u0639 \u0645\u0644\u06A9',
  '\u0646\u0648\u0639 \u062E\u0648\u062F\u0631\u0648',
  '\u0646\u0648\u0639 \u062F\u0631\u062E\u0648\u0627\u0633\u062A',
  '\u0628\u0648\u062F\u062C\u0647',
  '\u0632\u0645\u0627\u0646',
  '\u0627\u0644\u0632\u0627\u0645\u06CC',
  '\u062A\u0631\u062C\u06CC\u062D\u0627\u062A',
  '\u0645\u062D\u062F\u0648\u062F\u0647 \u062A\u0631\u062C\u06CC\u062D\u06CC',
  '\u0627\u0648\u0644\u0648\u06CC\u062A',
  '\u0641\u0648\u0631\u06CC\u062A',
  '\u0647\u062F\u0641',
  '\u0628\u0631\u0646\u062F',
  '\u0645\u062F\u0644',
  '\u0645\u062A\u0631\u0627\u0698',
  '\u0637\u0628\u0642\u0647',
  '\u0642\u06CC\u0645\u062A \u0647\u0631 \u0645\u062A\u0631',
  '\u0648\u062F\u06CC\u0639\u0647',
  '\u0627\u062C\u0627\u0631\u0647 \u0647\u0631 \u0634\u0628',
  '\u062A\u0639\u062F\u0627\u062F \u0646\u0641\u0631\u0627\u062A',
  '\u062E\u0648\u0627\u0628',
  '\u0634\u0647\u0631',
  '\u0645\u062D\u0644\u0647',
  '\u0646\u0648\u0639 \u0647\u0645\u06A9\u0627\u0631\u06CC',
  '\u0633\u0627\u0628\u0642\u0647',
  '\u062D\u0642\u0648\u0642',
  '\u0632\u0645\u0627\u0646 \u0627\u0646\u062C\u0627\u0645',
] as const;

const DEAL_WORDS_RE =
  /\u0631\u0647\u0646|\u0648\u062F\u06CC\u0639\u0647|\u0627\u062C\u0627\u0631\u0647|\u062E\u0631\u06CC\u062F|\u0641\u0631\u0648\u0634/u;

const ENGLISH_SLUG_RE =
  /\b(?:general|repairs|buy|sell|rent|apartment|villa|services|jobs|partnership|remote|full|part)\b/giu;

const LABEL_NEGOTIABLE = '\u062A\u0648\u0627\u0641\u0642\u06CC';

function isServiceDraft(draft: NeedDraft, parsed: ParsedIntent): boolean {
  return (
    (parsed.intentType.includes('service') || draft.vertical === 'services') &&
    draft.vertical !== 'real-estate'
  );
}

function isJobDraft(draft: NeedDraft, parsed: ParsedIntent): boolean {
  return parsed.intentType.startsWith('job') || draft.vertical === 'jobs';
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeSentenceKey(sentence: string): string {
  return sentence
    .replace(/\s+/g, ' ')
    .replace(/[\u060C,.;\u061B:!?\u061F]/gu, '')
    .trim()
    .toLowerCase();
}

function splitSentences(text: string): string[] {
  return text
    .split(/\n+|[.!?\u061F]\s+/u)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 2);
}

function sourceMentionsNumber(source: string, value: string | number): boolean {
  const raw = String(value);
  if (sourceMentions(source, raw)) return true;
  const persian = raw.replace(/\d/g, (d) => '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'[Number(d)] ?? d);
  return persian !== raw && sourceMentions(source, persian);
}

function sourceMentionsRooms(source: string, rooms: string | number): boolean {
  const n = String(rooms);
  const persianDigits = ['', '\u06F1', '\u06F2', '\u06F3', '\u06F4', '\u06F5'];
  const persianWords = [
    '',
    '\u06CC\u06A9',
    '\u062F\u0648',
    '\u0633\u0647',
    '\u0686\u0647\u0627\u0631',
    '\u067E\u0646\u062C',
  ];
  const idx = Number(n);
  const variants = [
    `${n} \u062E\u0648\u0627\u0628`,
    `${persianDigits[idx] ?? n} \u062E\u0648\u0627\u0628`,
    `${persianWords[idx] ?? ''} \u062E\u0648\u0627\u0628`,
  ].filter((v) => v.length > 3);
  return variants.some((v) => sourceMentions(source, v));
}

function sourceMentions(source: string, fragment: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const f = norm(fragment);
  if (!f || f.length < 3) return true;
  return norm(source).includes(f);
}

function extractUserNarrative(
  draft: NeedDraft,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): string {
  const source = (draft.sourceText ?? parsed.rawText ?? '').trim();
  const details = String(answers.details ?? '').trim();
  const need =
    parsed.rawText?.trim() ||
    source.split('\n')[0]?.trim() ||
    source;

  if (details && source.includes(details)) {
    return source;
  }
  if (details && need) {
    return `${need}\n\n${details}`.trim();
  }
  return source || need;
}

function mergeUserExtras(source: string, base: string): string {
  const baseNorm = normalizeSentenceKey(base);
  const sourceNorm = normalizeSentenceKey(source);

  if (sourceNorm.length > 10 && baseNorm.length > 10) {
    const sourceWords = sourceNorm.split(' ').filter((w) => w.length > 2);
    const overlap =
      sourceWords.filter((w) => baseNorm.includes(w)).length / Math.max(sourceWords.length, 1);
    if (overlap >= 0.55) return base;
  }

  const extras = splitSentences(source).filter((sentence) => {
    const key = normalizeSentenceKey(sentence);
    if (!key || key.length < 8) return false;
    if (baseNorm.includes(key)) return false;
    if (MACHINE_LABEL_PREFIXES.some((label) => sentence.startsWith(`${label}:`))) return false;
    return true;
  });
  if (!extras.length) return base;
  return `${base} ${extras.join(' ')}`.trim();
}

function buildNaturalFactSentences(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  profile: NeedIntelligenceProfile | undefined,
  source: string
): string[] {
  const sentences: string[] = [];

  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  const dealFa = deal ? dealLabelForCategory(parsed.categorySlug, deal) : undefined;
  if (dealFa && !sourceMentions(source, dealFa) && !DEAL_WORDS_RE.test(source)) {
    sentences.push(
      `\u0646\u0648\u0639 \u062F\u0631\u062E\u0648\u0627\u0633\u062A ${dealFa} \u0627\u0633\u062A.`
    );
  }

  const budgetLabel = formatNeedBudgetLabel({
    dealType: deal,
    rahnAmount: coerceNumber(answers.rahnAmount ?? parsed.entities?.rahnAmount),
    deposit: coerceNumber(answers.deposit ?? parsed.entities?.deposit),
    monthlyRent: coerceNumber(answers.monthlyRent ?? parsed.entities?.monthlyRent),
    nightlyRent: coerceNumber(answers.nightlyRent ?? parsed.entities?.nightlyRent),
    budgetMax: typeof answers.budget === 'number' ? answers.budget : parsed.budgetMax,
    budgetMin: parsed.budgetMin,
  });
  if (budgetLabel !== LABEL_NEGOTIABLE && !sourceMentions(source, budgetLabel)) {
    sentences.push(`\u0628\u0648\u062F\u062C\u0647 ${budgetLabel}.`);
  }

  const areaMin = coerceNumber(answers.areaMin ?? parsed.entities?.areaMin);
  if (areaMin != null && !sourceMentionsNumber(source, areaMin)) {
    const approx = profile?.area?.approximate;
    sentences.push(
      approx
        ? `\u0645\u062A\u0631\u0627\u0698 \u062A\u0642\u0631\u06CC\u0628\u06CC \u062D\u062F\u0648\u062F ${areaMin} \u0645\u062A\u0631 \u0645\u062F\u0646\u0638\u0631 \u0627\u0633\u062A.`
        : `\u062D\u062F\u0627\u0642\u0644 \u0645\u062A\u0631\u0627\u0698 ${areaMin} \u0645\u062A\u0631 \u0645\u062F\u0646\u0638\u0631 \u0627\u0633\u062A.`
    );
  }

  const roomsRaw = answers.rooms ?? parsed.entities?.rooms;
  const rooms =
    typeof roomsRaw === 'string' || typeof roomsRaw === 'number' ? roomsRaw : undefined;
  if (rooms != null && !sourceMentionsRooms(source, rooms)) {
    sentences.push(`${rooms} \u062E\u0648\u0627\u0628 \u0645\u062F\u0646\u0638\u0631 \u0627\u0633\u062A.`);
  }

  const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
  if (kind) {
    const kindFa = PROPERTY_KIND_LABELS[String(kind)] ?? String(kind);
    if (!sourceMentions(source, kindFa)) {
      sentences.push(`\u0646\u0648\u0639 \u0645\u0644\u06A9 ${kindFa} \u0627\u0633\u062A.`);
    }
  }

  const loc = String(answers.location ?? parsed.city ?? '').trim();
  if (
    loc &&
    !sourceMentions(source, loc) &&
    !/\u0645\u062D\u062F\u0648\u062F\u0647/u.test(source)
  ) {
    sentences.push(`\u0645\u062D\u062F\u0648\u062F\u0647 ${loc}.`);
  }

  if (profile?.mustHave?.length) {
    const joined = profile.mustHave.join('\u060C ');
    if (!sourceMentions(source, joined)) {
      sentences.push(`\u0627\u0644\u0632\u0627\u0645\u0627\u062A: ${joined}.`);
    }
  }
  if (profile?.niceToHave?.length) {
    const joined = profile.niceToHave.join('\u060C ');
    if (!sourceMentions(source, joined)) {
      sentences.push(`\u062A\u0631\u062C\u06CC\u062D\u0627\u062A: ${joined}.`);
    }
  }

  return sentences;
}

function composeNarrativeFromUserAndFacts(
  draft: NeedDraft,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): string {
  const narrative = extractUserNarrative(draft, parsed, answers);
  const supplements = buildNaturalFactSentences(
    parsed,
    answers,
    draft.intelligenceProfile,
    narrative
  );
  return [narrative, ...supplements].filter(Boolean).join(' ').trim();
}

/** Remove machine labels, English slugs, and duplicate sentences (multi-pass). */
export function polishListingDescription(
  text: string,
  opts: { sourceText?: string } = {}
): string {
  let current = text.trim();
  if (!current) return '';

  for (let pass = 0; pass < POLISH_PASSES; pass++) {
    current = polishPass(current, pass, opts.sourceText);
  }

  return current.slice(0, MAX_DESCRIPTION_LENGTH).trim();
}

function polishPass(text: string, pass: number, sourceText?: string): string {
  switch (pass) {
    case 0:
      return stripMachineLabels(text);
    case 1:
      return stripEnglishSlugs(text);
    case 2:
      return dedupeSentences(text, sourceText);
    case 3:
    default:
      return finalizeNarrative(text);
  }
}

function stripMachineLabels(text: string): string {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const kept: string[] = [];

  for (const line of lines) {
    const isMachineLabel = MACHINE_LABEL_PREFIXES.some((prefix) => {
      const re = new RegExp(`^${prefix}\\s*[:\\u061A]`, 'u');
      return re.test(line);
    });
    if (isMachineLabel) continue;
    if (/^\u0646\u06CC\u0627\u0632\s+\u062E\u062F\u0645\u0627\u062A\s*:/u.test(line)) continue;
    kept.push(line);
  }

  return kept.join('\n');
}

function stripEnglishSlugs(text: string): string {
  return text
    .replace(ENGLISH_SLUG_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function dedupeSentences(text: string, sourceText?: string): string {
  const sentences = splitSentences(text.replace(/\n+/g, '. '));
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const sentence of sentences) {
    const key = normalizeSentenceKey(sentence);
    if (!key || key.length < 4) continue;
    if (seen.has(key)) continue;

    if (sourceText) {
      const sourceKey = normalizeSentenceKey(sourceText);
      if (sourceKey.includes(key) && key.length < 24) continue;
    }

    seen.add(key);
    unique.push(sentence);
  }

  return unique.join(' ').trim();
}

function finalizeNarrative(text: string): string {
  return text
    .replace(/[\u060C\u061B]{2,}/gu, '\u060C')
    .replace(/\s+([\u060C.\u061B])/gu, '$1')
    .replace(/([\u060C.\u061B])\s*/gu, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/\n+/g, ' ')
    .trim();
}

/** User-grounded description with iterative polish ? canonical baseline path. */
export function buildPolishedListingDescription(draft: NeedDraft): string {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const sourceText = (draft.sourceText ?? parsed.rawText ?? '').trim();

  let raw: string;
  if (isServiceDraft(draft, parsed)) {
    raw = jobsServicesCopyToDescription(buildServiceListingCopyTemplate(draft));
    raw = mergeUserExtras(sourceText, raw);
  } else if (isJobDraft(draft, parsed)) {
    raw = jobsServicesCopyToDescription(buildJobListingCopyTemplate(draft));
    raw = mergeUserExtras(sourceText, raw);
  } else {
    raw = composeNarrativeFromUserAndFacts(draft, parsed, answers);
  }

  const polished = polishListingDescription(raw, { sourceText });
  if (polished.length >= 20) return polished;
  if (sourceText.length >= 20) return polishListingDescription(sourceText, { sourceText });
  return polished;
}
