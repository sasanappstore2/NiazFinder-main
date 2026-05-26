/**
 * Seed demo business profiles for template testing.
 * Run: npm run seed:business-profile-demos
 */
import { PrismaClient } from '@prisma/client';
import { toJson } from '../src/lib/business/json-fields';

const prisma = new PrismaClient();
const SLUG_PREFIX = 'biz-demo-';

type DemoSpec = {
  slug: string;
  name: string;
  role: 'SPECIALIST';
  categorySlugs: string[];
  description: string;
  city: string;
  province: string;
  tags: string[];
  badges: string[];
  template: string;
  defaultTab?: string;
  extensions?: Record<string, unknown>;
  offers?: Array<{
    title: string;
    description: string;
    priceRange?: string;
    duration?: string;
    features?: string[];
  }>;
  portfolio?: Array<{ title: string; type?: 'IMAGE' | 'BEFORE_AFTER'; mediaUrl: string; beforeUrl?: string; afterUrl?: string }>;
  reviews?: Array<{ userName: string; rating: number; comment: string }>;
};

const DEMOS: DemoSpec[] = [
  {
    slug: `${SLUG_PREFIX}lawyer-tehran`,
    name: 'دفتر وکالت دادگستری آریا',
    role: 'SPECIALIST',
    categorySlugs: ['legal-services'],
    description:
      'ارائه خدمات حقوقی در زمینه ملکی، خانواده، قراردادها و دعاوی تجاری. بیش از ۱۲ سال سابقه در تهران.',
    city: 'تهران',
    province: 'تهران',
    tags: ['ملکی', 'خانواده', 'قرارداد'],
    badges: ['پروانه وکالت', 'عضو کانون وکلا'],
    template: 'professional',
    defaultTab: 'reviews',
    offers: [
      { title: 'مشاوره حقوقی', description: 'جلسه ۴۵ دقیقه‌ای حضوری یا آنلاین', priceRange: 'از ۸۰۰ هزار تومان', duration: '۴۵ دقیقه' },
      { title: 'تنظیم قرارداد', description: 'قراردادهای تجاری و ملکی', priceRange: 'توافقی' },
    ],
    reviews: [
      { userName: 'مریم ر.', rating: 5, comment: 'بسیار دقیق و حرفه‌ای. پرونده ملکی من را عالی پیگیری کردند.' },
      { userName: 'علی ک.', rating: 4, comment: 'پاسخگویی سریع و مشاوره شفاف.' },
    ],
  },
  {
    slug: `${SLUG_PREFIX}realtor-mashhad`,
    name: 'آژانس املاک پارس مشهد',
    role: 'SPECIALIST',
    categorySlugs: ['agency-services', 'real-estate'],
    description: 'مشاوره خرید، فروش و اجاره ملک در مشهد — تخصص در آپارتمان و ویلایی.',
    city: 'مشهد',
    province: 'خراسان رضوی',
    tags: ['فروش', 'اجاره', 'مشاوره'],
    badges: ['تأیید شده'],
    template: 'real_estate',
    extensions: {
      realEstate: {
        listings: [
          { id: '1', title: 'آپارتمان ۱۱۰ متری آبادگران', price: '۱۲.۵ میلیارد', area: '۱۱۰ م²', rooms: 3, image: 'https://picsum.photos/seed/re1/600/400' },
          { id: '2', title: 'ویلا ۲۵۰ متری طرق', price: '۲۸ میلیارد', area: '۲۵۰ م²', rooms: 4, image: 'https://picsum.photos/seed/re2/600/400' },
        ],
      },
    },
    offers: [
      { title: 'مشاوره خرید ملک', description: 'همراهی تا عقد قرارداد', priceRange: 'رایگان' },
    ],
  },
  {
    slug: `${SLUG_PREFIX}store-shiraz`,
    name: 'فروشگاه دیجی‌پلاس شیراز',
    role: 'SPECIALIST',
    categorySlugs: ['mobile-phone', 'electronics'],
    description: 'فروش گوشی و لوازم جانبی با گارانتی معتبر — ارسال به سراسر کشور.',
    city: 'شیراز',
    province: 'فارس',
    tags: ['گوشی', 'گارانتی', 'اصل'],
    badges: ['فروشگاه تأییدشده'],
    template: 'store',
    defaultTab: 'products',
    offers: [
      { title: 'آیفون ۱۵ پرو ۲۵۶', description: 'رجیستر شده، گارانتی ۱۸ ماه', priceRange: '۸۵ میلیون', features: ['رنگ طبیعی', 'باطری ۱۰۰٪'] },
      { title: 'سامسونگ S24 Ultra', description: 'نسخه گلوبال', priceRange: '۷۲ میلیون', features: ['512GB', 'قلم S Pen'] },
      { title: 'ایرپاد پرو ۲', description: 'اصل با جعبه', priceRange: '۱۲.۵ میلیون' },
      { title: 'شارژر ۶۵ وات', description: 'سریع و اورجینال', priceRange: '۱.۲ میلیون' },
    ],
  },
  {
    slug: `${SLUG_PREFIX}designer-tehran`,
    name: 'استودیو طراحی وب پیکسل',
    role: 'SPECIALIST',
    categorySlugs: ['it-services', 'web-design'],
    description: 'طراحی UI/UX، توسعه Next.js و برندینگ دیجیتال برای استارتاپ‌ها و کسب‌وکارها.',
    city: 'تهران',
    province: 'تهران',
    tags: ['UI/UX', 'Next.js', 'برندینگ'],
    badges: ['Top Rated'],
    template: 'agency',
    defaultTab: 'portfolio',
    offers: [
      { title: 'طراحی سایت فروشگاهی', description: 'Next.js + پنل مدیریت', priceRange: 'از ۴۵ میلیون', duration: '۳–۶ هفته' },
      { title: 'طراحی UI اپ', description: 'Figma + Design System', priceRange: 'از ۱۸ میلیون', duration: '۲–۴ هفته' },
    ],
    portfolio: [
      { title: 'فروشگاه مد', mediaUrl: 'https://picsum.photos/seed/p1/800/600' },
      { title: 'داشبورد SaaS', mediaUrl: 'https://picsum.photos/seed/p2/800/600' },
      { title: 'ری‌برند رستوران', type: 'BEFORE_AFTER', mediaUrl: 'https://picsum.photos/seed/p3a/800/600', beforeUrl: 'https://picsum.photos/seed/p3a/800/600', afterUrl: 'https://picsum.photos/seed/p3b/800/600' },
    ],
    reviews: [
      { userName: 'سارا م.', rating: 5, comment: 'طراحی فوق‌العاده و تحویل به موقع.' },
    ],
  },
  {
    slug: `${SLUG_PREFIX}coach-tehran`,
    name: 'مربی بدنسازی آرش',
    role: 'SPECIALIST',
    categorySlugs: ['sports-fitness'],
    description: 'مربی شخصی بدنسازی و فیتنس — برنامه تمرینی اختصاصی برای خانم‌ها و آقایان.',
    city: 'تهران',
    province: 'تهران',
    tags: ['بدنسازی', 'فیتنس', 'کاهش وزن'],
    badges: ['مربی بین‌المللی'],
    template: 'coach',
    defaultTab: 'gallery',
    extensions: {
      coach: {
        sport: 'بدنسازی',
        ageGroups: ['۱۸–۳۵', '۳۵+'],
        trainingLocation: 'باشگاه و آنلاین',
        certifications: ['ISSA', 'مربی فدراسیون'],
      },
    },
    portfolio: [
      { title: 'تمرین سینه', mediaUrl: 'https://picsum.photos/seed/coach1/600/600' },
      { title: 'کلاس گروهی', mediaUrl: 'https://picsum.photos/seed/coach2/600/600' },
      { title: 'نتیجه ۳ ماهه', mediaUrl: 'https://picsum.photos/seed/coach3/600/600' },
      { title: 'تمرین پا', mediaUrl: 'https://picsum.photos/seed/coach4/600/600' },
    ],
    reviews: [
      { userName: 'رضا م.', rating: 5, comment: 'برنامه عالی و پیگیری دقیق.' },
    ],
  },
  {
    slug: `${SLUG_PREFIX}cleaning-karaj`,
    name: 'خدمات نظافت درخشان',
    role: 'SPECIALIST',
    categorySlugs: ['cleaning', 'services'],
    description: 'نظافت منزل، محل کار و پس از بازسازی در کرج و تهران غرب.',
    city: 'کرج',
    province: 'البرز',
    tags: ['نظافت', 'منزل', 'محل کار'],
    badges: ['بیمه مسئولیت'],
    template: 'services',
    offers: [
      { title: 'نظافت منزل', description: 'تا ۱۵۰ متر', priceRange: 'از ۹۰۰ هزار', duration: '۳–۴ ساعت' },
      { title: 'نظافت محل کار', description: 'دفتر و مغازه', priceRange: 'توافقی' },
    ],
    reviews: [
      { userName: 'نگین ح.', rating: 5, comment: 'بسیار تمیز و خوش‌برخورد.' },
    ],
  },
];

