/**
 * Seed 100 complete business profiles + 200 realistic customer needs.
 * Data is production-like Persian copy ? not smoke/test fixtures.
 *
 * Run: npm run seed:realistic-marketplace
 * Purge previous run: npm run seed:realistic-marketplace -- --purge
 * Re-seed needs only: npm run seed:realistic-marketplace -- --needs-only --purge
 */
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_BUSINESS_OCCUPATIONS } from '@/config/business-occupations-defaults';
import { NEED_SLUG_TO_OCCUPATIONS } from '@/config/need-to-occupation-map';
import { CANONICAL_CITIES, CANONICAL_PROVINCES } from '@/config/locations';
import { normalizeCategoryPair } from '@/config/categories';
import { toJson } from '@/lib/business/json-fields';
import {
  budgetForCategory,
  buildMarketplaceNeedDescription,
  buildMarketplaceNeedTitle,
  clientIdentity,
  deliveryForCategory,
} from './lib/realistic-need-composer';
import {
  BADGES_DEFAULT,
  BADGES_VERIFIED,
  BRAND_NAMES,
  buildAddress,
  buildBusinessDescription,
  buildBusinessName,
  buildOfferDescription,
  buildOfferTitles,
  OFFER_DURATIONS,
  OFFER_FEATURES,
  OFFER_PRICE_RANGES,
  portfolioTitle,
  RESPONSE_TIMES,
  REVIEW_COMMENTS,
  REVIEWER_NAMES,
  STREET_NAMES,
} from './lib/realistic-business-copy';
import {
  persianCityNameToSlug,
  resolveApproximateCityPin,
} from '@/lib/need/approximate-neighborhood-pin';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';

const prisma = new PrismaClient();

const BIZ_SLUG_PREFIX = 'real-biz-';
const NEED_SLUG_PREFIX = 'real-need-';
const SOURCE = 'seed-realistic-marketplace';
const JSONL_PATH = path.join(process.cwd(), 'reports/smart-marketplace-clean.jsonl');

const TARGET_BUSINESSES = Number(process.env.SEED_BUSINESS_COUNT ?? 100);
const TARGET_NEEDS = Number(process.env.SEED_NEED_COUNT ?? 200);
const PURGE = process.argv.includes('--purge');
const NEEDS_ONLY = process.argv.includes('--needs-only');
const BUSINESSES_ONLY = process.argv.includes('--businesses-only');
const BACKFILL_COORDS = process.argv.includes('--backfill-coords');

const PICKABLE_OCCUPATIONS = DEFAULT_BUSINESS_OCCUPATIONS.filter((o) => o.depth === 1);
const PROVINCE_TITLE_BY_SLUG = new Map(CANONICAL_PROVINCES.map((p) => [p.slug, p.title]));

const CITY_COORDS: Record<string, [number, number]> = {
  tehran: [35.6892, 51.389],
  karaj: [35.84, 50.9391],
  isfahan: [32.6546, 51.668],
  shiraz: [29.5918, 52.5837],
  tabriz: [38.08, 46.2919],
  urmia: [37.5553, 45.0725],
  mashhad: [36.2972, 59.6067],
  ahvaz: [31.3183, 48.6706],
  qom: [34.6416, 50.8746],
  rasht: [37.2808, 49.5832],
  sari: [36.5659, 53.0586],
  kerman: [30.2839, 57.0834],
  kermanshah: [34.3142, 47.065],
  zahedan: [29.4963, 60.8629],
  'bandar-abbas': [27.1832, 56.2666],
  sanandaj: [35.3144, 46.9923],
  qazvin: [36.2688, 50.0041],
  zanjan: [36.6736, 48.4787],
  gorgan: [36.8416, 54.4436],
  ardabil: [38.2498, 48.2933],
  hamadan: [34.7992, 48.5146],
  yazd: [31.8974, 54.3569],
  arak: [34.0917, 49.6892],
  bushehr: [28.9234, 50.8203],
  bojnourd: [37.4747, 57.329],
};

const DEMO_IMAGES = [
  '/images/placeholders/demo-1.webp',
  '/images/placeholders/demo-2.webp',
  '/images/placeholders/demo-3.webp',
  '/images/placeholders/demo-4.webp',
];

