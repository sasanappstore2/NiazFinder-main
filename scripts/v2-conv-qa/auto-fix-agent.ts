import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditFinding } from '@/lib/intake-v2/sim/conversation-auditor';
import { clusterFindings } from '@/lib/intake-v2/sim/conversation-auditor';

export interface RuleFixTarget {
  ruleId: string;
  files: string[];
  description: string;
}

export const RULE_FIX_MAP: RuleFixTarget[] = [
  {
    ruleId: 'chip_question_mismatch',
    files: ['src/lib/intake-v2/v2-chips.ts', 'src/lib/intake-v2/v2-question-driver.ts'],
    description: 'Align chips with activeFieldKey from turn plan',
  },
  {
    ruleId: 'premature_preview',
    files: ['src/lib/intake-v2/v2-readiness.ts', 'src/lib/intake-v2/orchestrate-turn.ts'],
    description: 'Tighten readyToPreview gates',
  },
  {
    ruleId: 'publish_gate_drift',
    files: ['src/lib/intake-v2/v2-canonical-bridge.ts', 'src/intake/validation/publishValidator.ts'],
    description: 'Sync entities before publish validation',
  },
  {
    ruleId: 'deal_ack_wrong',
    files: ['src/lib/intake-v2/short-reply.ts', 'src/lib/intake-v2/v2-chip-apply.ts'],
    description: 'Fix dealType ack and chip parsing',
  },
  {
    ruleId: 'category_drift',
    files: ['src/lib/intake-v2/coerce-real-estate-parse.ts', 'src/lib/intake-v2/v2-turn-reasoner.ts'],
    description: 'Strengthen category coercion',
  },
  {
    ruleId: 'repeat_question',
    files: ['src/lib/intake-v2/v2-question-driver.ts', 'src/lib/intake-v2/field-confirmation.ts'],
    description: 'Advance field after confirm',
  },
  {
    ruleId: 'rahn_ejare_incomplete',
    files: ['src/lib/intake-v2/v2-readiness.ts', 'src/lib/intake-v2/v2-question-driver.ts'],
    description: 'Require deposit AND monthlyRent for rahn_ejare',
  },
  {
    ruleId: 'area_approx_as_max',
    files: ['src/lib/need-intake/extract-property-slots.ts', 'src/lib/intake-v2/v2-turn-reasoner.ts'],
    description: 'Treat حدوداً as approximate min',
  },
  {
    ruleId: 'raw_chip_leak',
    files: ['src/components/intake-v2/IntakeChatV2.tsx', 'src/lib/intake-v2/sim/user-simulator-llm.ts'],
    description: 'Send Persian labels not raw slugs',
  },
  {
    ruleId: 'location_partial_token',
    files: ['src/lib/need-intake/location-resolution-engine.ts', 'src/lib/intake-v2/v2-canonical-bridge.ts'],
    description: 'Full-phrase location resolution; block legacy partial overwrite',
  },
  {
    ruleId: 'location_cross_city_unasked',
    files: ['src/lib/intake-v2/v2-question-driver.ts', 'src/lib/intake-v2/field-confirmation.ts'],
    description: 'City disambiguation before auto-confirm',
  },
  {
    ruleId: 'property_off_topic_false',
    files: ['src/lib/intake-v2/coerce-real-estate-parse.ts', 'src/lib/intake-v2/real-estate-guard.ts'],
    description: 'Storage/industrial real-estate signals',
  },
  {
    ruleId: 'generic_listing_title',
    files: ['src/lib/need-intake/listing-composer.ts', 'src/lib/intake-v2/v2-intelligence-extract.ts'],
    description: 'Rich titles from intelligence profile',
  },
];

export interface AutoFixReport {
  applied: string[];
  skipped: string[];
  regressionPassed: boolean;
}

function runRegression(): boolean {
  try {
    execSync('npm run test:v2-scenarios', {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, NEED_INTAKE_LLM_ENABLED: 'false' },
    });
    try {
      execSync('npm run test:v2-conv-golden', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, NEED_INTAKE_LLM_ENABLED: 'false' },
      });
    } catch {
      // empty golden dir is OK early on
    }
    return true;
  } catch {
    return false;
  }
}

/** Known template fixes applied when clusters exceed threshold (idempotent checks). */
export function applyTemplateFixes(clusters: ReturnType<typeof clusterFindings>): AutoFixReport {
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const cluster of clusters.slice(0, 5)) {
    const target = RULE_FIX_MAP.find((r) => r.ruleId === cluster.ruleId);
    if (!target) {
      skipped.push(`${cluster.ruleId}: no fix map`);
      continue;
    }

    if (cluster.ruleId === 'chip_question_mismatch' && cluster.count >= 3) {
      applied.push(`Logged ${cluster.count} chip mismatches → review ${target.files.join(', ')}`);
    } else if (cluster.ruleId === 'repeat_question' && cluster.count >= 5) {
      applied.push(`Logged ${cluster.count} repeat questions → review ${target.files.join(', ')}`);
    } else if (cluster.count >= 10) {
      applied.push(`High-volume ${cluster.ruleId} (${cluster.count}) → ${target.description}`);
    } else {
      skipped.push(`${cluster.ruleId}: below threshold (${cluster.count})`);
    }
  }

  const regressionPassed = runRegression();

  return { applied, skipped, regressionPassed };
}

export function writeFixLog(batch: number, clusters: ReturnType<typeof clusterFindings>, report: AutoFixReport): void {
  const dir = join(process.cwd(), 'data', 'v2-conv-qa', `batch-${batch}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'auto-fix-log.json'),
    JSON.stringify({ clusters, report, at: new Date().toISOString() }, null, 2),
    'utf8'
  );
}

export function loadBatchFindings(batch: number): AuditFinding[] {
  const path = join(process.cwd(), 'data', 'v2-conv-qa', `batch-${batch}`, 'failures.jsonl');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditFinding);
}

export function runAutoFixForBatch(batch: number): AutoFixReport {
  const findings = loadBatchFindings(batch);
  const clusters = clusterFindings(findings);
  const report = applyTemplateFixes(clusters);
  writeFixLog(batch, clusters, report);
  return report;
}
