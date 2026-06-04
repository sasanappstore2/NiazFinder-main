import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import type { DatasetFixture } from '../schema';
import { targetSlug } from './stratified';
import {
  configsForVertical,
  gateOptionsForConfig,
  SLUG_SYNTH_CONFIGS,
  SYNTH_VERTICAL_TARGETS,
  type SlugSynthConfig,
} from './category-synth-config';
import { normalizeInput } from './normalize-input';
import { teacherMatchesCategory } from './teacher-gate';

export interface GenerateSyntheticOptions {
  targetCount?: number;
  vertical?: ClassifierVertical;
  slug?: string;
  maxAttemptsPerTemplate?: number;
}

function buildInput(config: SlugSynthConfig, variant: number): string {
  const base = config.templates[variant % config.templates.length](variant);
  if (variant < config.templates.length * 4) return base;
  const suffix = variant % 3 === 0 ? ` #${variant}` : variant % 3 === 1 ? ` (${variant})` : ` — نمونه ${variant}`;
  return `${base}${suffix}`;
}

function generateForConfig(
  config: SlugSynthConfig,
  targetPerSlug: number,
  maxAttempts: number,
  seen: Set<string>
): DatasetFixture[] {
  const fixtures: DatasetFixture[] = [];
  const gate = gateOptionsForConfig(config);
  let variant = 0;
  let attempts = 0;
  const maxTotalAttempts = Math.max(targetPerSlug * maxAttempts, targetPerSlug * 80);

  while (fixtures.length < targetPerSlug && attempts < maxTotalAttempts) {
    const input = buildInput(config, variant);
    variant += 1;
    attempts += 1;

    const key = normalizeInput(input);
    if (seen.has(key)) continue;

    const row = teacherMatchesCategory(input, gate);
    if (!row) continue;

    seen.add(key);
    fixtures.push(row);
  }

  return fixtures;
}

export function generateSyntheticForVertical(
  vertical: ClassifierVertical,
  targetCount: number,
  seen: Set<string>
): DatasetFixture[] {
  const configs = configsForVertical(vertical);
  if (configs.length === 0) return [];

  const perSlug = Math.max(60, Math.ceil(targetCount / configs.length) + 8);
  const out: DatasetFixture[] = [];

  for (const config of configs) {
    const rows = generateForConfig(config, perSlug, 64, seen);
    out.push(...rows);
    if (out.length >= targetCount) break;
  }

  return out.slice(0, targetCount);
}

export function generateAllSyntheticDataset(
  options: GenerateSyntheticOptions = {}
): DatasetFixture[] {
  const seen = new Set<string>();
  const out: DatasetFixture[] = [];

  if (options.slug) {
    const config = SLUG_SYNTH_CONFIGS.find((c) => c.slug === options.slug);
    if (!config) return [];
    const target = options.targetCount ?? 250;
    return generateForConfig(config, target, options.maxAttemptsPerTemplate ?? 64, seen);
  }

  if (options.vertical) {
    const target = options.targetCount ?? SYNTH_VERTICAL_TARGETS[options.vertical] ?? 500;
    return generateSyntheticForVertical(options.vertical, target, seen);
  }

  for (const [vertical, target] of Object.entries(SYNTH_VERTICAL_TARGETS) as Array<
    [ClassifierVertical, number]
  >) {
    if (vertical === 'real-estate') continue;
    const rows = generateSyntheticForVertical(vertical, target, seen);
    out.push(...rows);
  }

  return out;
}

/** Fill gaps for slugs below minCount using targeted generation. */
export function fillSlugGaps(
  existing: DatasetFixture[],
  slugTargets: Map<string, number>,
  seen: Set<string>
): DatasetFixture[] {
  const counts = new Map<string, number>();
  for (const f of existing) {
    const slug = targetSlug(f);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  const added: DatasetFixture[] = [];
  for (const [slug, minCount] of slugTargets) {
    const have = counts.get(slug) ?? 0;
    if (have >= minCount) continue;

    const config = SLUG_SYNTH_CONFIGS.find((c) => c.slug === slug);
    if (!config) continue;

    const need = minCount - have;
    const rows = generateForConfig(config, need, 96, seen);
    added.push(...rows);
  }

  return added;
}
