import { buildPostDecisionQuestions } from '@/lib/need-intake/laya/post-decision-questions';
import {
  extractPostNaturalFields,
  type DeterministicPostExtraction,
} from '@/lib/need-intake/laya/post-natural-extractor';
import {
  POST_NATURAL_PERSIAN_DATASET,
  type PostNaturalDatasetCase,
} from '@/lib/need-intake/laya/fixtures/post-natural-persian-dataset';

type LayaAnswer = {
  choice?: string;
  answer_confidence?: number;
  confidence?: number;
};

type Metric = {
  total: number;
  answered: number;
  correct: number;
  abstainedOnKnown: number;
  wrongNonUnknown: number;
  confidenceCorrectSum: number;
  confidenceIncorrectSum: number;
  confidenceCorrectCount: number;
  confidenceIncorrectCount: number;
};

const MODEL = 'convaiinnovations/laya-multilingual';
const baseUrl = process.env.LAYA_POST_BENCHMARK_URL?.trim() || 'http://127.0.0.1:8101';

function metric(): Metric {
  return {
    total: 0,
    answered: 0,
    correct: 0,
    abstainedOnKnown: 0,
    wrongNonUnknown: 0,
    confidenceCorrectSum: 0,
    confidenceIncorrectSum: 0,
    confidenceCorrectCount: 0,
    confidenceIncorrectCount: 0,
  };
}

function unknownIncludes(item: PostNaturalDatasetCase, key: string): boolean {
  return item.expected.unknown?.includes(key) ?? false;
}

function expectedChoices(item: PostNaturalDatasetCase, questionKey: string): string[] | null {
  if (questionKey === 'transaction_type') {
    const values: Record<string, string> = {
      BUY: 'buy',
      SELL: 'sell',
      RENT: 'rent_monthly',
      FULL_DEPOSIT: 'rent_rahn_full',
      DEPOSIT_AND_RENT: 'rent_rahn_ejare',
      DAILY_RENT: 'rent_short_term',
    };
    if (item.expected.transactionType) return [values[item.expected.transactionType] ?? item.expected.transactionType];
    return unknownIncludes(item, 'transactionType') ? ['unknown'] : null;
  }
  if (questionKey === 'property_kind') {
    if (item.expected.propertyKind) return [item.expected.propertyKind];
    return unknownIncludes(item, 'propertyKind') ? ['unknown'] : null;
  }
  if (['parking', 'elevator', 'storage'].includes(questionKey)) {
    if (item.expected.amenities?.includes(questionKey)) return ['yes'];
    if (item.expected.amenitiesExcluded?.includes(questionKey)) return ['no'];
    return unknownIncludes(item, questionKey) ? ['unknown'] : null;
  }
  if (questionKey === 'category_candidate') {
    return item.expected.categoryIncludes ?? null;
  }
  return null;
}

function answerConfidence(answer: LayaAnswer): number {
  const value = Number(answer.answer_confidence ?? answer.confidence ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function displayMetric(key: string, value: Metric): string {
  const accuracy = value.total ? ((value.correct / value.total) * 100).toFixed(1) : 'n/a';
  const coverage = value.total ? ((value.answered / value.total) * 100).toFixed(1) : 'n/a';
  const correctConfidence = value.confidenceCorrectCount
    ? (value.confidenceCorrectSum / value.confidenceCorrectCount).toFixed(3)
    : 'n/a';
  const incorrectConfidence = value.confidenceIncorrectCount
    ? (value.confidenceIncorrectSum / value.confidenceIncorrectCount).toFixed(3)
    : 'n/a';
  return `${key}: raw_argmax_accuracy=${accuracy}% coverage=${coverage}% answered=${value.answered}/${value.total} abstained_on_known=${value.abstainedOnKnown} wrong_non_unknown=${value.wrongNonUnknown} mean_answer_confidence_correct=${correctConfidence} mean_answer_confidence_incorrect=${incorrectConfidence}`;
}

async function run(): Promise<void> {
  const healthResponse = await fetch(`${baseUrl}/health`);
  const health = (await healthResponse.json()) as {
    model_loaded?: boolean;
    model_name?: string;
    device?: string;
  };
  if (!healthResponse.ok || health.model_name !== MODEL || !health.model_loaded) {
    throw new Error('Laya worker is not ready with the approved checkpoint');
  }

  const metrics = new Map<string, Metric>();
  let failures = 0;
  let totalLatency = 0;
  let successfulRequests = 0;
  const started = performance.now();

  for (const item of POST_NATURAL_PERSIAN_DATASET) {
    const deterministic: DeterministicPostExtraction = extractPostNaturalFields(item.text);
    const questions = buildPostDecisionQuestions({
      categoryCandidates: deterministic.categoryCandidates,
      includePropertyFields: deterministic.includePropertyFields,
    });
    const response = await fetch(`${baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: {
          text: item.text,
          normalized_text: deterministic.normalizedText,
          context: { city: deterministic.cityCandidate ?? null },
        },
        questions,
      }),
    });
    if (!response.ok) {
      failures += 1;
      continue;
    }
    const body = (await response.json()) as {
      answers?: Record<string, LayaAnswer>;
      latencyMs?: number;
    };
    totalLatency += Number(body.latencyMs ?? 0);
    successfulRequests += 1;
    for (const [questionKey, answer] of Object.entries(body.answers ?? {})) {
      const expected = expectedChoices(item, questionKey);
      if (!expected) continue;
      const current = metrics.get(questionKey) ?? metric();
      metrics.set(questionKey, current);
      current.total += 1;
      const choice = answer.choice?.trim() || 'unknown';
      if (choice !== 'unknown') current.answered += 1;
      const confidence = answerConfidence(answer);
      if (expected.includes(choice)) {
        current.correct += 1;
        current.confidenceCorrectSum += confidence;
        current.confidenceCorrectCount += 1;
      } else if (choice === 'unknown') {
        current.abstainedOnKnown += 1;
        current.confidenceIncorrectSum += confidence;
        current.confidenceIncorrectCount += 1;
      } else {
        current.wrongNonUnknown += 1;
        current.confidenceIncorrectSum += confidence;
        current.confidenceIncorrectCount += 1;
      }
    }
  }

  console.log(`laya benchmark: ${POST_NATURAL_PERSIAN_DATASET.length} Persian cases`);
  console.log(`model=${health.model_name} device=${health.device ?? 'unknown'} failures=${failures}`);
  console.log('mode=raw_argmax; this development acceptance set is not a held-out calibration set; do not derive production thresholds from it');
  for (const [key, value] of metrics) console.log(displayMetric(key, value));
  console.log(`mean_inference_latency_ms=${successfulRequests ? (totalLatency / successfulRequests).toFixed(1) : 'n/a'}`);
  console.log(`wall_clock_ms=${(performance.now() - started).toFixed(1)}`);
}

void run();
