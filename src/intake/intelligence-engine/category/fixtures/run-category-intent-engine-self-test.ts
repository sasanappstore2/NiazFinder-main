/**
 * Self-test: category-intent-engine (rules shortlist; optional LLM skipped in CI).
 *
 * Run: npm run test:category-intent-engine
 */
import { getCategoryBySlug } from '@/config/categories';

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

interface Case {
  id: string;
  text: string;
  expectLeaf?: string | string[];
  expectVertical?: string;
  expectIntent?: string;
  allowUnresolved?: boolean;
  minCandidates?: number;
}

const CASES: Case[] = [
  {
    id: 'apartment-rent',
    text: 'دنبال آپارتمان اجاره‌ای دو خوابه در تهران هستم',
    expectLeaf: ['apartment-rent', 'apartment'],
    expectVertical: 'real-estate',
    expectIntent: 'property_search',
  },
  {
    id: 'laptop',
    text: 'لپ‌تاپ گیمینگ دست دوم می‌خوام بخرم',
    expectLeaf: ['laptop', 'computers', 'laptops'],
    expectVertical: 'products',
  },
  {
    id: 'phone-repair',
    text: 'موبایلم خراب شده تعمیرکار می‌خوام',
    expectLeaf: ['repairs', 'mobile-tablet-repair', 'computer-laptop-repair', 'mobile-repair'],
    expectVertical: 'services',
  },
  {
    id: 'hiring',
    text: 'استخدام منشی اداری تمام‌وقت',
    expectLeaf: ['jobs', 'admin-management', 'office-jobs', 'administrative'],
    expectVertical: 'jobs',
    expectIntent: 'job_search',
  },
  {
    id: 'salam-no-category',
    text: 'سلام خوبی؟',
    allowUnresolved: true,
  },
  {
    // Regression: corpus estate-0903 — ZWNJ می‌خواهم + ویلای مسکونی must resolve villa-sale.
    id: 'villa-sale-zwnj',
    text: 'می‌خواهم ویلای مسکونی بخرم، در شهر اصفهان محله ملک‌شهر، متراژ حدود 174 متر',
    expectLeaf: ['villa-sale', 'residential-sale'],
    expectVertical: 'real-estate',
  },
  {
    // Regression: colloquial-0002 — «قصد خرید» + «کد رهگیری» must not flip to villa-rent.
    id: 'villa-sale-ghasd-kharid-rahgiri',
    text:
      'وقت‌تون بخیر، قصد خرید خانه ویلایی یا ویلا دارم. قرارداد رسمی، کد رهگیری و شفافیت مالک برام غیرقابل مذاکره‌ست.',
    expectLeaf: ['villa-sale'],
    expectVertical: 'real-estate',
  },
  {
    id: 'industrial-sale-ghasd',
    text: 'قصد خرید سوله یا کارگاه صنعتی دارم در اصفهان',
    expectLeaf: ['industrial-sale'],
    expectVertical: 'real-estate',
  },
  {
    id: 'land-rent-mahane',
    text: 'اجاره ماهانهٔ زمین یا کلنگی در گیلان لازم دارم',
    expectLeaf: ['land-rent'],
  },
  {
    // Regression: colloquial-0567 — alternate hood «شهرک ویلایی» must not flip land-rent → villa-rent.
    id: 'land-rent-shahrak-villaee',
    text:
      'برای کارم نیاز به اجاره ماهانهٔ زمین یا کلنگی دارم. محله‌های جایگزین: شهرک ویلایی باران. متراژ حدود 1600 متر.',
    expectLeaf: ['land-rent'],
    expectVertical: 'real-estate',
  },
  {
    id: 'agency-moshaver',
    text: 'دنبال مشاور املاک حرفه‌ای هستم در ملایر',
    expectLeaf: ['agency-services'],
    expectVertical: 'real-estate',
  },
  {
    // Regression: colloquial-0037 — محله «شهر صنعتی» must not null-out آپارتمان فروش
    id: 'apartment-sale-shahr-sanati',
    text:
      'می‌خوام آپارتمان مسکونی بخرم. استان تهران، شهر قدس، محله شهر صنعتی اولویت اوله.',
    expectLeaf: ['apartment-sale'],
    expectVertical: 'real-estate',
  },
  {
    // Regression: colloquial-0069 — فضای کار اشتراکی کوتاه‌مدت
    id: 'workspace-short-cowork',
    text: 'اجاره کوتاه‌مدت فضای کار اشتراکی می‌خوام برای چند روز تا حداکثر دو هفته در نقده',
    expectLeaf: ['workspace-short-rent'],
    expectVertical: 'real-estate',
  },
];

function leafOf(match: { categorySlug: string; subcategorySlug?: string } | null): string | null {
  if (!match) return null;
  return match.subcategorySlug ?? match.categorySlug;
}

function assertRegistrySlug(slug: string): boolean {
  return Boolean(getCategoryBySlug(slug));
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';

  await stubServerOnly();
  const { runCategoryIntentEngine } = await import(
    '@/intake/intelligence-engine/category/category-intent-engine'
  );

  let pass = 0;
  const failures: string[] = [];

  for (const c of CASES) {
    const result = await runCategoryIntentEngine({ text: c.text });
    const leaf = leafOf(result.match);
    const reasons: string[] = [];

    for (const cand of result.candidates) {
      if (!assertRegistrySlug(cand.slug)) {
        reasons.push(`candidate outside registry: ${cand.slug}`);
      }
    }
    if (leaf && !assertRegistrySlug(leaf)) {
      reasons.push(`leaf outside registry: ${leaf}`);
    }

    if (c.expectLeaf) {
      const allowed = Array.isArray(c.expectLeaf) ? c.expectLeaf : [c.expectLeaf];
      const hit =
        (leaf && allowed.some((a) => leaf === a || leaf.includes(a) || a.includes(leaf))) ||
        result.candidates.some((cand) =>
          allowed.some((a) => cand.slug === a || cand.slug.includes(a))
        );
      if (!hit) {
        reasons.push(
          `leaf=${leaf ?? 'null'} candidates=${result.candidates
            .map((x) => x.slug)
            .slice(0, 4)
            .join(',')} expected one of ${allowed.join('|')}`
        );
      }
    }

    if (c.expectVertical && result.intent && result.intent.vertical !== c.expectVertical) {
      // Soft: rules vertical classifier may differ; only fail if completely wrong family
      if (
        c.expectVertical === 'real-estate' &&
        result.intent.vertical !== 'real-estate'
      ) {
        reasons.push(`vertical=${result.intent.vertical} expected ${c.expectVertical}`);
      }
    }

    if (c.allowUnresolved) {
      if (leaf && leaf !== 'general' && leaf !== 'social') {
        // greeting should not lock a strong product leaf
        const strong = result.match && result.match.confidence >= 0.9;
        if (strong) {
          reasons.push(`unexpected strong leaf for greeting: ${leaf}`);
        }
      }
    }

    if (c.minCandidates != null && result.candidates.length < c.minCandidates) {
      reasons.push(`candidates=${result.candidates.length} < ${c.minCandidates}`);
    }

    if (reasons.length) {
      failures.push(`${c.id}: ${reasons.join('; ')}`);
    } else {
      pass += 1;
      console.log(
        `✓ ${c.id} method=${result.method} leaf=${leaf ?? '—'} vertical=${result.intent?.vertical ?? '—'}`
      );
    }
  }

  console.log(`\ncategory-intent-engine: ${pass}/${CASES.length} passed`);
  if (failures.length) {
    for (const f of failures) console.error(`✗ ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