async function upsertDemo(spec: DemoSpec) {
  const email = `${spec.slug.replace(SLUG_PREFIX, '')}@demo.niazyab.local`;
  const phone = `0999${String(spec.slug.length).padStart(2, '0')}${spec.slug.slice(-6).replace(/\D/g, '1').padStart(6, '1').slice(0, 6)}`;

  let user = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }, { businessProfile: { slug: spec.slug } }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        phone,
        firstName: spec.name.split(' ')[0] ?? 'کسب',
        lastName: spec.name.split(' ').slice(1).join(' ') || 'وکار',
        displayName: spec.name,
        role: 'SPECIALIST',
        city: spec.city,
        province: spec.province,
        bio: spec.description,
        isVerified: true,
      },
    });
  }

  const extensions = {
    ...(spec.extensions ?? {}),
    _layout: {
      template: spec.template,
      ...(spec.defaultTab ? { defaultTab: spec.defaultTab } : {}),
    },
  };

  let profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });

  if (profile) {
    await prisma.businessOffer.deleteMany({ where: { profileId: profile.id } });
    await prisma.businessPortfolioItem.deleteMany({ where: { profileId: profile.id } });
    await prisma.businessProfileReview.deleteMany({ where: { profileId: profile.id } });
    profile = await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        city: spec.city,
        province: spec.province,
        categorySlugs: toJson(spec.categorySlugs),
        tags: toJson(spec.tags),
        badges: toJson(spec.badges),
        verified: true,
        yearsActive: 5,
        responseRate: 92,
        rating: spec.reviews?.length
          ? spec.reviews.reduce((s, r) => s + r.rating, 0) / spec.reviews.length
          : 4.5,
        reviewCount: spec.reviews?.length ?? 0,
        extensions: toJson(extensions),
      },
    });
  } else {
    profile = await prisma.businessProfile.create({
      data: {
        userId: user.id,
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        city: spec.city,
        province: spec.province,
        categorySlugs: toJson(spec.categorySlugs),
        tags: toJson(spec.tags),
        badges: toJson(spec.badges),
        verified: true,
        yearsActive: 5,
        responseRate: 92,
        rating: spec.reviews?.length
          ? spec.reviews.reduce((s, r) => s + r.rating, 0) / spec.reviews.length
          : 4.5,
        reviewCount: spec.reviews?.length ?? 0,
        extensions: toJson(extensions),
        aiAssistantConfig: toJson({ systemPrompt: '', dynamicQuestions: [] }),
      },
    });
  }

  if (spec.offers?.length) {
    await prisma.businessOffer.createMany({
      data: spec.offers.map((o, i) => ({
        profileId: profile!.id,
        title: o.title,
        description: o.description,
        priceRange: o.priceRange,
        duration: o.duration,
        features: toJson(o.features ?? []),
        images: toJson([`https://picsum.photos/seed/${spec.slug}-${i}/600/400`]),
        faq: toJson([]),
        order: i,
        ctaType: 'CHAT',
      })),
    });
  }

  if (spec.portfolio?.length) {
    await prisma.businessPortfolioItem.createMany({
      data: spec.portfolio.map((p, i) => ({
        profileId: profile!.id,
        type: p.type ?? 'IMAGE',
        title: p.title,
        mediaUrl: p.mediaUrl,
        metadata: toJson(
          p.beforeUrl ? { beforeUrl: p.beforeUrl, afterUrl: p.afterUrl } : {}
        ),
        order: i,
      })),
    });
  }

  if (spec.reviews?.length) {
    await prisma.businessProfileReview.createMany({
      data: spec.reviews.map((r) => ({
        profileId: profile!.id,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
      })),
    });
  }

  console.log(`  ✓ /b/${spec.slug} (${spec.template})`);
}

async function main() {
  console.log('Seeding business profile demos...\n');
  for (const spec of DEMOS) {
    await upsertDemo(spec);
  }
  console.log(`\nDone. Open profiles at /b/${SLUG_PREFIX}lawyer-tehran etc.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