type ExtractedNeed = {
  userText: string;
  province: string;
  city: string;
  neighborhood?: string;
  cityId?: string;
  categorySlug: string;
  subcategorySlug?: string;
  categoryNameFa: string;
  categoryPathFa?: string;
};

function buildOccupationCategoryMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [needSlug, occupations] of Object.entries(NEED_SLUG_TO_OCCUPATIONS)) {
    for (const occ of occupations) {
      const list = map.get(occ) ?? [];
      if (!list.includes(needSlug)) list.push(needSlug);
      map.set(occ, list);
    }
  }
  return map;
}

const OCCUPATION_CATEGORIES = buildOccupationCategoryMap();

function jitterCoord(base: [number, number], spread = 0.08): [number, number] {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * spread;
  return [base[0] + Math.cos(angle) * dist, base[1] + Math.sin(angle) * dist];
}

function hashNeedCoords(seed: string): { lat: number; lng: number } {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  h >>>= 0;
  return {
    lat: 27 + (h % 10_000) / 10_000 * 11,
    lng: 44 + ((h >> 13) % 10_000) / 10_000 * 20,
  };
}

function resolveNeedCoords(item: ExtractedNeed, index: number): { lat: number; lng: number } {
  const seed = `real-need-${index}-${item.city}-${item.province}`;

  const citySlug =
    (item.cityId ? locationCityIdToSlug(item.cityId) : null) ??
    persianCityNameToSlug(item.city);

  if (citySlug) {
    const approx = resolveApproximateCityPin({ citySlug, seed });
    if (approx) return approx;
    const base = CITY_COORDS[citySlug];
    if (base) {
      const [lat, lng] = jitterCoord(base);
      return { lat, lng };
    }
  }

  return hashNeedCoords(seed);
}

async function resolveCategoryIdsLocal(
  categorySlug: string,
  subcategorySlug?: string | null
): Promise<{ categoryId: string; subcategoryId: string | null }> {
  const normalized = normalizeCategoryPair(categorySlug, subcategorySlug);
  let categoryId: string | null = null;
  let subcategoryId: string | null = null;

  if (normalized.subcategorySlug) {
    const sub = await prisma.category.findFirst({
      where: { slug: normalized.subcategorySlug, isActive: true },
      select: { id: true },
    });
    subcategoryId = sub?.id ?? null;
  }

  const cat = await prisma.category.findFirst({
    where: { slug: normalized.categorySlug, isActive: true },
    select: { id: true },
  });
  categoryId = cat?.id ?? null;

  if (!categoryId && subcategoryId) {
    categoryId = subcategoryId;
    subcategoryId = null;
  }

  if (!categoryId) {
    const leaf = await prisma.category.findFirst({
      where: { slug: categorySlug, isActive: true },
      select: { id: true },
    });
    categoryId = leaf?.id ?? null;
  }

  if (!categoryId) throw new Error(`category not found: ${categorySlug}`);
  return { categoryId, subcategoryId };
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysAgo(maxDays: number): Date {
  return new Date(Date.now() - Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000));
}

function businessPhone(index: number): string {
  return `0912${String(index + 1).padStart(7, '0')}`;
}

function customerPhone(index: number): string {
  return `0913${String(index + 1).padStart(7, '0')}`;
}

