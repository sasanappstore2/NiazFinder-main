import { Injectable } from '@nestjs/common';
import { ClassifierResult, AggregatedCategory } from '../types/intent.types';

const WEIGHTS: Record<string, number> = {
  rule: 0.4,
  llm: 0.35,
  embedding: 0.25,
};

const CONFIRMATION_THRESHOLD = 0.68;

@Injectable()
export class ArbitrationEngine {
  aggregate(results: (ClassifierResult | null)[]): {
    top: AggregatedCategory;
    alternatives: AggregatedCategory[];
    requiresConfirmation: boolean;
  } {
    const valid = results.filter(Boolean) as ClassifierResult[];

    const allIds = new Set<string>();
    for (const r of valid) {
      if (r.categoryId) allIds.add(r.categoryId);
      r.alternatives.forEach((a) => a.id && allIds.add(a.id));
    }

    const scores = new Map<string, AggregatedCategory>();

    for (const id of allIds) {
      const contributions: AggregatedCategory['contributions'] = [];
      let total = 0;

      for (const r of valid) {
        const w = WEIGHTS[r.source] || 0.2;

        if (r.categoryId === id) {
          contributions.push({ source: r.source, confidence: r.confidence, weight: w });
          total += r.confidence * w;
        } else {
          const alt = r.alternatives.find((a) => a.id === id);
          if (alt) {
            const reduced = w * 0.3;
            contributions.push({ source: r.source, confidence: alt.confidence, weight: reduced });
            total += alt.confidence * reduced;
          }
        }
      }

      scores.set(id, { categoryId: id, finalConfidence: total, contributions });
    }

    const sorted = Array.from(scores.values())
      .filter((s) => s.categoryId)
      .sort((a, b) => b.finalConfidence - a.finalConfidence);

    if (sorted.length === 0) {
      return {
        top: { categoryId: '', finalConfidence: 0, contributions: [] },
        alternatives: [],
        requiresConfirmation: true,
      };
    }

    return {
      top: sorted[0],
      alternatives: sorted.slice(1, 4),
      requiresConfirmation: sorted[0].finalConfidence < CONFIRMATION_THRESHOLD,
    };
  }
}
