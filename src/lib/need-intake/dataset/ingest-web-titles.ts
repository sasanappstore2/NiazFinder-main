import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import type { DatasetFixture } from './schema';
import {
  acceptWebTitle,
  dedupeFixtures,
  teacherMatchesCategory,
} from './shared/teacher-gate';
import { SLUG_SYNTH_CONFIGS, gateOptionsForConfig } from './shared/category-synth-config';
import { normalizeInput } from './shared/normalize-input';

const RESEARCH_DIR = join(process.cwd(), 'data', 'divar', 'research');

export interface IngestWebOptions {
  targetCount?: number;
  minConfidence?: number;
  researchDir?: string;
}

interface ResearchFile {
  nfSlug: string;
  vertical?: ClassifierVertical;
  titles: string[];
}

function verticalForSlug(nfSlug: string): ClassifierVertical {
  if (nfSlug.includes('apartment') || nfSlug.includes('villa') || nfSlug.includes('land') ||
      nfSlug.includes('office') || nfSlug.includes('shop') || nfSlug.includes('industrial') ||
      nfSlug.includes('suite') || nfSlug.includes('workspace') || nfSlug.includes('agency') ||
      nfSlug.includes('construction') || nfSlug.includes('pre-sale')) {
    return 'real-estate';
  }
  if (nfSlug.startsWith('car') || nfSlug === 'motorcycle' || nfSlug === 'spare-parts' || nfSlug === 'boat') {
    return 'vehicles';
  }
  if (['it', 'admin-management', 'marketing-sales', 'engineering', 'finance-legal', 'art-media', 'health-beauty'].includes(nfSlug)) {
    return 'jobs';
  }
  if (['lost-found', 'volunteering', 'cultural-artistic', 'conference', 'sporting'].includes(nfSlug)) {
    return 'social';
  }
  if (['cleaning', 'repairs', 'plumbing', 'moving', 'electrical', 'painting', 'medical-health', 'legal-services', 'it-services', 'transportation', 'beauty-health', 'events-catering', 'education'].includes(nfSlug)) {
    return 'services';
  }
  return 'products';
}

function loadResearchFiles(dir: string): ResearchFile[] {
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'summary.json');
  const out: ResearchFile[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
        nfSlug?: string;
        titles?: string[];
      };
      const nfSlug = raw.nfSlug ?? file.replace('.json', '');
      const titles = raw.titles ?? [];
      if (titles.length === 0) continue;
      out.push({ nfSlug, vertical: verticalForSlug(nfSlug), titles });
    } catch {
      // skip malformed
    }
  }

  return out;
}

export function ingestWebTitlesFromResearch(options: IngestWebOptions = {}): DatasetFixture[] {
  const dir = options.researchDir ?? RESEARCH_DIR;
  const targetCount = options.targetCount ?? 3000;
  const minConfidence = options.minConfidence ?? 0.6;
  const research = loadResearchFiles(dir);

  const fixtures: DatasetFixture[] = [];
  const seen = new Set<string>();

  for (const { nfSlug, vertical, titles } of research) {
    for (const title of titles) {
      if (fixtures.length >= targetCount) break;
      const row = acceptWebTitle(title, nfSlug, vertical ?? verticalForSlug(nfSlug), minConfidence);
      if (!row) continue;
      const key = title.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      fixtures.push(row);
    }
    if (fixtures.length >= targetCount) break;
  }

  return dedupeFixtures(fixtures);
}

const WEB_NOISE_PREFIX = ['فوری', 'عالی', 'تمیز', 'سالم', 'نو', 'کارکرده', 'قیمت مناسب'];
const WEB_NOISE_SUFFIX = ['تهران', 'قابل معاوضه', 'با ضمانت', 'تحویل فوری', ''];

/** Offline fallback: noisy synthetic titles tagged as captured when Divar research is empty. */
export function generateWebLikeFallback(targetCount: number): DatasetFixture[] {
  const fixtures: DatasetFixture[] = [];
  const seen = new Set<string>();
  let variant = 0;

  while (fixtures.length < targetCount && variant < targetCount * 40) {
    const config = SLUG_SYNTH_CONFIGS[variant % SLUG_SYNTH_CONFIGS.length];
    const template = config.templates[variant % config.templates.length];
    const base = template(variant);
    const prefix = WEB_NOISE_PREFIX[variant % WEB_NOISE_PREFIX.length];
    const suffix = WEB_NOISE_SUFFIX[variant % WEB_NOISE_SUFFIX.length];
    const input = suffix ? `${prefix} ${base} ${suffix}`.trim() : `${prefix} ${base}`.trim();
    variant += 1;

    const key = normalizeInput(input);
    if (seen.has(key)) continue;

    const row = teacherMatchesCategory(input, {
      ...gateOptionsForConfig(config),
      source: 'captured',
      tags: ['web-fallback', config.slug],
    });
    if (!row) continue;
    seen.add(key);
    fixtures.push({ ...row, meta: { ...row.meta, source: 'captured', tags: ['web-fallback'] } });
  }

  return fixtures;
}

/** @deprecated use generateWebLikeFallback */
export function ingestWebTitlesFallback(targetCount: number): DatasetFixture[] {
  return generateWebLikeFallback(targetCount);
}