function parseMarketplaceLine(line: string): ExtractedNeed | null {
  try {
    const row = JSON.parse(line) as { messages?: Array<{ role: string; content: string }> };
    const userMsg = row.messages?.find((m) => m.role === 'user')?.content?.trim();
    const assistantMsg = row.messages?.find((m) => m.role === 'assistant')?.content;
    if (!userMsg || userMsg.length < 8 || !assistantMsg) return null;

    const extract = JSON.parse(assistantMsg) as {
      status?: string;
      location?: {
        province?: string | null;
        city?: string | null;
        neighborhood?: string | null;
        cityId?: string | null;
      };
      categories?: Array<{ slug?: string; nameFa?: string; pathFa?: string }>;
      categorySlugs?: string[];
    };

    if (extract.status !== 'resolved') return null;
    const leafSlug = extract.categorySlugs?.[0] ?? extract.categories?.[0]?.slug;
    const city = extract.location?.city?.trim();
    const province = extract.location?.province?.trim();
    if (!leafSlug || !city || !province) return null;

    const normalized = normalizeCategoryPair(leafSlug);
    return {
      userText: userMsg,
      province,
      city,
      neighborhood: extract.location?.neighborhood?.trim() || undefined,
      cityId: extract.location?.cityId?.trim() || undefined,
      categorySlug: normalized.categorySlug,
      subcategorySlug: normalized.subcategorySlug,
      categoryNameFa: extract.categories?.[0]?.nameFa ?? leafSlug,
      categoryPathFa: extract.categories?.[0]?.pathFa,
    };
  } catch {
    return null;
  }
}

