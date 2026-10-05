import { createHash } from 'node:crypto';

type JsonObject = Record<string, unknown>;

export type SiCorpusAuditShape = {
  text?: string;
  label?: JsonObject;
  category?: string;
  city?: string;
  neighborhood?: string;
  typedDecisions?: JsonObject;
  hasSourceProvenance: boolean;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Read the selected primitive consistently across Si typed-decision answers. */
export function readSiTypedPrediction(answer: unknown): string | undefined {
  const decision = asObject(answer);
  if (!decision) return undefined;
  return nonEmptyString(decision.choice ?? decision.noul ?? decision.value);
}

export function normalizeSiCorpusText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[۰-۹٠-٩]/gu, (digit) => String(digit.charCodeAt(0) >= 0x06f0
      ? digit.charCodeAt(0) - 0x06f0
      : digit.charCodeAt(0) - 0x0660))
    .replace(/[\u200c\u200e\u200f]/g, '')
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function containsSiCorpusPiiPattern(text: string): boolean {
  const phone = /(?:\+98|0098|0)?9\d[\d\s-]{8,}/u.test(text);
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/u.test(text);
  return phone || email;
}

function usefulDecisionValue(value: unknown): string | undefined {
  const decision = asObject(value);
  const candidate = decision && Object.hasOwn(decision, 'value') ? decision.value : value;
  const text = nonEmptyString(candidate);
  return text && !['unknown', 'null', 'undefined'].includes(text.toLowerCase()) ? text : undefined;
}

function messageContent(row: JsonObject, role: string): string | undefined {
  if (!Array.isArray(row.messages)) return undefined;
  for (const item of row.messages) {
    if (!isObject(item) || item.role !== role) continue;
    return nonEmptyString(item.content);
  }
  return undefined;
}

function sourceProvenancePresent(source: JsonObject | undefined): boolean {
  return Boolean(
    nonEmptyString(source?.dataset) &&
    nonEmptyString(source?.sourceType) &&
    (nonEmptyString(source?.sourceExampleId) || nonEmptyString(source?.exampleId)) &&
    (nonEmptyString(source?.normalizedTextGroupSha256) || nonEmptyString(source?.sourceRecordHash)),
  );
}

/** Read supported corpus shapes for aggregate auditing only; this does not confer training eligibility. */
export function readSiCorpusAuditShape(row: JsonObject): SiCorpusAuditShape {
  const hypotheticalNeed = asObject(row.hypotheticalNeed);
  const counterfactualTargets = asObject(hypotheticalNeed?.targetDecisions);
  const directLabel = asObject(row.labels) ?? asObject(row.expect) ?? asObject(row.target) ??
    asObject(row.synthetic);
  let label = counterfactualTargets ?? directLabel;
  if (!label) {
    const raw = messageContent(row, 'assistant');
    if (raw) {
      try {
        label = asObject(JSON.parse(raw));
      } catch {
        label = undefined;
      }
    }
  }

  const location = asObject(label?.location) ?? asObject(asObject(label?.entities)?.location);
  const sourceOfferLocation = asObject(hypotheticalNeed?.sourceOfferLocation) ??
    asObject(row.sourceOfferLocation) ?? asObject(row.offerLocation);
  const city = usefulDecisionValue(label?.city) ?? usefulDecisionValue(location?.city) ??
    usefulDecisionValue(label?.citySlug) ?? usefulDecisionValue(sourceOfferLocation?.appCityName) ??
    usefulDecisionValue(sourceOfferLocation?.appCitySlug);
  const neighborhood = usefulDecisionValue(label?.neighborhood) ??
    usefulDecisionValue(location?.neighborhood) ?? usefulDecisionValue(label?.neighborhoodSlug) ??
    usefulDecisionValue(sourceOfferLocation?.appNeighborhoodName) ??
    usefulDecisionValue(sourceOfferLocation?.appNeighborhoodId);
  const category = usefulDecisionValue(label?.category_candidate) ??
    usefulDecisionValue(label?.categorySlug) ?? usefulDecisionValue(label?.category) ??
    (Array.isArray(label?.categorySlugs) ? usefulDecisionValue(label.categorySlugs[0]) : undefined);
  const typedDecisions = counterfactualTargets ?? asObject(row.typedDecisions) ??
    asObject(row.siDecisions);
  const source = asObject(row.source) ?? asObject(row.provenance) ?? asObject(row.sourceProvenance);

  return {
    text: nonEmptyString(row.text) ?? nonEmptyString(row.sourceText) ??
      nonEmptyString(row.userText) ?? messageContent(row, 'user') ?? nonEmptyString(row.state),
    label,
    category,
    city,
    neighborhood,
    typedDecisions,
    hasSourceProvenance: sourceProvenancePresent(source),
  };
}

function targetOnly(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(targetOnly);
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, 'value')) return targetOnly(value.value);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, targetOnly(value[key])]));
}

/** Stable, non-reversible fingerprint used only to count duplicate-label conflicts. */
export function siAuditTargetFingerprint(label: JsonObject | undefined): string | undefined {
  if (!label) return undefined;
  const target = Object.fromEntries(
    Object.keys(label).sort().map((key) => [key, targetOnly(label[key])]),
  );
  return createHash('sha256').update(JSON.stringify(target)).digest('hex');
}
