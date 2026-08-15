import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import { maskNegatedCategoryCues } from '@/intake/rules/negation-mask';
import type { CategoryMatchCandidate, IntakeRule } from '@/intake/rules/types';

function ruleWeight(rule: IntakeRule): number {
  return (rule.priority ?? 5) * 10 + (rule.weight ?? 1);
}

function includesBounded(text: string, pattern: string): boolean {
  const p = normalizeIntakeText(pattern);
  if (!p) return false;
  let idx = 0;
  while ((idx = text.indexOf(p, idx)) !== -1) {
    const before = idx > 0 ? text[idx - 1]! : ' ';
    const after = idx + p.length < text.length ? text[idx + p.length]! : ' ';
    const isLetter = (c: string) => /[\u0600-\u06FFa-zA-Z0-9\u200c]/.test(c);
    if (!isLetter(before) && !isLetter(after)) return true;
    idx += 1;
  }
  return false;
}

function textMatchesRule(text: string, rule: IntakeRule): boolean {
  const pat = normalizeIntakeText(rule.pattern);
  if (!pat) return false;

  if (rule.unless?.some((u) => includesBounded(text, u))) {
    return false;
  }

  switch (rule.kind) {
    case 'regex': {
      try {
        return new RegExp(rule.pattern, 'iu').test(text);
      } catch {
        return false;
      }
    }
    case 'model': {
      // Bare 1–2 digit models (e.g. legacy "14") collide with money amounts («تا 14 میلیارد»).
      if (/^\d{1,2}$/.test(pat)) {
        const phoneCue =
          /گوشی|موبایل|آیفون|iphone|سامسونگ|samsung|شیائومی|xiaomi|هواوی|huawei/u.test(
            text
          );
        if (!phoneCue) return false;
      }
      return includesBounded(text, pat);
    }
    case 'phrase':
    case 'keyword':
    case 'brand':
    case 'scenario':
    case 'deal':
      return includesBounded(text, pat);
    case 'negative':
      return includesBounded(text, pat);
    default:
      return includesBounded(text, pat);
  }
}

export function scoreRulesAgainstText(
  text: string,
  rules: IntakeRule[],
  negativeRules: IntakeRule[]
): CategoryMatchCandidate[] {
  const normalized = maskNegatedCategoryCues(text);
  const bySlug = new Map<string, { score: number; matched: string[] }>();

  for (const rule of rules) {
    if (!textMatchesRule(normalized, rule)) continue;
    const slug = rule.slug;
    const entry = bySlug.get(slug) ?? { score: 0, matched: [] };
    entry.score += ruleWeight(rule);
    entry.matched.push(rule.id);
    bySlug.set(slug, entry);
  }

  for (const neg of negativeRules) {
    if (!textMatchesRule(normalized, neg)) continue;
    const blocked = neg.slug;
    const entry = bySlug.get(blocked);
    if (entry) {
      entry.score = Math.max(0, entry.score - ruleWeight(neg) * 3);
      entry.matched.push(neg.id);
    }
  }

  const maxScore = Math.max(1, ...[...bySlug.values()].map((v) => v.score));
  const candidates: CategoryMatchCandidate[] = [];

  for (const [slug, { score, matched }] of bySlug) {
    if (score <= 0) continue;
    candidates.push({
      slug,
      score,
      confidence: Math.min(0.98, 0.55 + (score / maxScore) * 0.43),
      matchedRules: matched,
      source: 'registry',
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

export function extractFieldsFromRules(
  text: string,
  rules: IntakeRule[]
): { brand?: string; model?: string; condition?: string; dealType?: string; titleSubject?: string } {
  const normalized = normalizeIntakeText(text);
  const out: {
    brand?: string;
    model?: string;
    condition?: string;
    dealType?: string;
    titleSubject?: string;
  } = {};

  for (const rule of rules) {
    if (!textMatchesRule(normalized, rule)) continue;
    if (rule.set) {
      if (rule.set.brand) out.brand = String(rule.set.brand);
      if (rule.set.model) out.model = String(rule.set.model);
      if (rule.set.condition) out.condition = String(rule.set.condition);
      if (rule.set.dealType) out.dealType = String(rule.set.dealType);
    }
    if (rule.kind === 'brand' && rule.pattern) {
      out.brand = rule.pattern;
    }
    if (rule.kind === 'model' && rule.pattern) {
      out.model = rule.pattern;
    }
    if (rule.titleTemplate) {
      const product = rule.set?.product ? String(rule.set.product) : '';
      out.titleSubject = rule.titleTemplate
        .replace(/\{product\}/g, product || '')
        .replace(/\{brand\}/g, out.brand ?? '')
        .replace(/\{model\}/g, out.model ?? '')
        .replace(/\{condition\}/g, out.condition ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  return out;
}