async function loadNeedCandidates(poolSize = 4000): Promise<ExtractedNeed[]> {
  const pool: ExtractedNeed[] = [];
  const seen = new Set<string>();
  const rl = createInterface({
    input: createReadStream(JSONL_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (pool.length >= poolSize) break;
    const parsed = parseMarketplaceLine(line);
    if (!parsed) continue;
    const key = `${parsed.categorySlug}|${parsed.subcategorySlug ?? ''}|${parsed.city}|${parsed.neighborhood ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(parsed);
  }
  return pool;
}

function selectDiverseNeeds(candidates: ExtractedNeed[], count: number): ExtractedNeed[] {
  const byCategory = new Map<string, ExtractedNeed[]>();
  for (const c of candidates) {
    const key = c.subcategorySlug ?? c.categorySlug;
    const list = byCategory.get(key) ?? [];
    list.push(c);
    byCategory.set(key, list);
  }

  const selected: ExtractedNeed[] = [];
  const categories = [...byCategory.keys()].sort(() => Math.random() - 0.5);

  while (selected.length < count && categories.length > 0) {
    for (const cat of [...categories]) {
      if (selected.length >= count) break;
      const list = byCategory.get(cat);
      if (!list?.length) {
        categories.splice(categories.indexOf(cat), 1);
        continue;
      }
      selected.push(list.shift()!);
      if (!list.length) categories.splice(categories.indexOf(cat), 1);
    }
  }

  if (selected.length < count) {
    for (const c of candidates) {
      if (selected.length >= count) break;
      if (!selected.includes(c)) selected.push(c);
    }
  }
  return selected.slice(0, count);
}

function occupationCategorySlugs(occupationSlug: string, parentSlug: string | null): string[] {
  const mapped = OCCUPATION_CATEGORIES.get(occupationSlug);
  if (mapped?.length) return mapped.slice(0, 3);
  if (parentSlug) return [parentSlug];
  return ['services'];
}

async function purgeNeeds(): Promise<void> {
  await prisma.serviceRequest.deleteMany({ where: { slug: { startsWith: NEED_SLUG_PREFIX } } });
  await prisma.user.deleteMany({
    where: { AND: [{ email: { startsWith: 'customer-' } }, { email: { endsWith: '@niazyab.ir' } }] },
  });
}

async function purgeBusinesses(): Promise<void> {
  const profiles = await prisma.businessProfile.findMany({
    where: { slug: { startsWith: BIZ_SLUG_PREFIX } },
    select: { id: true, userId: true },
  });
  if (!profiles.length) return;

  const profileIds = profiles.map((p) => p.id);
  await prisma.businessOffer.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.businessPortfolioItem.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.businessProfileReview.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.businessLocation.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.businessProfile.deleteMany({ where: { id: { in: profileIds } } });
  const userIds = [...new Set(profiles.map((p) => p.userId))];
  await prisma.user.deleteMany({
    where: { id: { in: userIds }, email: { startsWith: 'biz-' } },
  });
  console.log(`  removed ${profiles.length} business profile(s)`);
}

async function purgePreviousSeed(): Promise<void> {
  console.log('Purging previous realistic marketplace seed...');
  if (!BUSINESSES_ONLY) await purgeNeeds();
  await purgeBusinesses();
}

async function seedBusinesses(): Promise<string[]> {
  console.log(`\nSeeding ${TARGET_BUSINESSES} business profiles...`);
  const profileIds: string[] = [];
  const occupations = PICKABLE_OCCUPATIONS.slice(0, TARGET_BUSINESSES);

  for (let i = 0; i < occupations.length; i++) {
    const occ = occupations[i]!;
    const city = CANONICAL_CITIES[i % CANONICAL_CITIES.length]!;
    const provinceTitle = PROVINCE_TITLE_BY_SLUG.get(city.provinceSlug) ?? city.provinceSlug;
    const brand = BRAND_NAMES[i % BRAND_NAMES.length]!;
    const slug = `${BIZ_SLUG_PREFIX}${occ.slug}-${city.slug}`;
    const name = buildBusinessName(occ.title, city.title, brand);
    const years = 3 + (i % 15);
    const rating = 3.8 + (i % 12) * 0.1;
    const reviewCount = 2 + (i % 9);
    const [lat, lng] = jitterCoord(CITY_COORDS[city.slug] ?? [32, 53]);
    const email = `biz-${occ.slug}-${city.slug}@niazyab.ir`;
    const phone = businessPhone(i);
    const address = buildAddress(city.title, pick(STREET_NAMES), 10 + (i % 90));

    let user = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    const userData = {
      firstName: brand,
      lastName: occ.title.split(' ')[0] ?? 'متخصص',
      displayName: name,
      city: city.title,
      province: provinceTitle,
      bio: buildBusinessDescription(occ.title, city.title, provinceTitle, years),
      isVerified: i % 3 !== 0,
      phoneVerified: true,
    };
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          phone,
          ...userData,
          role: 'SPECIALIST',
        },
      });
    } else {
      user = await prisma.user.update({ where: { id: user.id }, data: userData });
    }

    const categorySlugs = occupationCategorySlugs(occ.slug, occ.parentSlug);
    const extensions = {
      occupationSlug: occ.slug,
      _layout: { template: i % 5 === 0 ? 'store' : i % 3 === 0 ? 'services' : 'professional' },
      _seed: { realistic: true, source: SOURCE },
    };

    let profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
    const profileData = {
      name,
      slug,
      description: buildBusinessDescription(occ.title, city.title, provinceTitle, years),
      city: city.title,
      province: provinceTitle,
      lat,
      lng,
      address,
      phone,
      categorySlugs: toJson(categorySlugs),
      tags: toJson([occ.slug, city.slug, ...categorySlugs.slice(0, 2)]),
      badges: toJson(i % 4 === 0 ? BADGES_VERIFIED : BADGES_DEFAULT),
      status: 'ACTIVE' as const,
      onboardingCompletedAt: daysAgo(30 + (i % 180)),
      verified: i % 3 !== 0,
      yearsActive: years,
      responseRate: 78 + (i % 20),
      responseTime: pick(RESPONSE_TIMES),
      rating,
      reviewCount,
      viewCount: 40 + i * 7,
      extensions: toJson(extensions),
    };

    if (profile) {
      await prisma.businessOffer.deleteMany({ where: { profileId: profile.id } });
      await prisma.businessPortfolioItem.deleteMany({ where: { profileId: profile.id } });
      await prisma.businessProfileReview.deleteMany({ where: { profileId: profile.id } });
      await prisma.businessLocation.deleteMany({ where: { profileId: profile.id } });
      profile = await prisma.businessProfile.update({ where: { id: profile.id }, data: profileData });
    } else {
      profile = await prisma.businessProfile.create({
        data: {
          userId: user.id,
          ...profileData,
          aiAssistantConfig: toJson({ systemPrompt: '', dynamicQuestions: [] }),
        },
      });
    }

    await prisma.businessLocation.create({
      data: {
        profileId: profile.id,
        label: 'دفتر اصلی',
        city: city.title,
        province: provinceTitle,
        address,
        lat,
        lng,
        isPrimary: true,
        isPublished: true,
        sortOrder: 0,
      },
    });

    await prisma.businessOffer.createMany({
      data: buildOfferTitles(occ.title)
        .slice(0, 2 + (i % 2))
        .map((title, order) => ({
          profileId: profile!.id,
          title,
          description: buildOfferDescription(title, city.title),
          priceRange: pick(OFFER_PRICE_RANGES),
          duration: pick(OFFER_DURATIONS),
          features: toJson([...OFFER_FEATURES]),
          images: toJson([DEMO_IMAGES[order % DEMO_IMAGES.length]!]),
          faq: toJson([]),
          order,
          ctaType: 'CHAT',
        })),
    });

    await prisma.businessProfileReview.createMany({
      data: Array.from({ length: Math.min(3, reviewCount) }, (_, r) => ({
        profileId: profile!.id,
        userName: pick(REVIEWER_NAMES),
        rating: Math.min(5, Math.max(4, Math.round(rating) - (r % 2))),
        comment: pick(REVIEW_COMMENTS),
        createdAt: daysAgo(5 + r * 12),
      })),
    });

    if (i % 2 === 0) {
      await prisma.businessPortfolioItem.createMany({
        data: [
          {
            profileId: profile.id,
            type: 'IMAGE',
            title: portfolioTitle(city.title),
            mediaUrl: DEMO_IMAGES[i % DEMO_IMAGES.length]!,
            metadata: toJson({}),
            order: 0,
          },
          {
            profileId: profile.id,
            type: 'IMAGE',
            title: 'نمونه پروژه',
            mediaUrl: DEMO_IMAGES[(i + 1) % DEMO_IMAGES.length]!,
            metadata: toJson({}),
            order: 1,
          },
        ],
      });
    }

    profileIds.push(profile.id);
    if ((i + 1) % 20 === 0 || i === occupations.length - 1) {
      console.log(`  ? ${i + 1}/${occupations.length} businesses`);
    }
  }
  return profileIds;
}

async function seedNeeds(): Promise<number> {
  console.log('\nLoading need candidates from dataset...');
  const candidates = await loadNeedCandidates(5000);
  console.log(`  ${candidates.length} diverse candidates loaded`);

  const items = selectDiverseNeeds(candidates, TARGET_NEEDS);
  console.log(`Seeding ${items.length} realistic needs...`);

  let created = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const slug = `${NEED_SLUG_PREFIX}${i + 1}-${item.categorySlug}${item.subcategorySlug ? `-${item.subcategorySlug}` : ''}-${item.city.replace(/\s+/g, '-')}`;
    const email = `customer-${i + 1}@niazyab.ir`;
    const phone = customerPhone(i);
    const identity = clientIdentity(i);

    try {
      const { categoryId, subcategoryId } = await resolveCategoryIdsLocal(
        item.categorySlug,
        item.subcategorySlug
      );

      let user = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            phone,
            firstName: identity.firstName,
            lastName: identity.lastName,
            displayName: identity.displayName,
            role: 'CLIENT',
            city: item.city,
            province: item.province,
            isVerified: i % 4 === 0,
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: identity.firstName,
            lastName: identity.lastName,
            displayName: identity.displayName,
            city: item.city,
            province: item.province,
          },
        });
      }

      const copyInput = { ...item };
      const title = buildMarketplaceNeedTitle(copyInput);
      const description = buildMarketplaceNeedDescription(copyInput);
      const budget = budgetForCategory(item.categorySlug, item.subcategorySlug, i);
      const deliveryTime = deliveryForCategory(item.categorySlug, item.subcategorySlug, i);
      const { lat, lng } = resolveNeedCoords(item, i);

      await prisma.serviceRequest.create({
        data: {
          title,
          slug: slug.slice(0, 120),
          description,
          budgetMin: budget.min,
          budgetMax: budget.max,
          budgetType: budget.type,
          deliveryTime,
          deliveryUnit: 'day',
          city: item.city,
          province: item.province,
          lat,
          lng,
          address: item.neighborhood
            ? `${item.province}? ${item.city}? ${item.neighborhood}`
            : undefined,
          categoryId,
          subcategoryId,
          priority: i % 11 === 0 ? 'URGENT' : i % 5 === 0 ? 'HIGH' : 'NORMAL',
          status: 'OPEN',
          moderationStatus: 'APPROVED',
          reviewedAt: daysAgo(1 + (i % 20)),
          source: SOURCE,
          tags: toJson([item.subcategorySlug ?? item.categorySlug, item.city]),
          attachmentUrls: '[]',
          dynamicAnswers: toJson({
            neighborhood: item.neighborhood,
            cityId: item.cityId,
            sourceText: item.userText,
          }),
          aiExtractedData: toJson({
            listingEnriched: true,
            engine: 'seed-realistic',
            categoryPathFa: item.categoryPathFa,
            autoApprove: true,
          }),
          userId: user.id,
          viewCount: 8 + (i % 120),
          proposalCount: i % 7,
          isFeatured: i % 17 === 0,
          createdAt: daysAgo(2 + (i % 55)),
        },
      });
      created++;
      if ((i + 1) % 40 === 0 || i === items.length - 1) {
        console.log(`  ? ${created} needs (${i + 1}/${items.length} processed)`);
      }
    } catch (e) {
      console.warn(`  ? skipped need ${i + 1}:`, e instanceof Error ? e.message : e);
    }
  }
  return created;
}

async function backfillNeedCoordinates(): Promise<void> {
  const rows = await prisma.serviceRequest.findMany({
    where: {
      source: SOURCE,
      OR: [{ lat: null }, { lng: null }],
    },
    select: {
      id: true,
      city: true,
      province: true,
      dynamicAnswers: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let cityId: string | undefined;
    try {
      const dyn = JSON.parse(row.dynamicAnswers || '{}') as { cityId?: string };
      cityId = dyn.cityId;
    } catch {
      cityId = undefined;
    }

    const coords = resolveNeedCoords(
      {
        userText: '',
        province: row.province ?? '',
        city: row.city ?? '',
        cityId,
        categorySlug: 'misc',
        categoryNameFa: '',
      },
      i
    );

    await prisma.serviceRequest.update({
      where: { id: row.id },
      data: { lat: coords.lat, lng: coords.lng },
    });
    updated++;
  }

  console.log(`Backfilled coordinates for ${updated} needs`);
}

async function syncTypesense(): Promise<void> {
  if (process.env.TYPESENSE_ENABLED !== 'true') return;
  console.log('\nSyncing businesses to Typesense...');
  const { execSync } = await import('child_process');
  try {
    execSync('npm run sync:typesense', { stdio: 'inherit', cwd: process.cwd() });
  } catch (err) {
    console.warn('Typesense sync skipped or failed:', err);
  }
}

async function main(): Promise<void> {
  if (BACKFILL_COORDS) {
    console.log('=== Backfill need map coordinates ===');
    await backfillNeedCoordinates();
    return;
  }

  console.log('=== Realistic marketplace seed ===');
  console.log(`Businesses: ${TARGET_BUSINESSES} | Needs: ${TARGET_NEEDS}`);

  if (PURGE) {
    if (NEEDS_ONLY) {
      console.log('Purging needs only...');
      await purgeNeeds();
    } else if (BUSINESSES_ONLY) {
      console.log('Purging businesses only...');
      await purgeBusinesses();
    } else {
      await purgePreviousSeed();
    }
  }

  if (!NEEDS_ONLY) {
    await seedBusinesses();
  }
  if (!BUSINESSES_ONLY) {
    await seedNeeds();
  }
  if (!NEEDS_ONLY && !BUSINESSES_ONLY) await syncTypesense();

  const [bizCount, needCount, openNeeds] = await Promise.all([
    prisma.businessProfile.count({ where: { slug: { startsWith: BIZ_SLUG_PREFIX }, status: 'ACTIVE' } }),
    prisma.serviceRequest.count({ where: { source: SOURCE } }),
    prisma.serviceRequest.count({ where: { source: SOURCE, status: 'OPEN' } }),
  ]);

  console.log('\n========== Summary ==========');
  console.log(`Active businesses (real-biz-*): ${bizCount}`);
  console.log(`Service requests (${SOURCE}): ${needCount} (${openNeeds} open)`);
  console.log('Browse: /b/iran  |  Needs: /n/iran');
  console.log('=============================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
