import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
}

async function main() {
  console.log('🚀 شروع ساخت داده‌های اولیه نیاز فایندر...\n');

  // ========== ۱. حذف داده‌های موجود (ترتیب معکوس برای کلیدهای خارجی) ==========
  console.log('🗑️  حذف داده‌های قبلی...');

  await prisma.message.deleteMany();
  console.log('  ✅ پیام‌ها حذف شدند');

  await prisma.review.deleteMany();
  console.log('  ✅ نظرات حذف شدند');

  await prisma.proposal.deleteMany();
  console.log('  ✅ پیشنهادها حذف شدند');

  await prisma.transaction.deleteMany();
  console.log('  ✅ تراکنش‌ها حذف شدند');

  await prisma.userSkill.deleteMany();
  console.log('  ✅ مهارت‌های کاربران حذف شدند');

  await prisma.notification.deleteMany();
  console.log('  ✅ اعلان‌ها حذف شدند');

  await prisma.portfolio.deleteMany();
  console.log('  ✅ نمونه‌کارها حذف شدند');

  await prisma.conversation.deleteMany();
  console.log('  ✅ مکالمات حذف شدند');

  await prisma.serviceRequest.deleteMany();
  console.log('  ✅ درخواست‌های خدمات حذف شدند');

  await prisma.wallet.deleteMany();
  console.log('  ✅ کیف پول‌ها حذف شدند');

  await prisma.authToken.deleteMany();
  console.log('  ✅ توکن‌های احراز هویت حذف شدند');

  await prisma.skill.deleteMany();
  console.log('  ✅ مهارت‌ها حذف شدند');

  await prisma.category.deleteMany();
  console.log('  ✅ دسته‌بندی‌ها حذف شدند');

  await prisma.user.deleteMany();
  console.log('  ✅ کاربران حذف شدند');

  console.log('🗑️  همه داده‌های قبلی با موفقیت حذف شدند\n');

  // ========== ۲. ساخت دسته‌بندی‌ها ==========
  // Legacy demo tree below; canonical marketplace categories come from syncCanonicalCategoriesToDb (SSOT).
  console.log('📁 ساخت دسته‌بندی‌ها...');

  const categories: Record<string, string> = {};

  // دسته‌بندی‌های اصلی
  const parentCategories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'طراحی و توسعه وب',
        slug: 'web-design-development',
        description: 'طراحی و توسعه وب‌سایت‌ها، اپلیکیشن‌های وب و خدمات مرتبط',
        icon: 'Globe',
        order: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'اپلیکیشن موبایل',
        slug: 'mobile-app',
        description: 'طراحی و توسعه اپلیکیشن‌های اندروید و iOS',
        icon: 'Smartphone',
        order: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'تولید محتوا',
        slug: 'content-creation',
        description: 'تولید انواع محتوای متنی، تصویری و ویدیویی',
        icon: 'FileText',
        order: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: 'طراحی گرافیک',
        slug: 'graphic-design',
        description: 'طراحی لوگو، بنر، رابط کاربری و سایر خدمات گرافیکی',
        icon: 'Palette',
        order: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: 'خدمات خانگی',
        slug: 'home-services',
        description: 'خدمات نظافت، تعمیرات و نگهداری منزل',
        icon: 'Home',
        order: 5,
      },
    }),
    prisma.category.create({
      data: {
        name: 'تعمیرات',
        slug: 'repairs',
        description: 'تعمیر انواع دستگاه‌ها و تجهیزات',
        icon: 'Wrench',
        order: 6,
      },
    }),
    prisma.category.create({
      data: {
        name: 'مشاوره و آموزش',
        slug: 'consulting-education',
        description: 'مشاوره تخصصی، آموزش خصوصی و خدمات حقوقی',
        icon: 'GraduationCap',
        order: 7,
      },
    }),
    prisma.category.create({
      data: {
        name: 'هوش مصنوعی',
        slug: 'artificial-intelligence',
        description: 'خدمات هوش مصنوعی، یادگیری ماشین و پردازش داده',
        icon: 'Brain',
        order: 8,
      },
    }),
  ]);

  categories['web'] = parentCategories[0].id;
  categories['mobile'] = parentCategories[1].id;
  categories['content'] = parentCategories[2].id;
  categories['graphic'] = parentCategories[3].id;
  categories['home'] = parentCategories[4].id;
  categories['repair'] = parentCategories[5].id;
  categories['consulting'] = parentCategories[6].id;
  categories['ai'] = parentCategories[7].id;

  console.log(`  ✅ ${parentCategories.length} دسته‌بندی اصلی ساخته شد`);

  // زیردسته‌ها
  const subcategoriesData = [
    // طراحی و توسعه وب
    { name: 'طراحی سایت', slug: 'web-design', parentId: categories['web'], description: 'طراحی وب‌سایت‌های حرفه‌ای و مدرن', icon: 'Layout' },
    { name: 'فرانت‌اند', slug: 'frontend', parentId: categories['web'], description: 'توسعه سمت کاربر و رابط کاربری وب', icon: 'Monitor' },
    { name: 'بک‌اند', slug: 'backend', parentId: categories['web'], description: 'توسعه سمت سرور و API', icon: 'Server' },
    // اپلیکیشن موبایل
    { name: 'اندروید', slug: 'android', parentId: categories['mobile'], description: 'توسعه اپلیکیشن‌های اندروید', icon: 'Smartphone' },
    { name: 'iOS', slug: 'ios', parentId: categories['mobile'], description: 'توسعه اپلیکیشن‌های iOS', icon: 'Apple' },
    { name: 'فلاتر', slug: 'flutter', parentId: categories['mobile'], description: 'توسعه اپلیکیشن‌های چندسکویی با فلاتر', icon: 'Layers' },
    // تولید محتوا
    { name: 'نویسندگی', slug: 'copywriting', parentId: categories['content'], description: 'تولید محتوای متنی و مقاله‌نویسی', icon: 'PenTool' },
    { name: 'سئو', slug: 'seo', parentId: categories['content'], description: 'بهینه‌سازی موتورهای جستجو', icon: 'Search' },
    { name: 'ترجمه', slug: 'translation', parentId: categories['content'], description: 'ترجمه حرفه‌ای متون به زبان‌های مختلف', icon: 'Languages' },
    // طراحی گرافیک
    { name: 'لوگو', slug: 'logo-design', parentId: categories['graphic'], description: 'طراحی لوگو و هویت بصری برند', icon: 'Hexagon' },
    { name: 'UI/UX', slug: 'ui-ux', parentId: categories['graphic'], description: 'طراحی رابط و تجربه کاربری', icon: 'Figma' },
    { name: 'بنر', slug: 'banner-design', parentId: categories['graphic'], description: 'طراحی بنر تبلیغاتی و گرافیکی', icon: 'Image' },
    // خدمات خانگی
    { name: 'نظافت', slug: 'cleaning', parentId: categories['home'], description: 'خدمات نظافت منزل و محل کار', icon: 'Sparkles' },
    { name: 'تاسیسات', slug: 'plumbing', parentId: categories['home'], description: 'خدمات لوله‌کشی و تاسیسات', icon: 'Droplets' },
    { name: 'برقکاری', slug: 'electrician', parentId: categories['home'], description: 'خدمات برقی و سیم‌کشی', icon: 'Zap' },
    // تعمیرات
    { name: 'موبایل', slug: 'mobile-repair', parentId: categories['repair'], description: 'تعمیر انواع گوشی‌های موبایل', icon: 'Smartphone' },
    { name: 'لپ‌تاپ', slug: 'laptop-repair', parentId: categories['repair'], description: 'تعمیر لپ‌تاپ و کامپیوتر', icon: 'Laptop' },
    { name: 'خودرو', slug: 'car-repair', parentId: categories['repair'], description: 'تعمیر و نگهداری خودرو', icon: 'Car' },
    // مشاوره و آموزش
    { name: 'مهاجرت', slug: 'immigration', parentId: categories['consulting'], description: 'مشاوره مهاجرت و اخذ ویزا', icon: 'Plane' },
    { name: 'آموزش خصوصی', slug: 'private-tutoring', parentId: categories['consulting'], description: 'آموزش خصوصی دروس و مهارت‌های مختلف', icon: 'BookOpen' },
    { name: 'وکالت', slug: 'legal', parentId: categories['consulting'], description: 'مشاوره حقوقی و خدمات وکالت', icon: 'Scale' },
    // هوش مصنوعی
    { name: 'چت‌بات', slug: 'chatbot', parentId: categories['ai'], description: 'طراحی و توسعه چت‌بات‌های هوشمند', icon: 'MessageSquare' },
    { name: 'پردازش تصویر', slug: 'image-processing', parentId: categories['ai'], description: 'پردازش تصویر و بینایی ماشین', icon: 'Camera' },
    { name: 'یادگیری ماشین', slug: 'machine-learning', parentId: categories['ai'], description: 'توسعه مدل‌های یادگیری ماشین', icon: 'Cpu' },
  ];

  const subcategories = await Promise.all(
    subcategoriesData.map((sub) => prisma.category.create({ data: sub }))
  );

  // ذخیره شناسه زیردسته‌ها
  categories['web-design'] = subcategories[0].id;
  categories['frontend'] = subcategories[1].id;
  categories['backend'] = subcategories[2].id;
  categories['android'] = subcategories[3].id;
  categories['ios'] = subcategories[4].id;
  categories['flutter'] = subcategories[5].id;
  categories['copywriting'] = subcategories[6].id;
  categories['seo'] = subcategories[7].id;
  categories['translation'] = subcategories[8].id;
  categories['logo-design'] = subcategories[9].id;
  categories['ui-ux'] = subcategories[10].id;
  categories['banner-design'] = subcategories[11].id;
  categories['cleaning'] = subcategories[12].id;
  categories['plumbing'] = subcategories[13].id;
  categories['electrician'] = subcategories[14].id;
  categories['mobile-repair'] = subcategories[15].id;
  categories['laptop-repair'] = subcategories[16].id;
  categories['car-repair'] = subcategories[17].id;
  categories['immigration'] = subcategories[18].id;
  categories['private-tutoring'] = subcategories[19].id;
  categories['legal'] = subcategories[20].id;
  categories['chatbot'] = subcategories[21].id;
  categories['image-processing'] = subcategories[22].id;
  categories['machine-learning'] = subcategories[23].id;

  console.log(`  ✅ ${subcategories.length} زیردسته ساخته شد`);

  const { syncCanonicalCategoriesToDb } = await import('../src/lib/categories/sync-to-db');
  const syncResult = await syncCanonicalCategoriesToDb();
  console.log(
    `  ✅ همگام‌سازی دسته‌های کانونیکال: ${syncResult.upserted} دسته، ${syncResult.deactivated} غیرفعال`
  );

  const canonicalRows = await prisma.category.findMany({
    where: { slug: { in: ['services', 'cleaning', 'plumbing', 'mobile-phone', 'apartment-rent', 'car'] }, status: 'ACTIVE' },
  });
  for (const row of canonicalRows) {
    categories[row.slug] = row.id;
  }

  console.log(`  📊 مجموعاً ${parentCategories.length + subcategories.length} دسته‌بندی (+ کانونیکال)\n`);

  // ========== ۳. ساخت مهارت‌ها ==========
  console.log('🎯 ساخت مهارت‌ها...');

  const skillsData = [
    // طراحی و توسعه وب
    { name: 'HTML و CSS', slug: 'html-css', categoryId: categories['web-design'], description: 'تسلط بر HTML5 و CSS3' },
    { name: 'React', slug: 'react', categoryId: categories['frontend'], description: 'توسعه با React و Next.js' },
    { name: 'Vue.js', slug: 'vuejs', categoryId: categories['frontend'], description: 'توسعه با Vue.js و Nuxt' },
    { name: 'Angular', slug: 'angular', categoryId: categories['frontend'], description: 'توسعه با Angular' },
    { name: 'Node.js', slug: 'nodejs', categoryId: categories['backend'], description: 'توسعه بک‌اند با Node.js' },
    { name: 'Python', slug: 'python', categoryId: categories['backend'], description: 'توسعه بک‌اند با Python و Django' },
    { name: 'WordPress', slug: 'wordpress', categoryId: categories['web-design'], description: 'طراحی سایت با وردپرس' },
    // اپلیکیشن موبایل
    { name: 'Kotlin', slug: 'kotlin', categoryId: categories['android'], description: 'توسعه اندروید با Kotlin' },
    { name: 'Swift', slug: 'swift', categoryId: categories['ios'], description: 'توسعه iOS با Swift' },
    { name: 'Dart و Flutter', slug: 'dart-flutter', categoryId: categories['flutter'], description: 'توسعه چندسکویی با فلاتر' },
    { name: 'React Native', slug: 'react-native', categoryId: categories['flutter'], description: 'توسعه موبایل با React Native' },
    // تولید محتوا
    { name: 'مقاله‌نویسی', slug: 'article-writing', categoryId: categories['copywriting'], description: 'نوشتن مقالات حرفه‌ای و سئو محور' },
    { name: 'تولید محتوای شبکه‌های اجتماعی', slug: 'social-media-content', categoryId: categories['copywriting'], description: 'تولید محتوا برای اینستاگرام و تلگرام' },
    { name: 'سئو تکنیکال', slug: 'technical-seo', categoryId: categories['seo'], description: 'بهینه‌سازی فنی سایت' },
    { name: 'سئو محتوایی', slug: 'content-seo', categoryId: categories['seo'], description: 'بهینه‌سازی محتوا برای موتورهای جستجو' },
    { name: 'ترجمه انگلیسی به فارسی', slug: 'en-fa-translation', categoryId: categories['translation'], description: 'ترجمه حرفه‌ای از انگلیسی به فارسی' },
    { name: 'ترجمه فارسی به انگلیسی', slug: 'fa-en-translation', categoryId: categories['translation'], description: 'ترجمه حرفه‌ای از فارسی به انگلیسی' },
    // طراحی گرافیک
    { name: 'Photoshop', slug: 'photoshop', categoryId: categories['logo-design'], description: 'تسلط بر Adobe Photoshop' },
    { name: 'Illustrator', slug: 'illustrator', categoryId: categories['logo-design'], description: 'تسلط بر Adobe Illustrator' },
    { name: 'Figma', slug: 'figma', categoryId: categories['ui-ux'], description: 'طراحی رابط کاربری با Figma' },
    { name: 'Adobe XD', slug: 'adobe-xd', categoryId: categories['ui-ux'], description: 'طراحی رابط کاربری با Adobe XD' },
    { name: 'طراحی بنر حرفه‌ای', slug: 'professional-banner', categoryId: categories['banner-design'], description: 'طراحی بنرهای تبلیغاتی حرفه‌ای' },
    // خدمات خانگی
    { name: 'نظافت عمومی', slug: 'general-cleaning', categoryId: categories['cleaning'], description: 'نظافت عمومی منزل و محل کار' },
    { name: 'لوله‌کشی ساختمان', slug: 'building-plumbing', categoryId: categories['plumbing'], description: 'لوله‌کشی و نصب تاسیسات ساختمان' },
    { name: 'سیم‌کشی ساختمان', slug: 'building-wiring', categoryId: categories['electrician'], description: 'سیم‌کشی برق ساختمان' },
    // تعمیرات
    { name: 'تعمیر صفحه نمایش', slug: 'screen-repair', categoryId: categories['mobile-repair'], description: 'تعمیر و تعویض صفحه نمایش موبایل' },
    { name: 'تعمیر مادربرد لپ‌تاپ', slug: 'laptop-motherboard', categoryId: categories['laptop-repair'], description: 'تعمیر مادربرد و قطعات لپ‌تاپ' },
    { name: 'تعمیر موتور خودرو', slug: 'car-engine', categoryId: categories['car-repair'], description: 'تعمیر و سرویس موتور خودرو' },
    // مشاوره و آموزش
    { name: 'مشاوره تحصیلی مهاجرت', slug: 'study-immigration', categoryId: categories['immigration'], description: 'مشاوره مهاجرت تحصیلی به کشورهای مختلف' },
    { name: 'مشاوره کاریابی مهاجرت', slug: 'work-immigration', categoryId: categories['immigration'], description: 'مشاوره مهاجرت کاری و اخذ ویزای کار' },
    { name: 'ریاضی', slug: 'math-tutoring', categoryId: categories['private-tutoring'], description: 'آموزش خصوصی ریاضی' },
    { name: 'زبان انگلیسی', slug: 'english-tutoring', categoryId: categories['private-tutoring'], description: 'آموزش خصوصی زبان انگلیسی' },
    { name: 'حقوق خانواده', slug: 'family-law', categoryId: categories['legal'], description: 'مشاوره و وکالت در امور خانواده' },
    // هوش مصنوعی
    { name: 'ChatGPT و LLM', slug: 'chatgpt-llm', categoryId: categories['chatbot'], description: 'توسعه چت‌بات با مدل‌های زبانی بزرگ' },
    { name: 'Computer Vision', slug: 'computer-vision', categoryId: categories['image-processing'], description: 'بینایی ماشین و پردازش تصویر' },
    { name: 'Deep Learning', slug: 'deep-learning', categoryId: categories['machine-learning'], description: 'یادگیری عمیق و شبکه‌های عصبی' },
    { name: 'NLP', slug: 'nlp', categoryId: categories['machine-learning'], description: 'پردازش زبان طبیعی' },
  ];

  const skills = await Promise.all(
    skillsData.map((skill) => prisma.skill.create({ data: skill }))
  );

  console.log(`  ✅ ${skills.length} مهارت ساخته شد\n`);

  // ========== ۴. ساخت کاربران ==========
  console.log('👥 ساخت کاربران...');

  // --- ادمین‌ها ---
  const admins = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@needfinder.ir',
        password: simpleHash('123456'),
        phone: '09120000001',
        firstName: 'مهدی',
        lastName: 'احمدی',
        displayName: 'مهدی احمدی',
        bio: 'مدیر ارشد پلتفرم نیاز فایندر',
        city: 'تهران',
        province: 'تهران',
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'support@needfinder.ir',
        password: simpleHash('123456'),
        phone: '09120000002',
        firstName: 'زهرا',
        lastName: 'محمدی',
        displayName: 'زهرا محمدی',
        bio: 'پشتیبانی و رسیدگی به کاربران',
        city: 'تهران',
        province: 'تهران',
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'finance@needfinder.ir',
        password: simpleHash('123456'),
        phone: '09120000003',
        firstName: 'علی',
        lastName: 'حسینی',
        displayName: 'علی حسینی',
        bio: 'مدیر مالی و تراکنش‌های پلتفرم',
        city: 'تهران',
        province: 'تهران',
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
  ]);

  console.log(`  ✅ ${admins.length} ادمین ساخته شد`);

  // --- کارفرمایان (Client) ---
  const clients = await Promise.all([
    prisma.user.create({
      data: {
        email: 'reza@email.com',
        password: simpleHash('123456'),
        phone: '09121000001',
        firstName: 'رضا',
        lastName: 'کریمی',
        displayName: 'رضا کریمی',
        bio: 'کارآفرین و مدیر شرکت نوآوران',
        city: 'تهران',
        province: 'تهران',
        role: 'CLIENT',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sara@email.com',
        password: simpleHash('123456'),
        phone: '09131000002',
        firstName: 'سارا',
        lastName: 'موسوی',
        displayName: 'سارا موسوی',
        bio: 'مدیرعامل استارتاپ فودتک',
        city: 'اصفهان',
        province: 'اصفهان',
        role: 'CLIENT',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'amir@email.com',
        password: simpleHash('123456'),
        phone: '09141000003',
        firstName: 'امیر',
        lastName: 'نجفی',
        displayName: 'امیر نجفی',
        bio: 'صاحب فروشگاه آنلاین دیجی‌مارکت',
        city: 'شیراز',
        province: 'فارس',
        role: 'CLIENT',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
  ]);

  console.log(`  ✅ ${clients.length} کارفرما ساخته شد`);

  // --- متخصصین (Specialist) ---
  const specialists = await Promise.all([
    prisma.user.create({
      data: {
        email: 'hasan@email.com',
        password: simpleHash('123456'),
        phone: '09122000001',
        firstName: 'حسن',
        lastName: 'رحیمی',
        displayName: 'حسن رحیمی',
        bio: 'توسعه‌دهنده فول‌استک با بیش از ۸ سال تجربه. متخصص React و Node.js',
        city: 'تهران',
        province: 'تهران',
        role: 'SPECIALIST',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'mina@email.com',
        password: simpleHash('123456'),
        phone: '09132000002',
        firstName: 'مینا',
        lastName: 'عباسی',
        displayName: 'مینا عباسی',
        bio: 'طراح UI/UX حرفه‌ای. فارغ‌التحصیل دانشگاه تهران با ۵ سال سابقه کار',
        city: 'اصفهان',
        province: 'اصفهان',
        role: 'SPECIALIST',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'saeed@email.com',
        password: simpleHash('123456'),
        phone: '09142000003',
        firstName: 'سعید',
        lastName: 'اکبری',
        displayName: 'سعید اکبری',
        bio: 'متخصص اندروید و فلاتر. توسعه‌دهنده اپلیکیشن‌های موبایل',
        city: 'شیراز',
        province: 'فارس',
        role: 'SPECIALIST',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'leila@email.com',
        password: simpleHash('123456'),
        phone: '09152000004',
        firstName: 'لیلا',
        lastName: 'قاسمی',
        displayName: 'لیلا قاسمی',
        bio: 'نویسنده و تولیدکننده محتوا با تمرکز بر سئو. بیش از ۳ سال تجربه',
        city: 'تهران',
        province: 'تهران',
        role: 'SPECIALIST',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'mehdi.s@email.com',
        password: simpleHash('123456'),
        phone: '09162000005',
        firstName: 'مهدی',
        lastName: 'صادقی',
        displayName: 'مهدی صادقی',
        bio: 'متخصص هوش مصنوعی و یادگیری ماشین. پژوهشگر دانشگاه شریف',
        city: 'تهران',
        province: 'تهران',
        role: 'SPECIALIST',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'fatemeh@email.com',
        password: simpleHash('123456'),
        phone: '09172000006',
        firstName: 'فاطمه',
        lastName: 'جعفری',
        displayName: 'فاطمه جعفری',
        bio: 'طراح گرافیک و لوگو. متخصص Photoshop و Illustrator',
        city: 'تبریز',
        province: 'آذربایجان شرقی',
        role: 'SPECIALIST',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
  ]);

  console.log(`  ✅ ${specialists.length} متخصص ساخته شد`);
  console.log(`  👥 مجموعاً ${admins.length + clients.length + specialists.length} کاربر\n`);

  // --- کیف پول برای متخصصین ---
  console.log('💰 ساخت کیف پول‌ها...');

  const wallets = await Promise.all([
    prisma.wallet.create({
      data: { userId: specialists[0].id, balance: 2500000, frozen: 500000 },
    }),
    prisma.wallet.create({
      data: { userId: specialists[1].id, balance: 1800000, frozen: 300000 },
    }),
    prisma.wallet.create({
      data: { userId: specialists[2].id, balance: 3200000, frozen: 0 },
    }),
    prisma.wallet.create({
      data: { userId: specialists[3].id, balance: 900000, frozen: 100000 },
    }),
    prisma.wallet.create({
      data: { userId: specialists[4].id, balance: 5000000, frozen: 1000000 },
    }),
    prisma.wallet.create({
      data: { userId: specialists[5].id, balance: 1200000, frozen: 200000 },
    }),
  ]);

  console.log(`  ✅ ${wallets.length} کیف پول ساخته شد\n`);

  // --- مهارت‌های متخصصین ---
  console.log('🔗 اتصال مهارت‌ها به متخصصین...');

  const userSkillsData = [
    // حسن رحیمی - توسعه‌دهنده فول‌استک
    { userId: specialists[0].id, skillId: skills[1].id, level: 5, experience: '۸ سال تجربه' },   // React
    { userId: specialists[0].id, skillId: skills[4].id, level: 4, experience: '۶ سال تجربه' },   // Node.js
    { userId: specialists[0].id, skillId: skills[0].id, level: 5, experience: '۸ سال تجربه' },   // HTML/CSS
    { userId: specialists[0].id, skillId: skills[5].id, level: 3, experience: '۳ سال تجربه' },   // Python
    // مینا عباسی - طراح UI/UX
    { userId: specialists[1].id, skillId: skills[19].id, level: 5, experience: '۵ سال تجربه' },  // Figma
    { userId: specialists[1].id, skillId: skills[17].id, level: 4, experience: '۴ سال تجربه' },  // Photoshop
    { userId: specialists[1].id, skillId: skills[20].id, level: 4, experience: '۴ سال تجربه' },  // Adobe XD
    // سعید اکبری - موبایل
    { userId: specialists[2].id, skillId: skills[7].id, level: 5, experience: '۶ سال تجربه' },   // Kotlin
    { userId: specialists[2].id, skillId: skills[9].id, level: 4, experience: '۴ سال تجربه' },   // Dart/Flutter
    { userId: specialists[2].id, skillId: skills[10].id, level: 3, experience: '۳ سال تجربه' },  // React Native
    // لیلا قاسمی - تولید محتوا
    { userId: specialists[3].id, skillId: skills[11].id, level: 5, experience: '۳ سال تجربه' },  // مقاله‌نویسی
    { userId: specialists[3].id, skillId: skills[13].id, level: 4, experience: '۲ سال تجربه' },  // سئو محتوایی
    { userId: specialists[3].id, skillId: skills[12].id, level: 3, experience: '۲ سال تجربه' },  // سئو تکنیکال
    { userId: specialists[3].id, skillId: skills[14].id, level: 4, experience: '۳ سال تجربه' },  // ترجمه انگلیسی-فارسی
    // مهدی صادقی - هوش مصنوعی
    { userId: specialists[4].id, skillId: skills[34].id, level: 5, experience: '۵ سال تجربه' },  // Deep Learning
    { userId: specialists[4].id, skillId: skills[35].id, level: 4, experience: '۴ سال تجربه' },  // NLP
    { userId: specialists[4].id, skillId: skills[32].id, level: 4, experience: '۳ سال تجربه' },  // ChatGPT و LLM
    { userId: specialists[4].id, skillId: skills[5].id, level: 5, experience: '۶ سال تجربه' },   // Python
    // فاطمه جعفری - طراحی گرافیک
    { userId: specialists[5].id, skillId: skills[17].id, level: 5, experience: '۶ سال تجربه' },  // Photoshop
    { userId: specialists[5].id, skillId: skills[18].id, level: 5, experience: '۵ سال تجربه' },  // Illustrator
    { userId: specialists[5].id, skillId: skills[21].id, level: 4, experience: '۳ سال تجربه' },  // طراحی بنر
  ];

  const userSkills = await Promise.all(
    userSkillsData.map((us) => prisma.userSkill.create({ data: us }))
  );

  console.log(`  ✅ ${userSkills.length} مهارت به متخصصین متصل شد\n`);

  // ========== ۵. ساخت درخواست‌های خدمات ==========
  console.log('📋 ساخت درخواست‌های خدمات...');

  const serviceRequests = await Promise.all([
    prisma.serviceRequest.create({
      data: {
        title: 'طراحی وب‌سایت فروشگاهی آنلاین',
        slug: 'online-store-website-design',
        description: 'طراحی و توسعه یک وب‌سایت فروشگاهی کامل با امکانات زیر: سبد خرید، درگاه پرداخت، پنل مدیریت محصولات، سیستم فاکتوردهی و گزارش‌گیری. طراحی ریسپانسیو و سریع با پشتیبانی از زبان فارسی.',
        budgetMin: 15000000,
        budgetMax: 30000000,
        budgetType: 'FIXED',
        deliveryTime: 30,
        deliveryUnit: 'day',
        city: 'تهران',
        province: 'تهران',
        categoryId: categories['web'],
        subcategoryId: categories['web-design'],
        priority: 'HIGH',
        status: 'OPEN',
        tags: JSON.stringify(['فروشگاه آنلاین', 'وب‌سایت', 'طراحی وب', 'تجارت الکترونیک']),
        userId: clients[0].id,
        isFeatured: true,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'توسعه اپلیکیشن موبایل برای رستوران',
        slug: 'restaurant-mobile-app',
        description: 'توسعه اپلیکیشن موبایل رستوران با امکانات سفارش آنلاین، ردیابی سفارش، منوی دیجیتال، سیستم پرداخت و نظرات مشتریان. نیاز به نسخه اندروید و iOS.',
        budgetMin: 25000000,
        budgetMax: 50000000,
        budgetType: 'FIXED',
        deliveryTime: 45,
        deliveryUnit: 'day',
        city: 'اصفهان',
        province: 'اصفهان',
        categoryId: categories['mobile'],
        subcategoryId: categories['flutter'],
        priority: 'URGENT',
        status: 'OPEN',
        tags: JSON.stringify(['اپلیکیشن', 'رستوران', 'سفارش آنلاین', 'فلاتر']),
        userId: clients[1].id,
        isFeatured: true,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'تولید محتوای سئو محور برای وبلاگ شرکتی',
        slug: 'seo-blog-content',
        description: 'تولید ۲۰ مقاله حرفه‌ای سئو محور برای وبلاگ شرکتی در حوزه فناوری اطلاعات. هر مقاله حداقل ۱۵۰۰ کلمه و شامل کلمات کلیدی هدفمند.',
        budgetMin: 8000000,
        budgetMax: 12000000,
        budgetType: 'FIXED',
        deliveryTime: 20,
        deliveryUnit: 'day',
        city: 'شیراز',
        province: 'فارس',
        categoryId: categories['content'],
        subcategoryId: categories['copywriting'],
        priority: 'NORMAL',
        status: 'OPEN',
        tags: JSON.stringify(['تولید محتوا', 'سئو', 'مقاله', 'وبلاگ']),
        userId: clients[2].id,
        isFeatured: false,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'طراحی رابط کاربری اپلیکیشن بانکی',
        slug: 'banking-app-ui-design',
        description: 'طراحی UI/UX اپلیکیشن موبایل بانکداری دیجیتال شامل صفحه ورود، داشبورد، انتقال وجه، پرداخت قبض و گزارش تراکنش‌ها. طراحی مدرن و ساده با رعایت اصول امنیتی.',
        budgetMin: 10000000,
        budgetMax: 18000000,
        budgetType: 'FIXED',
        deliveryTime: 21,
        deliveryUnit: 'day',
        city: 'تهران',
        province: 'تهران',
        categoryId: categories['graphic'],
        subcategoryId: categories['ui-ux'],
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        tags: JSON.stringify(['UI/UX', 'اپلیکیشن بانکی', 'Figma', 'طراحی رابط']),
        userId: clients[0].id,
        isFeatured: true,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'توسعه چت‌بات هوشمند پشتیبانی مشتری',
        slug: 'smart-support-chatbot',
        description: 'توسعه یک چت‌بات هوشمند برای پشتیبانی مشتریان با استفاده از مدل‌های زبانی بزرگ. چت‌بات باید قادر به پاسخگویی سوالات متداول، ثبت درخواست پشتیبانی و انتقال به کارشناس انسانی باشد.',
        budgetMin: 20000000,
        budgetMax: 40000000,
        budgetType: 'NEGOTIABLE',
        deliveryTime: 60,
        deliveryUnit: 'day',
        city: 'تهران',
        province: 'تهران',
        categoryId: categories['ai'],
        subcategoryId: categories['chatbot'],
        priority: 'NORMAL',
        status: 'OPEN',
        tags: JSON.stringify(['چت‌بات', 'هوش مصنوعی', 'پشتیبانی', 'LLM']),
        userId: clients[1].id,
        isFeatured: true,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'طراحی لوگو و هویت بصری برند لوازم آرایشی',
        slug: 'cosmetics-brand-logo',
        description: 'طراحی لوگو و هویت بصری کامل برای برند جدید لوازم آرایشی شامل: لوگو اصلی، لوگو مینیمال، پالت رنگی، تایپوگرافی و طرح کارت ویزیت.',
        budgetMin: 5000000,
        budgetMax: 10000000,
        budgetType: 'FIXED',
        deliveryTime: 14,
        deliveryUnit: 'day',
        city: 'تبریز',
        province: 'آذربایجان شرقی',
        categoryId: categories['graphic'],
        subcategoryId: categories['logo-design'],
        priority: 'NORMAL',
        status: 'COMPLETED',
        tags: JSON.stringify(['لوگو', 'هویت بصری', 'برند', 'آرایشی']),
        userId: clients[2].id,
        isFeatured: false,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'بهینه‌سازی سئو سایت فروشگاهی',
        slug: 'store-seo-optimization',
        description: 'بهینه‌سازی کامل سئو سایت فروشگاهی شامل: سئو تکنیکال، بهینه‌سازی محتوا، لینک‌سازی داخلی و خارجی، بهبود سرعت سایت و بهینه‌سازی برای موبایل.',
        budgetMin: 6000000,
        budgetMax: 10000000,
        budgetType: 'HOURLY',
        deliveryTime: 30,
        deliveryUnit: 'day',
        city: 'تهران',
        province: 'تهران',
        categoryId: categories['content'],
        subcategoryId: categories['seo'],
        priority: 'NORMAL',
        status: 'OPEN',
        tags: JSON.stringify(['سئو', 'بهینه‌سازی', 'فروشگاه', 'سرعت سایت']),
        userId: clients[0].id,
        isFeatured: false,
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: 'تعمیر لپ‌تاپ مک‌بوک پرو',
        slug: 'macbook-pro-repair',
        description: 'تعمیر لپ‌تاپ مک‌بوک پرو ۲۰۲۱. مشکل: صفحه نمایش خط می‌اندازد و باتری سریع خالی می‌شود. نیاز به بررسی و تعمیر تخصصی.',
        budgetMin: 3000000,
        budgetMax: 8000000,
        budgetType: 'NEGOTIABLE',
        deliveryTime: 3,
        deliveryUnit: 'day',
        city: 'شیراز',
        province: 'فارس',
        categoryId: categories['repair'],
        subcategoryId: categories['laptop-repair'],
        priority: 'URGENT',
        status: 'CLOSED',
        tags: JSON.stringify(['لپ‌تاپ', 'مک‌بوک', 'تعمیر', 'اپل']),
        userId: clients[2].id,
        isFeatured: false,
      },
    }),
  ]);

  console.log(`  ✅ ${serviceRequests.length} درخواست خدمات ساخته شد\n`);

  // ========== ۶. ساخت پیشنهادها ==========
  console.log('📨 ساخت پیشنهادها...');

  const proposals = await Promise.all([
    // پیشنهاد حسن برای وب‌سایت فروشگاهی
    prisma.proposal.create({
      data: {
        price: 22000000,
        deliveryTime: 25,
        deliveryUnit: 'day',
        message: 'سلام. من بیش از ۸ سال تجربه در طراحی و توسعه وب‌سایت‌های فروشگاهی دارم. پروژه‌های مشابهی با ووکامرس و Next.js انجام داده‌ام. طراحی ریسپانسیو، سریع و سئو فرندلی تضمین می‌شود. نمونه کارها را می‌توانم در پیام خصوصی بفرستم.',
        status: 'PENDING',
        userId: specialists[0].id,
        requestId: serviceRequests[0].id,
      },
    }),
    // پیشنهاد حسن برای اپلیکیشن بانکی (قبول شده)
    prisma.proposal.create({
      data: {
        price: 15000000,
        deliveryTime: 18,
        deliveryUnit: 'day',
        message: 'با سلام. من در طراحی رابط کاربری اپلیکیشن‌های مالی تجربه دارم. با توجه به اهمیت امنیت در اپلیکیشن‌های بانکی، تمام اصول UX امنیتی را رعایت می‌کنم. از Figma برای طراحی استفاده خواهم کرد و فایل‌های لایه‌بندی کامل تحویل می‌دهم.',
        status: 'ACCEPTED',
        userId: specialists[0].id,
        requestId: serviceRequests[3].id,
      },
    }),
    // پیشنهاد مینا برای اپلیکیشن بانکی
    prisma.proposal.create({
      data: {
        price: 16000000,
        deliveryTime: 21,
        deliveryUnit: 'day',
        message: 'سلام وقت بخیر. من متخصص UI/UX هستم و تجربه طراحی اپلیکیشن‌های مالی را دارم. طراحی‌هایم بر اساس اصول Material Design و تحقیقات کاربر انجام می‌شود.',
        status: 'REJECTED',
        userId: specialists[1].id,
        requestId: serviceRequests[3].id,
      },
    }),
    // پیشنهاد مینا برای طراحی رابط اپلیکیشن بانکی (جایگزین بالا)
    prisma.proposal.create({
      data: {
        price: 14000000,
        deliveryTime: 15,
        deliveryUnit: 'day',
        message: 'سلام. من بیش از ۵ سال تجربه در طراحی UI/UX اپلیکیشن‌های موبایل دارم. نمونه کارهایم را می‌توانید در پروفایلم ببینید. طراحی مدرن، تمیز و کاربرپسند.',
        status: 'PENDING',
        userId: specialists[1].id,
        requestId: serviceRequests[1].id,
      },
    }),
    // پیشنهاد سعید برای اپلیکیشن رستوران
    prisma.proposal.create({
      data: {
        price: 35000000,
        deliveryTime: 40,
        deliveryUnit: 'day',
        message: 'با سلام. من متخصص فلاتر هستم و اپلیکیشن‌های مشابهی برای رستوران‌ها توسعه داده‌ام. امکانات شامل سفارش آنلاین، ردیابی، نوتیفیکیشن و ادمین پنل را ارائه می‌دهم.',
        status: 'PENDING',
        userId: specialists[2].id,
        requestId: serviceRequests[1].id,
      },
    }),
    // پیشنهاد لیلا برای تولید محتوا
    prisma.proposal.create({
      data: {
        price: 10000000,
        deliveryTime: 20,
        deliveryUnit: 'day',
        message: 'سلام. من نویسنده حرفه‌ای و متخصص سئو هستم. ۲۰ مقاله با کیفیت بالا و سئو محور تولید می‌کنم. هر مقاله حداقل ۱۵۰۰ کلمه و شامل کلمات کلیدی هدفمند خواهد بود.',
        status: 'PENDING',
        userId: specialists[3].id,
        requestId: serviceRequests[2].id,
      },
    }),
    // پیشنهاد لیلا برای سئو فروشگاهی
    prisma.proposal.create({
      data: {
        price: 7500000,
        deliveryTime: 25,
        deliveryUnit: 'day',
        message: 'سلام. من متخصص سئو هستم و تجربه بهینه‌سازی چندین سایت فروشگاهی را دارم. سئو تکنیکال، محتوایی و لینک‌سازی را به صورت جامع انجام می‌دهم.',
        status: 'PENDING',
        userId: specialists[3].id,
        requestId: serviceRequests[6].id,
      },
    }),
    // پیشنهاد مهدی برای چت‌بات
    prisma.proposal.create({
      data: {
        price: 30000000,
        deliveryTime: 50,
        deliveryUnit: 'day',
        message: 'سلام. من پژوهشگر هوش مصنوعی در دانشگاه شریف هستم و تجربه توسعه چت‌بات‌های هوشمند با استفاده از LLM را دارم. سیستم شامل پردازش زبان طبیعی فارسی، پایگاه دانش و انتقال به کارشناس انسانی خواهد بود.',
        status: 'PENDING',
        userId: specialists[4].id,
        requestId: serviceRequests[4].id,
      },
    }),
    // پیشنهاد فاطمه برای لوگو (قبول شده و تکمیل شده)
    prisma.proposal.create({
      data: {
        price: 7500000,
        deliveryTime: 10,
        deliveryUnit: 'day',
        message: 'سلام. من طراح گرافیک با ۶ سال تجربه هستم. لوگو و هویت بصری کامل شامل ۳ طرح اولیه، ۲ مرحله اصلاح، پالت رنگی و راهنمای برند را ارائه می‌دهم.',
        status: 'ACCEPTED',
        userId: specialists[5].id,
        requestId: serviceRequests[5].id,
      },
    }),
    // پیشنهاد حسن برای سئو فروشگاهی
    prisma.proposal.create({
      data: {
        price: 8000000,
        deliveryTime: 30,
        deliveryUnit: 'day',
        message: 'سلام. من علاوه بر توسعه وب، در زمینه سئو تکنیکال هم تخصص دارم. سرعت سایت را بهینه کرده و مشکلات فنی سئو را رفع می‌کنم.',
        status: 'PENDING',
        userId: specialists[0].id,
        requestId: serviceRequests[6].id,
      },
    }),
  ]);

  console.log(`  ✅ ${proposals.length} پیشنهاد ساخته شد\n`);

  // ========== ۷. ساخت نظرات ==========
  console.log('⭐ ساخت نظرات...');

  const reviews = await Promise.all([
    // نظر امیر نجفی درباره فاطمه جعفری (طراحی لوگو)
    prisma.review.create({
      data: {
        rating: 5,
        comment: 'کار فوق‌العاده‌ای بود! لوگو و هویت بصری برند ما بسیار حرفه‌ای و زیبا طراحی شد. فاطمه بسیار خلاق و حرفه‌ای است. کاملاً راضی هستیم.',
        response: 'خیلی ممنون از اعتماد شما. خوشحالم که نتیجه کار مورد پسندتان واقع شد.',
        isPublished: true,
        authorId: clients[2].id,
        userId: specialists[5].id,
        requestId: serviceRequests[5].id,
      },
    }),
    // نظر رضا کریمی درباره حسن رحیمی (درخواست فروشگاهی هنوز باز است ولی فرض می‌کنیم یک درخواست قبلی هم بوده)
    // برای درخواست لوگو هم یک نظر اضافه کنیم
    prisma.review.create({
      data: {
        rating: 4,
        comment: 'طراحی خوبی بود و خلاقیت خوبی در کار دیده می‌شد. فقط زمان تحویل کمی دیرتر از موعد بود ولی کیفیت نهایی عالی بود.',
        response: 'ممنون از نظرتان. سعی می‌کنم در پروژه‌های بعدی زمان‌بندی را دقیق‌تر رعایت کنم.',
        isPublished: true,
        authorId: clients[0].id,
        userId: specialists[5].id,
        requestId: serviceRequests[5].id,
      },
    }),
  ]);

  console.log(`  ✅ ${reviews.length} نظر ساخته شد\n`);

  // ========== ۸. ساخت مکالمات و پیام‌ها ==========
  console.log('💬 ساخت مکالمات و پیام‌ها...');

  const conversations = await Promise.all([
    // مکالمه بین رضا و حسن درباره وب‌سایت فروشگاهی
    prisma.conversation.create({
      data: {
        requestId: serviceRequests[0].id,
        userId1: clients[0].id,
        userId2: specialists[0].id,
        lastMessage: 'بله، نمونه کارها را بررسی می‌کنم.',
        lastMessageAt: new Date(Date.now() - 3600000),
      },
    }),
    // مکالمه بین سارا و سعید درباره اپلیکیشن رستوران
    prisma.conversation.create({
      data: {
        requestId: serviceRequests[1].id,
        userId1: clients[1].id,
        userId2: specialists[2].id,
        lastMessage: 'آیا امکان اضافه کردن سیستم رزرو میز هم هست؟',
        lastMessageAt: new Date(Date.now() - 7200000),
      },
    }),
    // مکالمه بین سارا و مهدی درباره چت‌بات
    prisma.conversation.create({
      data: {
        requestId: serviceRequests[4].id,
        userId1: clients[1].id,
        userId2: specialists[4].id,
        lastMessage: 'لطفاً جزئیات بیشتری از مدل‌هایی که استفاده می‌کنید بفرستید.',
        lastMessageAt: new Date(Date.now() - 1800000),
      },
    }),
    // مکالمه بین امیر و فاطمه درباره لوگو (تکمیل شده)
    prisma.conversation.create({
      data: {
        requestId: serviceRequests[5].id,
        userId1: clients[2].id,
        userId2: specialists[5].id,
        lastMessage: 'فایل‌های نهایی را ارسال کردم. ممنون از همکاری خوبتان.',
        lastMessageAt: new Date(Date.now() - 86400000 * 5),
      },
    }),
  ]);

  console.log(`  ✅ ${conversations.length} مکالمه ساخته شد`);

  // پیام‌ها
  const messages = await Promise.all([
    // پیام‌های مکالمه رضا و حسن
    prisma.message.create({
      data: {
        conversationId: conversations[0].id,
        senderId: clients[0].id,
        content: 'سلام. پیشنهاد شما را دیدم. آیا می‌توانید نمونه کارهای مشابه را بفرستید؟',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 86400000),
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[0].id,
        senderId: specialists[0].id,
        content: 'سلام. بله حتماً. من ۳ پروژه فروشگاهی مشابه انجام داده‌ام. لینک نمونه‌ها را ارسال می‌کنم:\n۱. فروشگاه دیجی‌لوازم - digiloozam.ir\n۲. فروشگاه پوشاک آنلاین - fashionline.ir\n۳. سوپرمارکت آنلاین - basket24.ir',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 82800000),
        createdAt: new Date(Date.now() - 86000000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[0].id,
        senderId: clients[0].id,
        content: 'بله، نمونه کارها را بررسی می‌کنم.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 4000000),
      },
    }),

    // پیام‌های مکالمه سارا و سعید
    prisma.message.create({
      data: {
        conversationId: conversations[1].id,
        senderId: clients[1].id,
        content: 'سلام. پیشنهادتان را بررسی کردم. آیا امکان اضافه کردن سیستم رزرو میز هم هست؟',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 7000000),
        createdAt: new Date(Date.now() - 14400000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[1].id,
        senderId: specialists[2].id,
        content: 'سلام. بله، امکان اضافه کردن سیستم رزرو میز وجود دارد. می‌توانیم یک ماژول جداگانه برای آن طراحی کنیم. هزینه اضافی آن حدود ۵ میلیون تومان خواهد بود.',
        type: 'TEXT',
        isRead: false,
        createdAt: new Date(Date.now() - 7200000),
      },
    }),

    // پیام‌های مکالمه سارا و مهدی
    prisma.message.create({
      data: {
        conversationId: conversations[2].id,
        senderId: clients[1].id,
        content: 'سلام. می‌خواستم بدونم از چه مدل‌های زبانی استفاده می‌کنید؟ آیا از مدل‌های فارسی هم پشتیبانی می‌شود؟',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 2000000),
        createdAt: new Date(Date.now() - 5400000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[2].id,
        senderId: specialists[4].id,
        content: 'سلام. ما از ترکیب مدل‌های ParsBERT برای پردازش زبان فارسی و GPT برای تولید پاسخ استفاده می‌کنیم. سیستم قادر به درک و پاسخگویی به زبان فارسی است. همچنین پایگاه دانش سفارشی با سوالات متداول شما تنظیم خواهد شد.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 1900000),
        createdAt: new Date(Date.now() - 4000000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[2].id,
        senderId: clients[1].id,
        content: 'لطفاً جزئیات بیشتری از مدل‌هایی که استفاده می‌کنید بفرستید.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 1800000),
        createdAt: new Date(Date.now() - 2000000),
      },
    }),

    // پیام‌های مکالمه امیر و فاطمه (لوگو)
    prisma.message.create({
      data: {
        conversationId: conversations[3].id,
        senderId: clients[2].id,
        content: 'سلام. طرح اولیه لوگو بسیار عالی بود. فقط می‌خواستم رنگ اصلی به سبز تغییر کند.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 6),
        createdAt: new Date(Date.now() - 86400000 * 7),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[3].id,
        senderId: specialists[5].id,
        content: 'سلام. بله حتماً. نسخه سبز را آماده می‌کنم و تا فردا می‌فرستم.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 5.5),
        createdAt: new Date(Date.now() - 86400000 * 6.5),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[3].id,
        senderId: specialists[5].id,
        content: 'فایل‌های نهایی را ارسال کردم. ممنون از همکاری خوبتان.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 5),
        createdAt: new Date(Date.now() - 86400000 * 5),
      },
    }),
  ]);

  console.log(`  ✅ ${messages.length} پیام ساخته شد\n`);

  // ========== ۹. ساخت اعلان‌ها ==========
  console.log('🔔 ساخت اعلان‌ها...');

  const notifications = await Promise.all([
    // اعلان برای رضا - پیشنهاد جدید
    prisma.notification.create({
      data: {
        userId: clients[0].id,
        type: 'NEW_PROPOSAL',
        title: 'پیشنهاد جدید',
        message: 'حسن رحیمی برای درخواست «طراحی وب‌سایت فروشگاهی آنلاین» یک پیشنهاد جدید ارسال کرد.',
        data: JSON.stringify({ requestId: serviceRequests[0].id, proposalId: proposals[0].id }),
        isRead: true,
        readAt: new Date(Date.now() - 3600000),
      },
    }),
    // اعلان برای رضا - پیشنهاد جدید سئو
    prisma.notification.create({
      data: {
        userId: clients[0].id,
        type: 'NEW_PROPOSAL',
        title: 'پیشنهاد جدید',
        message: 'حسن رحیمی برای درخواست «بهینه‌سازی سئو سایت فروشگاهی» یک پیشنهاد جدید ارسال کرد.',
        data: JSON.stringify({ requestId: serviceRequests[6].id, proposalId: proposals[9].id }),
        isRead: false,
      },
    }),
    // اعلان برای سارا - پیشنهاد جدید
    prisma.notification.create({
      data: {
        userId: clients[1].id,
        type: 'NEW_PROPOSAL',
        title: 'پیشنهاد جدید',
        message: 'سعید اکبری برای درخواست «توسعه اپلیکیشن موبایل برای رستوران» یک پیشنهاد جدید ارسال کرد.',
        data: JSON.stringify({ requestId: serviceRequests[1].id, proposalId: proposals[4].id }),
        isRead: true,
        readAt: new Date(Date.now() - 7200000),
      },
    }),
    // اعلان برای سارا - پیشنهاد مهدی
    prisma.notification.create({
      data: {
        userId: clients[1].id,
        type: 'NEW_PROPOSAL',
        title: 'پیشنهاد جدید',
        message: 'مهدی صادقی برای درخواست «توسعه چت‌بات هوشمند پشتیبانی مشتری» یک پیشنهاد جدید ارسال کرد.',
        data: JSON.stringify({ requestId: serviceRequests[4].id, proposalId: proposals[7].id }),
        isRead: false,
      },
    }),
    // اعلان برای حسن - پیشنهاد پذیرفته شد
    prisma.notification.create({
      data: {
        userId: specialists[0].id,
        type: 'PROPOSAL_ACCEPTED',
        title: 'پیشنهاد شما پذیرفته شد!',
        message: 'رضا کریمی پیشنهاد شما را برای درخواست «طراحی رابط کاربری اپلیکیشن بانکی» پذیرفت.',
        data: JSON.stringify({ requestId: serviceRequests[3].id, proposalId: proposals[1].id }),
        isRead: true,
        readAt: new Date(Date.now() - 172800000),
      },
    }),
    // اعلان برای مینا - پیشنهاد رد شد
    prisma.notification.create({
      data: {
        userId: specialists[1].id,
        type: 'PROPOSAL_REJECTED',
        title: 'پیشنهاد شما رد شد',
        message: 'رضا کریمی پیشنهاد شما را برای درخواست «طراحی رابط کاربری اپلیکیشن بانکی» رد کرد.',
        data: JSON.stringify({ requestId: serviceRequests[3].id, proposalId: proposals[2].id }),
        isRead: true,
        readAt: new Date(Date.now() - 172800000),
      },
    }),
    // اعلان برای فاطمه - پیشنهاد پذیرفته شد
    prisma.notification.create({
      data: {
        userId: specialists[5].id,
        type: 'PROPOSAL_ACCEPTED',
        title: 'پیشنهاد شما پذیرفته شد!',
        message: 'امیر نجفی پیشنهاد شما را برای درخواست «طراحی لوگو و هویت بصری برند لوازم آرایشی» پذیرفت.',
        data: JSON.stringify({ requestId: serviceRequests[5].id, proposalId: proposals[8].id }),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 10),
      },
    }),
    // اعلان برای امیر - درخواست تکمیل شد
    prisma.notification.create({
      data: {
        userId: clients[2].id,
        type: 'REQUEST_COMPLETED',
        title: 'درخواست شما تکمیل شد',
        message: 'درخواست «طراحی لوگو و هویت بصری برند لوازم آرایشی» با موفقیت تکمیل شد. لطفاً نظر خود را ثبت کنید.',
        data: JSON.stringify({ requestId: serviceRequests[5].id }),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 4),
      },
    }),
    // اعلان برای فاطمه - نظر جدید
    prisma.notification.create({
      data: {
        userId: specialists[5].id,
        type: 'NEW_REVIEW',
        title: 'نظر جدید دریافت کردید',
        message: 'امیر نجفی برای پروژه «طراحی لوگو و هویت بصری برند لوازم آرایشی» یک نظر ۵ ستاره ثبت کرد.',
        data: JSON.stringify({ requestId: serviceRequests[5].id, reviewId: reviews[0].id }),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 3),
      },
    }),
    // اعلان عمومی - اطلاعیه پلتفرم
    prisma.notification.create({
      data: {
        userId: clients[0].id,
        type: 'SYSTEM',
        title: 'خوش آمدید!',
        message: 'به پلتفرم نیاز فایندر خوش آمدید. شما می‌توانید درخواست خدمات خود را ثبت کنید و بهترین متخصصان را پیدا کنید.',
        data: JSON.stringify({}),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 30),
      },
    }),
    prisma.notification.create({
      data: {
        userId: clients[1].id,
        type: 'SYSTEM',
        title: 'خوش آمدید!',
        message: 'به پلتفرم نیاز فایندر خوش آمدید. شما می‌توانید درخواست خدمات خود را ثبت کنید و بهترین متخصصان را پیدا کنید.',
        data: JSON.stringify({}),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 25),
      },
    }),
    prisma.notification.create({
      data: {
        userId: clients[2].id,
        type: 'SYSTEM',
        title: 'خوش آمدید!',
        message: 'به پلتفرم نیاز فایندر خوش آمدید. شما می‌توانید درخواست خدمات خود را ثبت کنید و بهترین متخصصان را پیدا کنید.',
        data: JSON.stringify({}),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 20),
      },
    }),
    // اعلان ادمین - درخواست ویژه جدید
    prisma.notification.create({
      data: {
        userId: admins[0].id,
        type: 'SYSTEM',
        title: 'درخواست ویژه جدید',
        message: 'یک درخواست ویژه جدید با اولویت فوری ثبت شده است: «تعمیر لپ‌تاپ مک‌بوک پرو»',
        data: JSON.stringify({ requestId: serviceRequests[7].id }),
        isRead: true,
        readAt: new Date(Date.now() - 86400000 * 2),
      },
    }),
  ]);

  console.log(`  ✅ ${notifications.length} اعلان ساخته شد\n`);

  // ========== خلاصه ==========
  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ ساخت داده‌های اولیه با موفقیت تکمیل شد!');
  console.log('═══════════════════════════════════════════════');
  console.log(`  📁 دسته‌بندی‌ها:     ${parentCategories.length} اصلی + ${subcategories.length} زیردسته`);
  console.log(`  🎯 مهارت‌ها:        ${skills.length}`);
  console.log(`  👥 کاربران:          ${admins.length} ادمین + ${clients.length} کارفرما + ${specialists.length} متخصص`);
  console.log(`  💰 کیف پول‌ها:       ${wallets.length}`);
  console.log(`  🔗 مهارت کاربران:   ${userSkills.length}`);
  console.log(`  📋 درخواست خدمات:   ${serviceRequests.length}`);
  console.log(`  📨 پیشنهادها:       ${proposals.length}`);
  console.log(`  ⭐ نظرات:           ${reviews.length}`);
  console.log(`  💬 مکالمات:         ${conversations.length}`);
  console.log(`  📩 پیام‌ها:          ${messages.length}`);
  console.log(`  🔔 اعلان‌ها:         ${notifications.length}`);
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ خطا در ساخت داده‌های اولیه:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
