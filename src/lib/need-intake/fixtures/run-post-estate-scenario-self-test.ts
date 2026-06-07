/**
 * Post /post estate scenario self-test — rules + LRE analyze path.
 * Run: NEED_INTAKE_LLM_ENABLED=false npm run test:post-estate-scenarios
 */
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { getIntakeIndexes } from '@/intake/dictionaries/loader';
import { enrichIntakeAnalysisLocation } from '@/lib/need-intake/enrich-intake-analysis-location.server';
import { POST_ESTATE_SCENARIO_MATRIX } from '@/lib/need-intake/fixtures/post-estate-scenario-matrix';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

export async function runPostEstateScenarioSelfTest(): Promise<{
  passed: number;
  failed: string[];
}> {
  const indexes = await getIntakeIndexes();
  const failed: string[] = [];

  for (const scenario of POST_ESTATE_SCENARIO_MATRIX) {
    const analyzeOptions = {
      preferredCitySlug: scenario.preferredCitySlug,
      preferredCityName: scenario.preferredCityName,
    };
    const raw = analyzeNeedText(scenario.text, indexes, analyzeOptions);
    const result = enrichIntakeAnalysisLocation(raw, scenario.text, analyzeOptions);
    const err = scenario.assert(result);
    if (err) failed.push(`${scenario.id}: ${err}`);
  }

  return {
    passed: POST_ESTATE_SCENARIO_MATRIX.length - failed.length,
    failed,
  };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-post-estate-scenario-self-test'));

if (isDirectRun) {
  runPostEstateScenarioSelfTest()
    .then(({ passed, failed }) => {
      console.log(`post-estate-scenarios: ${passed}/${POST_ESTATE_SCENARIO_MATRIX.length} passed`);
      if (failed.length) {
        console.error(failed.join('\n'));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
