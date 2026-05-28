import { db } from '@/lib/db';

export interface CandidateFailureInput {
  sourceText?: string | null;
  expectedCategory: string;
  candidateSlugs: string[];
  aiSelectedCategory?: string | null;
  publishedCategory?: string | null;
  serviceRequestId?: string | null;
}

export function candidateCoversExpected(
  expectedCategory: string,
  candidateSlugs: readonly string[]
): boolean {
  const key = expectedCategory.toLowerCase();
  return candidateSlugs.some((s) => s.toLowerCase() === key);
}

export async function recordCandidateFailure(input: CandidateFailureInput): Promise<void> {
  try {
    const coverage = candidateCoversExpected(input.expectedCategory, input.candidateSlugs);
    if (coverage && input.aiSelectedCategory === input.expectedCategory) {
      return;
    }

    await db.intakeCandidateFailureEvent.create({
      data: {
        sourceText: input.sourceText ?? null,
        expectedCategory: input.expectedCategory,
        candidateSlugs: JSON.stringify(input.candidateSlugs),
        aiSelectedCategory: input.aiSelectedCategory ?? null,
        publishedCategory: input.publishedCategory ?? input.expectedCategory,
        coverage,
        serviceRequestId: input.serviceRequestId ?? null,
      },
    });
  } catch (error) {
    console.error('[CandidateFailures] record failed:', error);
  }
}

export function recordCandidateFailureAsync(input: CandidateFailureInput): void {
  void recordCandidateFailure(input);
}

export interface CandidateFailureStats {
  totalFailures: number;
  missingCoverage: number;
  topMissingCategories: Array<{ category: string; count: number }>;
  topAmbiguousCategories: Array<{ category: string; count: number }>;
}

export async function buildCandidateFailureStats(
  windowHours = 24 * 7
): Promise<CandidateFailureStats> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const events = await db.intakeCandidateFailureEvent.findMany({
    where: { createdAt: { gte: since } },
    select: {
      expectedCategory: true,
      coverage: true,
      aiSelectedCategory: true,
      publishedCategory: true,
    },
  });

  const missingMap = new Map<string, number>();
  const ambiguousMap = new Map<string, number>();
  let missingCoverage = 0;

  for (const e of events) {
    if (!e.coverage) {
      missingCoverage += 1;
      const cat = e.expectedCategory ?? 'unknown';
      missingMap.set(cat, (missingMap.get(cat) ?? 0) + 1);
    } else if (
      e.aiSelectedCategory &&
      e.publishedCategory &&
      e.aiSelectedCategory !== e.publishedCategory
    ) {
      const cat = e.expectedCategory ?? 'unknown';
      ambiguousMap.set(cat, (ambiguousMap.get(cat) ?? 0) + 1);
    }
  }

  const sortTop = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  return {
    totalFailures: events.length,
    missingCoverage,
    topMissingCategories: sortTop(missingMap),
    topAmbiguousCategories: sortTop(ambiguousMap),
  };
}

export async function computeCandidateCoverageRate(
  windowHours = 24 * 7
): Promise<{ rate: number; total: number; covered: number }> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const events = await db.intakeCandidateFailureEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { coverage: true },
  });
  const total = events.length;
  const covered = events.filter((e) => e.coverage).length;
  const rate = total > 0 ? Math.round((covered / total) * 1000) / 10 : 100;
  return { rate, total, covered };
}
