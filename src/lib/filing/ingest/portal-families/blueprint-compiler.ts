import type { CrawlBlueprint } from '@/lib/filing/ingest/crawl-blueprint';
import {
  analyzeCardText,
  guessesToConfidenceMap,
  guessesToFieldMap,
} from '@/lib/filing/ingest/intake-card-analyzer';
import type {
  DiscoveryResult,
  FieldGuess,
  SiteIndex,
} from '@/lib/filing/ingest/portal-families/types';
import { parseCrawlBlueprint } from '@/lib/filing/ingest/crawl-blueprint';

type PythonDiscoveryPayload = {
  ok?: boolean;
  siteIndex: SiteIndex;
  fieldGuesses?: FieldGuess[];
  sampleCards?: string[];
  blueprint?: CrawlBlueprint;
  confidenceMap?: Partial<Record<string, number>>;
};

function mergeFieldGuesses(dom: FieldGuess[], intake: FieldGuess[]): FieldGuess[] {
  const byKey = new Map<string, FieldGuess>();
  for (const g of [...dom, ...intake]) {
    const prev = byKey.get(g.key);
    if (!prev || g.confidence > prev.confidence) {
      byKey.set(g.key, g);
    } else if (prev && g.extractor?.selector && !prev.extractor?.selector) {
      byKey.set(g.key, { ...prev, extractor: g.extractor, confidence: Math.max(prev.confidence, g.confidence) });
    }
  }
  return Array.from(byKey.values());
}

function mergeFieldMaps(
  domMap: NonNullable<CrawlBlueprint['fieldMap']>,
  intakeMap: NonNullable<CrawlBlueprint['fieldMap']>
): NonNullable<CrawlBlueprint['fieldMap']> {
  const out: NonNullable<CrawlBlueprint['fieldMap']> = { ...intakeMap };
  for (const [key, spec] of Object.entries(domMap)) {
    const k = key as keyof typeof out;
    const existing = out[k];
    if (!existing) {
      out[k] = spec;
      continue;
    }
    out[k] = {
      ...existing,
      ...(spec.selector ? { selector: spec.selector } : {}),
      ...(spec.regex && !existing.selector ? { regex: spec.regex, regexGroup: spec.regexGroup } : {}),
    };
  }
  return out;
}

/** Compile final blueprint from DOM discovery + intake analysis on sample cards. */
export function compileBlueprintFromDiscovery(
  payload: PythonDiscoveryPayload,
  userCity: string
): DiscoveryResult {
  const siteIndex = payload.siteIndex;
  const domBlueprint = payload.blueprint ?? { version: 2 as const };
  const domGuesses = payload.fieldGuesses ?? [];
  const samples = payload.sampleCards ?? [];

  let intakeGuesses: FieldGuess[] = [];
  for (const sample of samples.slice(0, 3)) {
    intakeGuesses = mergeFieldGuesses(intakeGuesses, analyzeCardText(sample, userCity));
  }

  const mergedGuesses = mergeFieldGuesses(domGuesses, intakeGuesses);
  const domMap = domBlueprint.fieldMap ?? {};
  const intakeMap = guessesToFieldMap(intakeGuesses);
  const fieldMap = mergeFieldMaps(domMap, intakeMap);

  const blueprint = parseCrawlBlueprint(
    JSON.stringify({
      ...domBlueprint,
      version: 2,
      fieldMap,
      detailPage: domBlueprint.detailPage ?? {
        enabled: true,
        linkFromList: true,
        maxConcurrent: 3,
      },
      neighborhoodParse: domBlueprint.neighborhoodParse ?? {
        splitOn: '-',
        cityIndex: 0,
        neighborhoodIndex: 1,
      },
      titleTemplate: domBlueprint.titleTemplate ?? '{dealType} {propertyKind} {area} متری',
    })
  );

  const confidenceMap = {
    ...payload.confidenceMap,
    ...guessesToConfidenceMap(mergedGuesses),
  };

  return {
    siteIndex,
    fieldGuesses: mergedGuesses,
    sampleCards: samples,
    blueprint,
    confidenceMap,
  };
}

export function discoveryNeedsManualFix(
  result: DiscoveryResult,
  threshold = 0.6
): FieldGuess[] {
  return result.fieldGuesses.filter((g) => g.confidence < threshold && !g.manuallyFixed);
}
