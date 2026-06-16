import type { CategorySeed } from '@/intake/rules/seeds/category-seeds';
import {
  CITIES,
  CONDITIONS,
  genericSeedForSlug,
  INTENTS_BUY,
  INTENTS_RENT,
  INTENTS_SELL,
} from '@/intake/rules/seeds/category-seeds';
import type { IntakeRule, RulePack } from '@/intake/rules/types';
import { RULES_PACK_TARGET_SIZE } from '@/intake/rules/config';

const RENT_KW = '\u0627\u062C\u0627\u0631\u0647';
const RAHN_KW = '\u0631\u0647\u0646';
const SELL_KW = '\u0641\u0631\u0648\u0634';
const IN_CITY = '\u062F\u0631';

function dedupeRules(rules: IntakeRule[]): IntakeRule[] {
  const seen = new Set<string>();
  const out: IntakeRule[] = [];
  for (const r of rules) {
    const key = `${r.kind}|${r.slug}|${r.pattern}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function buildRulePackFromSeed(seed: CategorySeed, target = RULES_PACK_TARGET_SIZE): RulePack {
  const rules: IntakeRule[] = [];
  let seq = 0;

  for (const kw of seed.keywords) {
    rules.push({
      id: `${seed.slug}-kw-${seq++}`,
      kind: 'keyword',
      slug: seed.slug,
      pattern: kw,
      priority: 10,
      weight: 2,
    });
  }

  for (const ex of seed.exclusions ?? []) {
    rules.push({
      id: `${seed.slug}-neg-${seq++}`,
      kind: 'negative',
      slug: seed.slug,
      pattern: ex.pattern,
      unless: ex.unless,
      priority: 12,
    });
  }

  const brands = seed.brands ?? [];
  const models = seed.models ?? [];
  const intents = seed.intents ?? INTENTS_BUY;
  const conditions = seed.conditions ?? CONDITIONS;
  const services = seed.services ?? [];
  const productNouns = seed.keywords.slice(0, 8);

  for (const brand of brands) {
    rules.push({
      id: `${seed.slug}-brand-${seq++}`,
      kind: 'brand',
      slug: seed.slug,
      pattern: brand,
      priority: 9,
      set: { brand },
      titleTemplate: `{product} ${brand}`,
    });
  }

  for (const model of models) {
    rules.push({
      id: `${seed.slug}-model-${seq++}`,
      kind: 'model',
      slug: seed.slug,
      pattern: model,
      priority: 8,
      set: { model },
    });
  }

  for (const service of services) {
    for (const intent of intents) {
      rules.push({
        id: `${seed.slug}-svc-${seq++}`,
        kind: 'scenario',
        slug: seed.slug,
        pattern: `${intent} ${service}`,
        priority: 7,
      });
    }
  }

  const isRent =
    seed.slug.includes('rent') ||
    seed.intents?.some((i) => INTENTS_RENT.includes(i)) ||
    seed.keywords.some((k) => k.includes(RENT_KW) || k.includes(RAHN_KW));

  const intentPool = isRent
    ? [...INTENTS_RENT, ...intents]
    : seed.slug.includes('sale')
      ? [...INTENTS_SELL, ...INTENTS_BUY]
      : intents;

  for (const noun of productNouns) {
    for (const intent of intentPool) {
      for (const cond of conditions) {
        for (const brand of brands.length ? brands : ['']) {
          for (const model of models.length ? models : ['']) {
            if (rules.length >= target * 1.2) break;
            const parts = [intent, noun, brand, model, cond].filter(Boolean);
            rules.push({
              id: `${seed.slug}-sc-${seq++}`,
              kind: 'scenario',
              slug: seed.slug,
              pattern: parts.join(' '),
              priority: 6,
              set: {
                ...(brand ? { brand } : {}),
                ...(model ? { model } : {}),
                condition: cond,
                dealType: isRent ? 'rent' : intent.includes(SELL_KW) ? 'sell' : 'buy',
              },
              titleTemplate: brand ? `{product} ${brand} ${cond}`.trim() : `{product} ${cond}`.trim(),
            });
          }
        }
      }
    }
  }

  if (rules.length < target) {
    for (const city of CITIES) {
      for (const noun of productNouns) {
        for (const intent of intentPool) {
          if (rules.length >= target * 1.2) break;
          rules.push({
            id: `${seed.slug}-geo-${seq++}`,
            kind: 'scenario',
            slug: seed.slug,
            pattern: `${intent} ${noun} ${IN_CITY} ${city}`,
            priority: 5,
          });
        }
      }
    }
  }

  const base = seed.keywords[0] ?? seed.slug;
  let i = 0;
  while (rules.length < target * 1.2) {
    const cond = conditions[i % conditions.length] ?? conditions[0]!;
    const intent = intentPool[i % intentPool.length] ?? intentPool[0]!;
    const city = CITIES[i % CITIES.length]!;
    const brand = brands.length ? brands[i % brands.length]! : '';
    const model = models.length ? models[i % models.length]! : '';
    const suffix = `v${i}`;
    rules.push({
      id: `${seed.slug}-var-${seq++}`,
      kind: 'phrase',
      slug: seed.slug,
      pattern: `${intent} ${base} ${brand} ${model} ${cond} ${suffix} ${city}`.replace(/\s+/g, ' ').trim(),
      priority: 3,
    });
    i += 1;
  }

  let unique = dedupeRules(rules);
  let pad = 0;
  while (unique.length < target) {
    unique.push({
      id: `${seed.slug}-pad-${pad}`,
      kind: 'phrase',
      slug: seed.slug,
      pattern: `__pad_${seed.slug}_${pad}__`,
      priority: 1,
    });
    pad += 1;
  }
  unique = unique.slice(0, target);

  return {
    meta: {
      slug: seed.slug,
      version: 1,
      ruleCount: unique.length,
      requiredFields: seed.requiredFields,
      optionalFields: seed.optionalFields,
      brandDictionary: seed.brands,
      titleTemplates: seed.titleTemplates,
      exclusions: seed.exclusions,
    },
    rules: unique,
  };
}

export function buildGenericPack(slug: string, title: string, target?: number): RulePack {
  return buildRulePackFromSeed(genericSeedForSlug(slug, title), target);
}
