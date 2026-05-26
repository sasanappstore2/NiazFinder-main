/**
 * Seed moderation queue with diverse demo requests.
 * Run: npm run seed:moderation-queue
 */
import { PrismaClient } from '@prisma/client';
import { resolveCategoryIds } from '../src/lib/need-intake/resolve-category';

const prisma = new PrismaClient();
const SLUG_PREFIX = 'mod-demo-';

type SeedItem = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  subcategorySlug?: string;
  city: string;
  province: string;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED_SOFT' | 'REJECTED_FINAL';
  status: 'PENDING_REVIEW' | 'OPEN' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
};

const SEED_ITEMS: SeedItem[] = [
  {
    slug: `${SLUG_PREFIX}apartment-tehran`,
    title: 'آپارتمان ۹۰ متری در سعادت‌آباد — خریدار جدی',
    description:
      'به دنبال آپارتمان ۹۰ تا ۱۱۰ متری در محدوده سعادت‌آباد هستم. ترجیحاً بالای ۵ سال ساخت، پارکینگ و انباری الزامی. بودجه تا ۱۵ میلیارد.',
    categorySlug: 'real-estate',
    subcategorySlug: 'apartment-sale',
    city: 'تهران',
    province: 'تهران',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}villa-mashhad`,
    title: 'ویلا ۳۰۰ متری در مشهد — محدوده آبادگران',
    description:
      'نیاز به ویلا دوبلکس با حیاط بزرگ در مشهد، محدوده آبادگران یا طرق. حداقل ۳ خواب، نوساز یا بازسازی‌شده.',
    categorySlug: 'real-estate',
    subcategorySlug: 'villa-sale',
    city: 'مشهد',
    province: 'خراسان رضوی',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}car-isfahan`,
    title: 'خرید پژو ۲۰۷ اتوماتیک — اصفهان',
    description:
      'به دنبال پژو ۲۰۷ اتوماتیک مدل ۱۴۰۰ به بالا، بدون رنگ و تصادف. بودجه تا ۸۵۰ میلیون. تحویل در اصفهان.',
    categorySlug: 'vehicles',
    subcategorySlug: 'car-ride',
    city: 'اصفهان',
    province: 'اصفهان',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}mobile-shiraz`,
    title: 'گوشی آیفون ۱۵ پرو — شیراز',
    description:
      'آیفون ۱۵ پرو ۲۵۶ گیگ، ترجیحاً رنگ طبیعی یا آبی. سالم و با جعبه. تحویل در شیراز.',
    categorySlug: 'electronics',
    subcategorySlug: 'mobile-phone',
    city: 'شیراز',
    province: 'فارس',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}cleaning-karaj`,
    title: 'نظافت منزل ۱۲۰ متری — کرج',
    description:
      'نیاز به نظافت کامل منزل ۱۲۰ متری در کرج، گوهردشت. شامل آشپزخانه، سرویس‌ها و پنجره‌ها. ترجیحاً این هفته.',
    categorySlug: 'services',
    subcategorySlug: 'cleaning',
    city: 'کرج',
    province: 'البرز',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}plumbing-rasht`,
    title: 'لوله‌کشی و رفع نشتی — رشت',
    description:
      'نشتی لوله در آشپزخانه و تعویض شیرآلات. ساختمان ۸ واحدی در رشت. نیاز فوری به متخصص.',
    categorySlug: 'services',
    subcategorySlug: 'plumbing',
    city: 'رشت',
    province: 'گیلان',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}laptop-tehran`,
    title: 'لپ‌تاپ گیمینگ — RTX 4060',
    description:
      'خرید لپ‌تاپ گیمینگ با کارت RTX 4060، حداقل ۱۶ گیگ RAM و SSD ۵۱۲. برند ASUS یا Lenovo. تهران.',
    categorySlug: 'electronics',
    subcategorySlug: 'laptop',
    city: 'تهران',
    province: 'تهران',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}office-rent-mashhad`,
    title: 'اجاره دفتر ۸۰ متری — مشهد مرکز',
    description:
      'دفتر کار ۷۰ تا ۹۰ متری در مرکز مشهد، نزدیک میدان شهدا. پارکینگ و آسانسور الزامی. قرارداد یک ساله.',
    categorySlug: 'real-estate',
    subcategorySlug: 'office-rent',
    city: 'مشهد',
    province: 'خراسان رضوی',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}motorcycle-shiraz`,
    title: 'موتور هوندا ۱۵۰ — شیراز',
    description:
      'خرید موتور هوندا ۱۵۰ یا مشابه، مدل ۱۴۰۰ به بالا، کارکرد زیر ۲۰ هزار. سند و بیمه.',
    categorySlug: 'vehicles',
    subcategorySlug: 'motorcycle',
    city: 'شیراز',
    province: 'فارس',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}moving-isfahan`,
    title: 'اسباب‌کشی منزل — اصفهان',
    description:
      'انتقال وسایل از خانه ۱۰۰ متری به آپارتمان ۸۰ متری در اصفهان. شامل بسته‌بندی و حمل.',
    categorySlug: 'services',
    subcategorySlug: 'moving',
    city: 'اصفهان',
    province: 'اصفهان',
    moderationStatus: 'PENDING',
    status: 'PENDING_REVIEW',
  },
  {
    slug: `${SLUG_PREFIX}approved-tehran`,
    title: '[تست] نیاز تأییدشده — طراحی لوگو',
    description:
      'طراحی لوگو برای برند استارتاپی در حوزه فintech. سبک مینیمال، رنگ‌های آبی و سفید. این آگهی برای تست وضعیت APPROVED است.',
    categorySlug: 'services',
    subcategorySlug: 'it-services',
    city: 'تهران',
    province: 'تهران',
    moderationStatus: 'APPROVED',
    status: 'OPEN',
  },
  {
    slug: `${SLUG_PREFIX}rejected-soft-karaj`,
    title: '[تست] نیاز رد موقت — تعمیر موبایل',
    description:
      'تعمیر صفحه آیفون ۱۳. این آگهی برای تست وضعیت REJECTED_SOFT است و باید دلیل رد داشته باشد.',
    categorySlug: 'services',
    subcategorySlug: 'repairs',
    city: 'کرج',
    province: 'البرز',
    moderationStatus: 'REJECTED_SOFT',
    status: 'REJECTED',
    rejectionReason: 'توضیحات ناقص — لطفاً مدل دقیق گوشی و نوع خرابی را بنویسید.',
  },
];

async function main() {
  const deleted = await prisma.serviceRequest.deleteMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
  });
  console.log(`Removed ${deleted.count} previous demo requests.`);

  const users = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    take: 5,
    orderBy: { createdAt: 'asc' },
    select: { id: true, firstName: true },
  });

  if (users.length === 0) {
    console.error('No CLIENT users found. Run prisma seed first.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const item = SEED_ITEMS[i];
    try {
      const { categoryId, subcategoryId } = await resolveCategoryIds(
        item.categorySlug,
        item.subcategorySlug
      );

      await prisma.serviceRequest.create({
        data: {
          title: item.title,
          slug: item.slug,
          description: item.description,
          city: item.city,
          province: item.province,
          categoryId,
          subcategoryId,
          userId: users[i % users.length].id,
          status: item.status,
          moderationStatus: item.moderationStatus,
          rejectionReason: item.rejectionReason ?? null,
          source: 'seed-moderation-queue',
          tags: '[]',
          attachmentUrls: '[]',
          dynamicAnswers: '{}',
          aiExtractedData: '{}',
        },
      });
      created++;
      console.log(`  ✓ ${item.slug} (${item.city} / ${item.categorySlug})`);
    } catch (e) {
      skipped++;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠ skipped ${item.slug}: ${msg}`);
    }
  }

  const pending = await prisma.serviceRequest.count({
    where: { moderationStatus: 'PENDING' },
  });

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
  console.log(`Pending in queue: ${pending}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
