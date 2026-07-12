import assert from 'node:assert/strict';
import {
  citiesForUserReview,
  extractCitiesMentionedInText,
  textMentionsCityOtherThan,
} from '@/lib/need-intake/extract-cities-from-text';
import { buildManualSuggestionChips } from '@/lib/need-intake/manual-suggestions';
import type { ParsedIntent } from '@/contracts/need-intake';
import {
  mayAutoApplyLocation,
  sanitizeDraftForComposeAutoApply,
} from '@/lib/need-intake/compose-auto-apply';

function testExtractCities() {
  const text = '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646';
  const cities = extractCitiesMentionedInText(text);
  assert.ok(cities.includes('\u062A\u0647\u0631\u0627\u0646'));
  assert.equal(textMentionsCityOtherThan(text, '\u0645\u0634\u0647\u062F'), true);
  assert.equal(textMentionsCityOtherThan(text, '\u062A\u0647\u0631\u0627\u0646'), false);
}

function testManualSuggestionsRespectUserCity() {
  const parsed: ParsedIntent = {
    intentType: 'buy',
    confidence: 0.8,
    entities: {},
    rawText:
      '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646',
    city: '\u0645\u0634\u0647\u062F',
    neighborhoodCandidates: [
      { slug: 'vanak', label: '\u0648\u0646\u06A9', city: '\u062A\u0647\u0631\u0627\u0646' },
    ],
  };

  const chips = buildManualSuggestionChips(parsed, '\u0645\u0634\u0647\u062F');
  const cityChips = chips.filter((c) => c.value.startsWith('city:'));
  assert.equal(cityChips.length, 1);
  assert.match(cityChips[0]!.label, /\u062A\u0647\u0631\u0627\u0646/);
  assert.equal(citiesForUserReview(parsed.rawText, { userCity: '\u0645\u0634\u0647\u062F' }).length, 1);

  const hood = chips.find((c) => c.value.startsWith('neighborhood:vanak'));
  assert.ok(hood);
  assert.match(hood!.label, /\u062A\u0647\u0631\u0627\u0646/);
}

function testRefuseAmbiguousLocationAutoApply() {
  const weak = {
    schemaVersion: 1,
    sourceText: 'ونک',
    answers: {},
    entities: { neighborhood: 'ونک', city: 'تهران' },
    sections: [],
    completeness: 0,
    missingRequired: [],
    nextQuestion: null,
    fieldMeta: {
      neighborhood: { value: 'ونک', confidence: 0.65, source: 'resolver' },
      city: { value: 'تهران', confidence: 0.65, source: 'resolver' },
    },
    parsedIntent: {
      intentType: 'buy' as const,
      confidence: 0.5,
      entities: {},
      rawText: 'ونک',
      neighborhoodCandidates: [
        { slug: 'a', label: 'ونک', city: 'تهران' },
        { slug: 'b', label: 'ونک', city: 'تهران' },
      ],
    },
  };
  assert.equal(mayAutoApplyLocation(weak as never, 'neighborhood'), false);
  const cleaned = sanitizeDraftForComposeAutoApply(weak as never);
  assert.equal((cleaned.entities as Record<string, unknown>).neighborhood, undefined);
}

testExtractCities();
testManualSuggestionsRespectUserCity();
testRefuseAmbiguousLocationAutoApply();
console.log('test:intake-location-priority OK');
