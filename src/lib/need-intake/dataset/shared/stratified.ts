import { CANONICAL_CATEGORIES, getDirectChildren } from '@/config/categories';
import type { DatasetFixture } from '../schema';

const CATEGORY_SLUGS = new Set(CANONICAL_CATEGORIES.map((c) => c.slug));

/** Resolved posting slug used for stratification. */
export function primarySlug(fixture: DatasetFixture): string {
  return fixture.labels.subcategorySlug ?? fixture.labels.categorySlug;
}

function isLeafCategorySlug(slug: string): boolean {
  if (!CATEGORY_SLUGS.has(slug)) return false;
  return getDirectChildren(slug).length === 0;
}

/** Count by generator target slug (meta.tags) when present, else primarySlug. */
export function targetSlug(fixture: DatasetFixture): string {
  for (const tag of fixture.meta?.tags ?? []) {
    if (isLeafCategorySlug(tag)) return tag;
  }
  return primarySlug(fixture);
}

export function countByTargetSlug(fixtures: DatasetFixture[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of fixtures) {
    const slug = targetSlug(f);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

export function getDepth2LeafSlugs(): string[] {
  return CANONICAL_CATEGORIES.filter((c) => c.depth === 2).map((c) => c.slug);
}

/** Posting targets: depth-2 leaves + depth-1 categories without children. */
export function getPostingTargetSlugs(): string[] {
  const parentSlugs = new Set(
    CANONICAL_CATEGORIES.map((c) => c.parentSlug).filter(Boolean) as string[]
  );
  return CANONICAL_CATEGORIES.filter(
    (c) => c.depth >= 1 && !parentSlugs.has(c.slug)
  ).map((c) => c.slug);
}

export function countByPrimarySlug(fixtures: DatasetFixture[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of fixtures) {
    const slug = primarySlug(f);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

function shuffleInPlace<T>(arr: T[], seed = 42): void {
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function groupByPrimarySlug(fixtures: DatasetFixture[]): Map<string, DatasetFixture[]> {
  const groups = new Map<string, DatasetFixture[]>();
  for (const f of fixtures) {
    const slug = primarySlug(f);
    const list = groups.get(slug) ?? [];
    list.push(f);
    groups.set(slug, list);
  }
  for (const list of groups.values()) shuffleInPlace(list);
  return groups;
}

export interface StratifiedSampleOptions {
  targetTotal: number;
  minPerDepth2Leaf?: number;
  minPerOther?: number;
  holdoutCount?: number;
}

export interface StratifiedSampleResult {
  train: DatasetFixture[];
  holdout: DatasetFixture[];
  remaining: DatasetFixture[];
}

/**
 * Build train + holdout pools with minimum per slug, then fill to targetTotal.
 */
export function stratifiedSample(
  fixtures: DatasetFixture[],
  options: StratifiedSampleOptions
): StratifiedSampleResult {
  const depth2 = new Set(getDepth2LeafSlugs());
  const minDepth2 = options.minPerDepth2Leaf ?? 250;
  const minOther = options.minPerOther ?? 40;
  const holdoutCount = options.holdoutCount ?? 500;
  const groups = groupByPrimarySlug(fixtures);

  const holdout: DatasetFixture[] = [];
  const train: DatasetFixture[] = [];
  const leftovers: DatasetFixture[] = [];

  for (const [slug, rows] of groups) {
    const min = depth2.has(slug) ? minDepth2 : minOther;
    const holdForSlug = Math.min(Math.max(1, Math.floor(min * 0.05)), Math.floor(rows.length * 0.15));
    const trainMin = Math.min(min, rows.length - holdForSlug);

    for (let i = 0; i < holdForSlug && i < rows.length; i++) {
      holdout.push(rows[i]);
    }
    for (let i = holdForSlug; i < holdForSlug + trainMin && i < rows.length; i++) {
      train.push(rows[i]);
    }
    for (let i = holdForSlug + trainMin; i < rows.length; i++) {
      leftovers.push(rows[i]);
    }
  }

  shuffleInPlace(leftovers);
  const trainTarget = options.targetTotal - holdoutCount;
  while (train.length < trainTarget && leftovers.length > 0) {
    train.push(leftovers.shift()!);
  }

  while (holdout.length < holdoutCount && leftovers.length > 0) {
    holdout.push(leftovers.shift()!);
  }

  shuffleInPlace(train);
  shuffleInPlace(holdout);

  return { train, holdout, remaining: leftovers };
}

export interface MlxSplitPaths {
  train: DatasetFixture[];
  valid: DatasetFixture[];
  test: DatasetFixture[];
}

/** 80/10/10 stratified split from train pool (round-robin per slug). */
export function buildMlxSplits(trainPool: DatasetFixture[]): MlxSplitPaths {
  const groups = groupByPrimarySlug(trainPool);
  const valid: DatasetFixture[] = [];
  const test: DatasetFixture[] = [];
  const train: DatasetFixture[] = [];

  for (const rows of groups.values()) {
    const n = rows.length;
    const validN = Math.max(1, Math.floor(n * 0.1));
    const testN = Math.max(1, Math.floor(n * 0.1));
    let i = 0;
    for (; i < validN && i < n; i++) valid.push(rows[i]);
    for (; i < validN + testN && i < n; i++) test.push(rows[i]);
    for (; i < n; i++) train.push(rows[i]);
  }

  shuffleInPlace(train);
  shuffleInPlace(valid);
  shuffleInPlace(test);
  return { train, valid, test };
}

export function uncoveredPostingSlugs(
  fixtures: DatasetFixture[],
  minCount: number
): string[] {
  const counts = countByPrimarySlug(fixtures);
  return getPostingTargetSlugs().filter((slug) => (counts.get(slug) ?? 0) < minCount);
}

export function slugVertical(slug: string): string {
  const path = CANONICAL_CATEGORIES.find((c) => c.slug === slug);
  if (!path) return 'unknown';
  let cursor = path;
  while (cursor.parentSlug) {
    const parent = CANONICAL_CATEGORIES.find((c) => c.slug === cursor.parentSlug);
    if (!parent) break;
    if (parent.depth === 0) return parent.slug;
    cursor = parent;
  }
  return slug;
}

export function childrenOrSelf(slug: string): string[] {
  const kids = getDirectChildren(slug);
  if (kids.length === 0) return [slug];
  return kids.flatMap((c) => (c.depth === 2 ? [c.slug] : childrenOrSelf(c.slug)));
}
