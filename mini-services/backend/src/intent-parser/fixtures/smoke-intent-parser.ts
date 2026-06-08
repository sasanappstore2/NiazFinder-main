/**
 * Headless smoke test for intent-parser (rules + location, no Ollama).
 * Run: bun run src/intent-parser/fixtures/smoke-intent-parser.ts
 */
import { PersianNormalizerService } from '../services/persian-normalizer.service';
import { LocationIndexService } from '../services/location-index.service';
import { LocationExtractorService } from '../services/location-extractor.service';
import { RuleClassifierEngine } from '../engines/rule-classifier.engine';
import { ArbitrationEngine } from '../engines/arbitration.engine';

const VANAK = '\u0648\u0646\u06A9';
const TEHRAN = '\u062A\u0647\u0631\u0627\u0646';
const RENT = '\u0627\u062C\u0627\u0631\u0647';
const SAMPLE =
  '\u062F\u0646\u0628\u0627\u0644 \u06CC\u0647 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u0628\u0631\u0627\u06CC \u0627\u062C\u0627\u0631\u0647 \u062A\u0648 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646';

async function main() {
  const normalizer = new PersianNormalizerService();
  const locationIndex = new LocationIndexService(normalizer);
  await locationIndex.onModuleInit();

  const locationExtractor = new LocationExtractorService(locationIndex, normalizer);
  const rules = new RuleClassifierEngine();
  const arbitration = new ArbitrationEngine();

  const normalized = normalizer.normalize(SAMPLE);
  const { result: location, cleanedText } = await locationExtractor.extract(normalized);
  const ruleResult = rules.classify(cleanedText);
  const { top, requiresConfirmation } = arbitration.aggregate([
    { source: 'llm', categoryId: '', confidence: 0, alternatives: [] },
    { source: 'embedding', categoryId: '', confidence: 0, alternatives: [] },
    ruleResult,
  ]);

  const ok =
    location.neighborhood?.name === VANAK &&
    location.city?.name === TEHRAN &&
    top.categoryId === 'apartment-rent' &&
    cleanedText.includes(RENT);

  console.log(JSON.stringify({ location, cleanedText, ruleResult, top, requiresConfirmation }, null, 2));
  console.log(ok ? 'smoke passed' : 'smoke failed');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
