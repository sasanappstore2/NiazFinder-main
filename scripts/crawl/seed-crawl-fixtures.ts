/**
 * Seed needs + businesses across all canonical cities and categories for crawl QA.
 * Run: npm run crawl:seed
 */
import { PrismaClient } from '@prisma/client';
import { CANONICAL_CITIES, CANONICAL_PROVINCES } from '@/config/locations';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { DEFAULT_BUSINESS_OCCUPATIONS } from '@/config/business-occupations-defaults';
import { resolveCategoryIds } from '@/lib/need-intake/resolve-category';
import { toJson } from '@/lib/business/json-fields';

const prisma = new PrismaClient();
const NEED_PREFIX = 'crawl-need-';
const BIZ_PREFIX = 'crawl-biz-';
const PROVINCE_TITLE_BY_SLUG = new Map(CANONICAL_PROVINCES.map((p) => [p.slug, p.title]));

const LEAF_CATEGORIES = CANONICAL_CATEGORIES.filter((c) => c.depth === 2 && c.parentSlug);
const PICKABLE_OCCUPATIONS = DEFAULT_BUSINESS_OCCUPATIONS.filter((o) => o.depth === 1);

async function ensureCrawlUser() {
  const email = 'crawl-tester@niazyab.local';
  let user = await prisma.user.findFirst({ where: { email } });
  const data = {
    phone: '09990000001',
    firstName: 'Crawl',
    lastName: 'Tester',
    displayName: 'Crawl Tester',
    role: 'CLIENT' as const,
    city: 'تهران',
    province: 'تهران',
    isVerified: true,
  };
  if (!user) {
    user = await prisma.user.create({ data: { email, ...data } });
  } else {
    user = await prisma.user.update({ where: { id: user.id }, data });
  }
  return user;
}

async function seedNeeds(userId: string): Promise<number> {
  await prisma.serviceRequest.deleteMany({ where: { slug: { startsWith: NEED_PREFIX } } });

  let created = 0;
  for (let i = 0; i < CANONICAL_CITIES.length; i++) {
    const city = CANONICAL_CITIES[i];
    const cat = LEAF_CATEGORIES[i % LEAF_CATEGORIES.length];
    const provinceTitle = PROVINCE_TITLE_BY_SLUG.get(city.provinceSlug) ?? city.provinceSlug;
    const slug = `${NEED_PREFIX}${city.slug}-${cat.slug}`;
    try {
      const { categoryId, subcategoryId } = await resolveCategoryIds(cat.parentSlug!, cat.slug);
      await prisma.serviceRequest.create({
        data: {
          title: `[Crawl] نیاز تست — ${city.title} — ${cat.title}`,
          slug,
          description: `آگهی تست خودکار خزش سایت برای شهر ${city.title} و دسته ${cat.title}.`,
          city: city.title,
          province: provinceTitle,
          categoryId,
          subcategoryId,
          userId,
          status: 'OPEN',
          moderationStatus: 'APPROVED',
          reviewedAt: new Date(),
          source: 'crawl-seed',
          tags: '[]',
          attachmentUrls: '[]',
          dynamicAnswers: '{}',
          aiExtractedData: '{}',
        },
      });
      created++;
    } catch (e) {
      console.warn(`  skip need ${slug}:`, e instanceof Error ? e.message : e);
    }
  }

  return created;
}

async function purgeCrawlBusinesses(): Promise<void> {
  const profiles = await prisma.businessProfile.findMany({
    where: { slug: { startsWith: BIZ_PREFIX } },
    select: { id: true, userId: true },
  });
  for (const p of profiles) {
    await prisma.businessOffer.deleteMany({ where: { profileId: p.id } });
    await prisma.businessPortfolioItem.deleteMany({ where: { profileId: p.id } });
    await prisma.businessProfileReview.deleteMany({ where: { profileId: p.id } });
    await prisma.businessProfile.delete({ where: { id: p.id } });
  }
  const userIds = [...new Set(profiles.map((p) => p.userId))];
  if (userIds.length) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds }, email: { endsWith: '@crawl.niazyab.local' } },
    });
  }
}

async function seedBusinesses(): Promise<number> {
  await purgeCrawlBusinesses();

  let created = 0;
  for (let i = 0; i < PICKABLE_OCCUPATIONS.length; i++) {
    const occ = PICKABLE_OCCUPATIONS[i];
    const city = CANONICAL_CITIES[i % CANONICAL_CITIES.length];
    const provinceTitle = PROVINCE_TITLE_BY_SLUG.get(city.provinceSlug) ?? city.provinceSlug;
    const slug = `${BIZ_PREFIX}${occ.slug}-${city.slug}`;
    const email = `${slug}@crawl.niazyab.local`;
    const phone = `0998${String(i).padStart(7, '0')}`;

    try {
      let user = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
      const userData = {
        phone,
        firstName: occ.title.split(' ')[0] ?? 'کسب',
        lastName: 'تست',
        displayName: `${occ.title} — ${city.title}`,
        city: city.title,
        province: provinceTitle,
        isVerified: true,
      };
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            ...userData,
            role: 'SPECIALIST',
          },
        });
      } else {
        user = await prisma.user.update({ where: { id: user.id }, data: userData });
      }

      await prisma.businessProfile.create({
        data: {
          userId: user.id,
          name: `${occ.title} — ${city.title}`,
          slug,
          description: `پروفایل تست خودکار خزش — ${occ.title} در ${city.title}`,
          city: city.title,
          province: provinceTitle,
          categorySlugs: toJson(['services']),
          tags: toJson([occ.slug, city.slug]),
          badges: toJson(['crawl-seed']),
          verified: true,
          yearsActive: 3,
          responseRate: 90,
          rating: 4.6,
          reviewCount: 2,
          extensions: toJson({ occupationSlug: occ.slug, _crawl: true }),
          aiAssistantConfig: toJson({ systemPrompt: '', dynamicQuestions: [] }),
        },
      });
      created++;
    } catch (e) {
      console.warn(`  skip biz ${slug}:`, e instanceof Error ? e.message : e);
    }
  }

  return created;
}

async function main() {
  console.log('=== Crawl fixture seed ===');
  const user = await ensureCrawlUser();
  const needs = await seedNeeds(user.id);
  const businesses = await seedBusinesses();

  const approved = await prisma.serviceRequest.updateMany({
    where: {
      OR: [{ moderationStatus: 'PENDING' }, { status: 'PENDING_REVIEW' }],
    },
    data: {
      moderationStatus: 'APPROVED',
      status: 'OPEN',
      reviewedAt: new Date(),
    },
  });

  console.log(`Needs created: ${needs} (${CANONICAL_CITIES.length} cities)`);
  console.log(`Businesses created: ${businesses} (${PICKABLE_OCCUPATIONS.length} occupations)`);
  console.log(`Also approved ${approved.count} pending request(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
