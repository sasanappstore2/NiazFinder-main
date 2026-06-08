import { Injectable } from '@nestjs/common';
import { ClassifierResult } from '../types/intent.types';
import { CATEGORY_KEYWORD_RULES } from '../data/category-keywords';

@Injectable()
export class RuleClassifierEngine {
  classify(text: string): ClassifierResult | null {
    let best: { id: string; count: number; totalLen: number } | null = null;

    for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORD_RULES)) {
      const matched = keywords.filter((kw) => text.includes(kw));
      if (matched.length === 0) continue;

      const totalLen = matched.reduce((sum, kw) => sum + kw.length, 0);
      const score = matched.length * 100 + totalLen;

      if (!best || score > best.count * 100 + best.totalLen) {
        best = { id: categoryId, count: matched.length, totalLen };
      }
    }

    if (!best) return null;

    return {
      source: 'rule',
      categoryId: best.id,
      confidence: Math.min(0.7 + best.count * 0.1, 0.95),
      alternatives: [],
    };
  }
}
