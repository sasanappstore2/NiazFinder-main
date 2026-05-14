import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
}

function generateSlug(text: string): string {
  return text
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase()
    + '-' + Date.now().toString(36);
}

async function main() {
  console.log('🚀 شروع ساخت داده‌های تکمیلی نیاز فایندر...\n');

  // ========== بررسی داده‌های موجود ==========
  const existingSpecialists = await prisma.user.count({ where: { role: 'SPECIALIST' } });
  const existingRequests = await prisma.serviceRequest.count();
  console.log(`📊 متخصصین موجود: ${existingSpecialists}`);
  console.log(`📊 درخواست‌های موجود: ${existingRequests}`);

  // ========== دریافت مهارت‌ها و دسته‌بندی‌های موجود ==========
  const allSkills = await prisma.skill.findMany();
  const allCategories = await prisma.category.findMany();
  const existingClients = await prisma.user.findMany({ where: { role: 'CLIENT' } });

  console.log(`📊 مهارت‌های موجود: ${allSkills.length}`);
  console.log(`📊 دسته‌بندی‌های موجود: ${allCategories.length}`);
  console.log(`📊 کارفرمایان موجود: ${existingClients.length}\n`);

  if (allSkills.length === 0 || allCategories.length === 0) {
    console.log('⚠️  ابتدا باید seed اصلی اجرا شود. دستور: npx prisma db seed');
    await prisma.$disconnect();
    return;
  }

  // Map skills by name for easy lookup
  const skillMap = new Map(allSkills.map(s => [s.name, s]));
  const categoryMap = new Map(allCategories.map(c => [c.name, c]));

  // ========== ساخت متخصصین جدید ==========
  const newSpecialistsCount = 22;
  console.log(`👥 ساخت ${newSpecialistsCount} متخصص جدید...`);

  const specialistsData = [
    { firstName: 'محمدرضا', lastName: 'طاهری', displayName: 'محمدرضا طاهری', email: 'mrtaheri@email.com', phone: '09128001001', city: 'تهران', province: 'تهران', bio: 'طراح و توسعه‌دهنده وب‌سایت‌های حرفه‌ای با بیش از ۱۰ سال سابقه. متخصص React، Next.js و Node.js. طراحی فروشگاهی، شرکتی و شخصی.', skillNames: ['React', 'Node.js', 'HTML و CSS'], rating: 4.8, projectCount: 245 },
    { firstName: 'نازنین', lastName: 'کاظمی', displayName: 'نازنین کاظمی', email: 'nazanin.k@email.com', phone: '09128001002', city: 'اصفهان', province: 'اصفهان', bio: 'طراح UI/UX ارشد با تجربه در طراحی اپلیکیشن‌های بانکی، فروشگاهی و سلامت. فارغ‌التحصیل کارشناسی ارشد دانشگاه صنعتی اصفهان.', skillNames: ['Figma', 'Adobe XD', 'Photoshop'], rating: 4.9, projectCount: 178 },
    { firstName: 'بهنام', lastName: 'میرزایی', displayName: 'بهنام میرزایی', email: 'behnam.m@email.com', phone: '09138001003', city: 'شیراز', province: 'فارس', bio: 'متخصص سئو و بازاریابی دیجیتال. بیش از ۷ سال تجربه در بهینه‌سازی سایت‌های فروشگاهی و شرکتی. دستیار سئو گوگل معتبر.', skillNames: ['سئو تکنیکال', 'سئو محتوایی', 'مقاله‌نویسی'], rating: 4.7, projectCount: 312 },
    { firstName: 'سمیرا', lastName: 'حیدری', displayName: 'سمیرا حیدری', email: 'samira.h@email.com', phone: '09148001004', city: 'تبریز', province: 'آذربایجان شرقی', bio: 'توسعه‌دهنده اپلیکیشن‌های اندروید و iOS با فلاتر. تجربه توسعه بیش از ۳۰ اپلیکیشن موبایل در حوزه‌های مختلف.', skillNames: ['Dart و Flutter', 'Kotlin', 'React Native'], rating: 4.6, projectCount: 89 },
    { firstName: 'احمد', lastName: 'نوری', displayName: 'احمد نوری', email: 'ahmad.n@email.com', phone: '09158001005', city: 'مشهد', province: 'خراسان رضوی', bio: 'برنامه‌نویس پایتون و متخصص هوش مصنوعی. توسعه‌دهنده سیستم‌های پردازش زبان طبیعی فارسی. عضو هیئت علمی دانشگاه فردوسی.', skillNames: ['Python', 'Deep Learning', 'NLP'], rating: 4.9, projectCount: 156 },
    { firstName: 'زهره', lastName: 'عباس‌پور', displayName: 'زهره عباس‌پور', email: 'zahra.a@email.com', phone: '09168001006', city: 'کرج', province: 'البرز', bio: 'طراح گرافیک حرفه‌ای با تمرکز بر طراحی لوگو، هویت بصری و بسته‌بندی محصولات. برنده جایزه ملی طراحی.', skillNames: ['Photoshop', 'Illustrator', 'طراحی بنر حرفه‌ای'], rating: 4.8, projectCount: 423 },
    { firstName: 'کیوان', lastName: 'فرهنگ‌فر', displayName: 'کیوان فرهنگ‌فر', email: 'keyvan.f@email.com', phone: '09178001007', city: 'تهران', province: 'تهران', bio: 'توسعه‌دهنده بک‌اند با Node.js و Python. متخصص طراحی APIهای مقیاس‌پذیر و سیستم‌های توزیع‌شده. تجربه در استارتاپ‌های یونیکورن.', skillNames: ['Node.js', 'Python', 'React'], rating: 4.5, projectCount: 134 },
    { firstName: 'مریام', lastName: 'رستمی', displayName: 'مریام رستمی', email: 'maryam.r@email.com', phone: '09188001008', city: 'اهواز', province: 'خوزستان', bio: 'ترجمه‌نده حرفه‌ای انگلیسی، فرانسوی و عربی به فارسی و بالعکس. مترجم رسمی قوه قضاییه با بیش از ۱۰ سال سابقه.', skillNames: ['ترجمه انگلیسی به فارسی', 'ترجمه فارسی به انگلیسی', 'مقاله‌نویسی'], rating: 4.7, projectCount: 567 },
    { firstName: 'پیمان', lastName: 'شریفی', displayName: 'پیمان شریفی', email: 'piman.s@email.com', phone: '09198001009', city: 'رشت', province: 'گیلان', bio: 'تکنسین تعمیرات موبایل و لپ‌تاپ با گواهینامه‌های بین‌المللی. متخصص تعمیر مادربرد و تعویض قطعات.', skillNames: ['تعمیر صفحه نمایش', 'تعمیر مادربرد لپ‌تاپ'], rating: 4.4, projectCount: 890 },
    { firstName: 'الهام', lastName: 'توکلی', displayName: 'الهام توکلی', email: 'elham.t@email.com', phone: '09208001010', city: 'قم', province: 'قم', bio: 'مشاور حقوقی و وکیل پایه یک دادگستری. متخصص حقوق خانواده، ملکی و تجاری. بیش از ۱۵ سال سابقه وکالت.', skillNames: ['حقوق خانواده', 'مشاوره تحصیلی مهاجرت'], rating: 4.9, projectCount: 234 },
    { firstName: 'دانیال', lastName: 'بهرامی', displayName: 'دانیال بهرامی', email: 'daniel.b@email.com', phone: '09218001011', city: 'کرمانشاه', province: 'کرمانشاه', bio: 'آموزگار ریاضی و فیزیک کنکور با ۸ سال سابقه آموزش خصوصی. دانش‌آموخته دکتری فیزیک از دانشگاه تهران.', skillNames: ['ریاضی', 'زبان انگلیسی'], rating: 4.6, projectCount: 345 },
    { firstName: 'شیما', lastName: 'صالحی', displayName: 'شیما صالحی', email: 'shima.s@email.com', phone: '09228001012', city: 'تهران', province: 'تهران', bio: 'تولیدکننده محتوا و مدیر شبکه‌های اجتماعی. متخصص تولید ویدیو، عکاسی و طراحی پست‌های تبلیغاتی برای اینستاگرام.', skillNames: ['تولید محتوای شبکه‌های اجتماعی', 'مقاله‌نویسی', 'طراحی بنر حرفه‌ای'], rating: 4.3, projectCount: 156 },
    { firstName: 'عرفان', lastName: 'ملکی', displayName: 'عرفان ملکی', email: 'erfan.m@email.com', phone: '09238001013', city: 'اصفهان', province: 'اصفهان', bio: 'تعمیرکار لوازم خانگی و تاسیسات. متخصص تعمیر یخچال، ماشین لباسشویی، کولر و سیستم‌های گرمایشی.', skillNames: ['لوله‌کشی ساختمان', 'سیم‌کشی ساختمان', 'نظافت عمومی'], rating: 4.2, projectCount: 1230 },
    { firstName: 'فرزانه', lastName: 'موحدی', displayName: 'فرزانه موحدی', email: 'farzaneh.m@email.com', phone: '09248001014', city: 'شیراز', province: 'فارس', bio: 'متخصص مهاجرت تحصیلی و کاری به کانادا، آلمان و استرالیا. مشاور مجرب با نرخ بالای موفقیت ویزا.', skillNames: ['مشاوره تحصیلی مهاجرت', 'مشاوره کاریابی مهاجرت', 'زبان انگلیسی'], rating: 4.8, projectCount: 89 },
    { firstName: 'رضا', lastName: 'کوهستانی', displayName: 'رضا کوهستانی', email: 'reza.k@email.com', phone: '09258001015', city: 'تبریز', province: 'آذربایجان شرقی', bio: 'طراح و توسعه‌دهنده وب با WordPress و ووکامرس. ساخت فروشگاه‌های آنلاین و وب‌سایت‌های شرکتی با بیش از ۵ سال تجربه.', skillNames: ['WordPress', 'HTML و CSS', 'React'], rating: 4.5, projectCount: 278 },
    { firstName: 'آرمان', lastName: 'حقیقت‌پور', displayName: 'آرمان حقیقت‌پور', email: 'arman.h@email.com', phone: '09268001016', city: 'تهران', province: 'تهران', bio: 'توسعه‌دهنده چت‌بات و سیستم‌های هوش مصنوعی. متخصص LLM و پردازش زبان طبیعی فارسی. پایه‌گذار استارتاپ AI-Lab.', skillNames: ['ChatGPT و LLM', 'NLP', 'Deep Learning'], rating: 4.7, projectCount: 45 },
    { firstName: 'نسرین', lastName: 'فلاح', displayName: 'نسرین فلاح', email: 'nasrin.f@email.com', phone: '09278001017', city: 'مشهد', province: 'خراسان رضوی', bio: 'عکاس حرفه‌ای و تولیدکننده محتوای تصویری. تخصص در عکاسی صنعتی، محصول و معماری. عضو انجمن عکاسان ایران.', skillNames: ['Photoshop', 'طراحی بنر حرفه‌ای', 'تولید محتوای شبکه‌های اجتماعی'], rating: 4.6, projectCount: 312 },
    { firstName: 'سینا', lastName: 'جلالی', displayName: 'سینا جلالی', email: 'sina.j@email.com', phone: '09288001018', city: 'کرج', province: 'البرز', bio: 'برقکار ساختمان با ۱۲ سال سابقه. متخصص سیم‌کشی، نصب سیستم‌های روشنایی، سیم‌کشی صنعتی و هوشمندسازی ساختمان.', skillNames: ['سیم‌کشی ساختمان', 'لوله‌کشی ساختمان'], rating: 4.4, projectCount: 456 },
    { firstName: 'لیلی', lastName: 'اکبرزاده', displayName: 'لیلی اکبرزاده', email: 'leily.a@email.com', phone: '09298001019', city: 'اهواز', province: 'خوزستان', bio: 'نویسنده و کپی‌رایتر حرفه‌ای. تخصص در نوشتن شعار تبلیغاتی، محتوای وب‌سایت و سناریو. کار با برندهای بزرگ.', skillNames: ['مقاله‌نویسی', 'سئو محتوایی', 'تولید محتوای شبکه‌های اجتماعی'], rating: 4.8, projectCount: 189 },
    { firstName: 'امید', lastName: 'قنبری', displayName: 'امید قنبری', email: 'omid.g@email.com', phone: '09308001020', city: 'رشت', province: 'گیلان', bio: 'متخصص تعمیرات خودرو دیزلی و بنزینی. مکانیک حرفه‌ای با گواهینامه‌های بین‌المللی BMW و Mercedes.', skillNames: ['تعمیر موتور خودرو'], rating: 4.3, projectCount: 678 },
    { firstName: 'پرستو', lastName: 'نجفی', displayName: 'پرستو نجفی', email: 'parasto.n@email.com', phone: '09318001021', city: 'قم', province: 'قم', bio: 'توسعه‌دهنده فرانت‌اند با Vue.js و Angular. متخصص ساخت داشبوردهای مدیریتی و پنل‌های کنترل.', skillNames: ['Vue.js', 'Angular', 'HTML و CSS'], rating: 4.5, projectCount: 167 },
    { firstName: 'کامران', lastName: 'یزدانی', displayName: 'کامران یزدانی', email: 'kamran.y@email.com', phone: '09328001022', city: 'کرمانشاه', province: 'کرمانشاه', bio: 'متخصص بینایی ماشین و پردازش تصویر. توسعه‌دهنده سیستم‌های تشخیص چهره و اشیاء. پژوهشگر دانشگاه رازی.', skillNames: ['Computer Vision', 'Deep Learning', 'Python'], rating: 4.7, projectCount: 56 },
  ];

  const newSpecialists = [];
  for (const spec of specialistsData) {
    try {
      const specialist = await prisma.user.create({
        data: {
          email: spec.email,
          password: simpleHash('123456'),
          phone: spec.phone,
          firstName: spec.firstName,
          lastName: spec.lastName,
          displayName: spec.displayName,
          bio: spec.bio,
          city: spec.city,
          province: spec.province,
          role: 'SPECIALIST',
          isVerified: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
        },
      });
      newSpecialists.push({ ...spec, user: specialist });

      // Create wallet
      await prisma.wallet.create({
        data: {
          userId: specialist.id,
          balance: Math.floor(Math.random() * 5000000) + 500000,
          frozen: Math.floor(Math.random() * 500000),
        },
      });

      // Connect skills
      for (const skillName of spec.skillNames) {
        const skill = skillMap.get(skillName);
        if (skill) {
          await prisma.userSkill.create({
            data: {
              userId: specialist.id,
              skillId: skill.id,
              level: Math.floor(Math.random() * 2) + 4,
              experience: `${Math.floor(Math.random() * 8) + 2} سال تجربه`,
            },
          });
        }
      }
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`  ⏭️  ${spec.displayName} قبلاً وجود دارد`);
      } else {
        console.log(`  ❌ خطا در ساخت ${spec.displayName}: ${e.message}`);
      }
    }
  }

  console.log(`  ✅ ${newSpecialists.length} متخصص جدید ساخته شد\n`);

  // ========== ساخت نظرات (برای امتیازدهی متخصصین) ==========
  console.log('⭐ ساخت نظرات برای متخصصین...');

  let reviewCount = 0;
  const allSpecialists = await prisma.user.findMany({ where: { role: 'SPECIALIST' } });
  const allClients = await prisma.user.findMany({ where: { role: 'CLIENT' } });

  if (allClients.length === 0) {
    // Create a few client users if none exist
    console.log('  ⚠️  کارفرمایی یافت نشد. ایجاد کارفرمایان موقت...');
    const tempClients = await Promise.all([
      prisma.user.create({
        data: { email: 'temp-client1@email.com', password: simpleHash('123456'), firstName: 'کاربر', lastName: 'نمونه یک', displayName: 'کاربر نمونه یک', role: 'CLIENT', isActive: true },
      }),
      prisma.user.create({
        data: { email: 'temp-client2@email.com', password: simpleHash('123456'), firstName: 'کاربر', lastName: 'نمونه دو', displayName: 'کاربر نمونه دو', role: 'CLIENT', isActive: true },
      }),
    ]);
    allClients.push(...tempClients);
  }

  // Create some service requests to attach reviews to
  const reviewRequests = [];
  for (const spec of newSpecialists) {
    const numReviews = Math.floor(Math.random() * 4) + 2; // 2-5 reviews per specialist
    for (let i = 0; i < numReviews; i++) {
      const client = allClients[Math.floor(Math.random() * allClients.length)];
      const rating = Math.floor(Math.random() * 2) + 4; // 4-5
      const comments = [
        'کار بسیار عالی و حرفه‌ای بود. تحویل به موقع و کیفیت بالا.',
        'خوشحالم که با ایشان کار کردم. دقیق و مسئولیت‌پذیر هستند.',
        'نتیجه کار فراتر از انتظارم بود. حتماً دوباره با ایشان همکاری می‌کنم.',
        'فرد متخصص و با تجربه‌ای هستند. پیشنهاد می‌کنم.',
        'پروژه طبق زمانبندی تحویل داده شد. کیفیت رضایت‌بخش.',
        'همکاری بسیار خوب و دوستانه. نتیجه نهایی عالی بود.',
        'از شروع تا پایان پروژه همراهی خوبی داشتند. ممنونم.',
        'حرفه‌ای، خلاق و خوش‌قول. بهترین انتخاب ممکن بود.',
      ];
      const comment = comments[Math.floor(Math.random() * comments.length)];

      try {
        // Create a completed service request for the review
        const catName = spec.skillNames[0] || 'خدمات';
        const cat = allCategories.find(c => c.name.includes(catName)) || allCategories[0];

        const request = await prisma.serviceRequest.create({
          data: {
            title: `درخواست خدمات ${spec.skillNames[0] || 'حرفه‌ای'} - ${spec.firstName}`,
            slug: generateSlug(`service-${spec.user.id}-${i}`),
            description: `درخواست خدمات تخصصی ${spec.skillNames[0] || ''} توسط ${client.firstName} ${client.lastName}. نیاز به انجام حرفه‌ای و به موقع پروژه.`,
            budgetMin: Math.floor(Math.random() * 20000000) + 2000000,
            budgetMax: Math.floor(Math.random() * 30000000) + 30000000,
            budgetType: 'FIXED',
            deliveryTime: Math.floor(Math.random() * 20) + 5,
            deliveryUnit: 'day',
            city: client.city || spec.city || 'تهران',
            province: client.province || spec.province || 'تهران',
            categoryId: cat.id,
            status: 'COMPLETED',
            tags: JSON.stringify([spec.skillNames[0] || 'خدمات', 'حرفه‌ای']),
            userId: client.id,
            isFeatured: false,
          },
        });
        reviewRequests.push(request);

        // Create an accepted proposal for this specialist
        const proposal = await prisma.proposal.create({
          data: {
            price: request.budgetMin || 5000000,
            deliveryTime: request.deliveryTime,
            deliveryUnit: request.deliveryUnit,
            message: `پیشنهاد حرفه‌ای برای انجام ${spec.skillNames[0] || 'خدمات'} مورد نظر.`,
            status: 'ACCEPTED',
            userId: spec.user.id,
            requestId: request.id,
          },
        });

        // Create the review
        await prisma.review.create({
          data: {
            rating,
            comment,
            authorId: client.id,
            userId: spec.user.id,
            requestId: request.id,
          },
        });

        reviewCount++;
      } catch (e: any) {
        console.log(`  ⚠️  خطا در ساخت نظر برای ${spec.displayName}: ${e.message}`);
      }
    }
  }

  console.log(`  ✅ ${reviewCount} نظر ساخته شد\n`);

  // ========== ساخت درخواست‌های خدمات جدید ==========
  const newRequestsCount = 32;
  console.log(`📋 ساخت ${newRequestsCount} درخواست خدمات جدید...`);

  const statuses: Array<'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'> = ['OPEN', 'OPEN', 'OPEN', 'OPEN', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'CLOSED'];
  const priorities: Array<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'> = ['LOW', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'HIGH', 'HIGH', 'URGENT'];
  const budgetTypes: Array<'FIXED' | 'HOURLY' | 'NEGOTIABLE'> = ['FIXED', 'FIXED', 'FIXED', 'HOURLY', 'NEGOTIABLE'];

  const serviceRequestsData = [
    // === خدمات خانگی ===
    {
      title: 'نظافت منزل ۱۵۰ متری در غرب تهران',
      description: 'منظور ما نظافت کامل یک آپارتمان ۱۵۰ متری شامل شستشوی کف، پنجره‌ها، آشپزخانه و حمام‌ها می‌باشد. نیاز به تجهیزات و مواد شوینده حرفه‌ای. ترجیحاً فردا انجام شود. خانه دو اتاق خواب و یک هال بزرگ دارد.',
      city: 'تهران', province: 'تهران', categoryName: 'خدمات خانگی', subcategoryName: 'نظافت',
      budgetMin: 800000, budgetMax: 1500000, deliveryTime: 1, priority: 'URGENT' as const,
      tags: ['نظافت', 'منزل', 'تمیزکاری', 'تهران'],
    },
    {
      title: 'تعمیر لوله‌کشی آشپزخانه و سرویس بهداشتی',
      description: 'لوله‌های آب آشپزخانه نشتی دارد و فشار آب کم شده است. همچنین فلاش توالت کار نمی‌کند و نیاز به تعویض قطعات دارد. لطفاً متخصصی با تجربه در تعمیرات لوله‌کشی ساختمان‌های قدیمی اعلام آمادگی کند. ساختمان حدود ۲۰ ساله است.',
      city: 'اصفهان', province: 'اصفهان', categoryName: 'خدمات خانگی', subcategoryName: 'تاسیسات',
      budgetMin: 2000000, budgetMax: 5000000, deliveryTime: 2, priority: 'HIGH' as const,
      tags: ['لوله‌کشی', 'تعمیر', 'نشتی آب', 'آشپزخانه'],
    },
    {
      title: 'سیم‌کشی برق ویلا در شمال',
      description: 'سیم‌کشی کامل یک ویلا دوبلکس در رامسر. نیاز به طراحی نقشه برق، نصب کلید و پریزها، سیم‌کشی روشنایی و تاسیسات برقی آشپزخانه. متراژ تقریبی ۳۰۰ متر مربع در دو طبقه. لوازم از طرف ما تأمین می‌شود.',
      city: 'تهران', province: 'تهران', categoryName: 'خدمات خانگی', subcategoryName: 'برقکاری',
      budgetMin: 15000000, budgetMax: 25000000, deliveryTime: 10, priority: 'NORMAL' as const,
      tags: ['سیم‌کشی', 'برق', 'ویلا', 'نصب'],
    },

    // === تعمیرات ===
    {
      title: 'تعمیر صفحه نمایش گوشی سامسونگ S24 Ultra',
      description: 'صفحه نمایش گوشی سامسونگ S24 Ultra شکسته است و لمس در نیمی از صفحه کار نمی‌کند. نیاز به تعویض صفحه نمایش اصلی و ال‌سی‌دی. لطفاً قطعه اصلی و اورجینال استفاده شود. ضمانت تعمیر لازم است.',
      city: 'تهران', province: 'تهران', categoryName: 'تعمیرات', subcategoryName: 'موبایل',
      budgetMin: 5000000, budgetMax: 8000000, deliveryTime: 1, priority: 'URGENT' as const,
      tags: ['موبایل', 'سامسونگ', 'تعمیر صفحه نمایش', 'اورجینال'],
    },
    {
      title: 'ارتقا رم و SSD لپ‌تاپ ایسوس ROG',
      description: 'می‌خواهم رم لپ‌تاپ ایسوس ROG Strix را از ۱۶ به ۳۲ گیگابایت ارتقا دهم و درایو SSD جدید ۱ ترابایتی NVMe اضافه کنم. سیستم عامل و برنامه‌ها باید روی SSD جدید نصب شوند. نیاز به انتقال داده‌ها هم هست.',
      city: 'شیراز', province: 'فارس', categoryName: 'تعمیرات', subcategoryName: 'لپ‌تاپ',
      budgetMin: 3000000, budgetMax: 6000000, deliveryTime: 1, priority: 'NORMAL' as const,
      tags: ['لپ‌تاپ', 'ایسوس', 'ارتقا', 'رم', 'SSD'],
    },
    {
      title: 'سرویس کامل خودرو پژو ۲۰۶ تیپ ۵',
      description: 'سرویس ۶۰ هزار کیلومتری پژو ۲۰۶ تیپ ۵ شامل تعویض روغن موتور، فیلترها، شمع، تسمه تایم و تنظیم موتور. همچنین لنت ترمز جلو نیاز به تعویض دارد. لطفاً قطعات اصلی استفاده شود.',
      city: 'تبریز', province: 'آذربایجان شرقی', categoryName: 'تعمیرات', subcategoryName: 'خودرو',
      budgetMin: 8000000, budgetMax: 15000000, deliveryTime: 2, priority: 'HIGH' as const,
      tags: ['خودرو', 'پژو', 'سرویس', 'تعویض روغن'],
    },

    // === طراحی و توسعه وب ===
    {
      title: 'طراحی سایت شخصی برای پزشک متخصص',
      description: 'طراحی وب‌سایت شخصی برای پزشک متخصص قلب شامل صفحه معرفی، رزرو نوبت آنلاین، بخش مقالات پزشکی، تماس با مطب و نظرات بیماران. طراحی باید مدرن و قابل اعتماد باشد و ریسپانسیو.',
      city: 'تهران', province: 'تهران', categoryName: 'طراحی و توسعه وب', subcategoryName: 'طراحی سایت',
      budgetMin: 10000000, budgetMax: 20000000, deliveryTime: 21, priority: 'HIGH' as const,
      tags: ['وب‌سایت', 'پزشک', 'رزرو نوبت', 'طراحی'],
    },
    {
      title: 'توسعه پنل مدیریت فروشگاه اینترنتی',
      description: 'توسعه داشبورد مدیریت فروشگاه اینترنتی با امکانات: مدیریت محصولات، سفارشات، مشتریان، تخفیف‌ها، گزارش فروش و آمار بازدید. فرانت‌اند با React و بک‌اند با Node.js.',
      city: 'کرج', province: 'البرز', categoryName: 'طراحی و توسعه وب', subcategoryName: 'فرانت‌اند',
      budgetMin: 25000000, budgetMax: 40000000, deliveryTime: 45, priority: 'NORMAL' as const,
      tags: ['پنل مدیریت', 'فروشگاه', 'React', 'Node.js'],
    },
    {
      title: 'طراحی سایت آموزشگاه زبان با وردپرس',
      description: 'طراحی وب‌سایت آموزشگاه زبان انگلیسی با وردپرس شامل: صفحه اصلی، دوره‌های آموزشی، ثبت‌نام آنلاین، مقالات آموزشی، گالری تصاویر و تماس با ما. نیاز به پشتیبانی فارسی کامل.',
      city: 'مشهد', province: 'خراسان رضوی', categoryName: 'طراحی و توسعه وب', subcategoryName: 'طراحی سایت',
      budgetMin: 8000000, budgetMax: 15000000, deliveryTime: 14, priority: 'NORMAL' as const,
      tags: ['وردپرس', 'آموزشگاه', 'زبان', 'ثبت‌نام'],
    },

    // === اپلیکیشن موبایل ===
    {
      title: 'توسعه اپلیکیشن فیتنس و تمرین ورزشی',
      description: 'توسعه اپلیکیشن اندروید و iOS برای ورزش و تناسب اندام شامل: برنامه تمرینی شخصی‌سازی شده، ردیابی کالری و ورزش، ویدیوهای آموزشی، سیستم رتبه‌بندی و اشتراک‌گذاری با دوستان.',
      city: 'تهران', province: 'تهران', categoryName: 'اپلیکیشن موبایل', subcategoryName: 'فلاتر',
      budgetMin: 30000000, budgetMax: 50000000, deliveryTime: 60, priority: 'HIGH' as const,
      tags: ['اپلیکیشن', 'فیتنس', 'ورزش', 'فلاتر'],
    },
    {
      title: 'توسعه اپلیکیشن تاکسی آنلاین برای شهر اصفهان',
      description: 'توسعه اپلیکیشن تاکسی آنلاین اختصاصی برای شهر اصفهان شامل سمت مسافر و راننده. امکانات: نقشه بلادرنگ، محاسبه مسیر و هزینه، سیستم پرداخت، نظرات و امتیازدهی.',
      city: 'اصفهان', province: 'اصفهان', categoryName: 'اپلیکیشن موبایل', subcategoryName: 'اندروید',
      budgetMin: 40000000, budgetMax: 70000000, deliveryTime: 90, priority: 'NORMAL' as const,
      tags: ['تاکسی', 'اندروید', 'نقشه', 'پرداخت'],
    },

    // === تولید محتوا ===
    {
      title: 'نوشتن ۳۰ مقاله بلاگ برای سایت لوازم خانگی',
      description: 'تولید ۳۰ مقاله سئو محور برای وبلاگ فروشگاه لوازم خانگی. موضوعات: راهنمای خرید، مقایسه محصولات، نکات نگهداری و تعمیرات اولیه. هر مقاله حداقل ۱۲۰۰ کلمه.',
      city: 'تهران', province: 'تهران', categoryName: 'تولید محتوا', subcategoryName: 'نویسندگی',
      budgetMin: 15000000, budgetMax: 25000000, deliveryTime: 30, priority: 'NORMAL' as const,
      tags: ['مقاله', 'لوازم خانگی', 'سئو', 'بلاگ'],
    },
    {
      title: 'تولید محتوای اینستاگرام برای برند پوشاک',
      description: 'تولید محتوای یک‌ماهه صفحه اینستاگرام برند پوشاک زنانه شامل: ۳۰ پست، ۶۰ استوری، ۴ ریلز و کپشن‌های جذاب. استراتژی محتوایی و تقویم محتوا هم نیاز است.',
      city: 'شیراز', province: 'فارس', categoryName: 'تولید محتوا', subcategoryName: 'نویسندگی',
      budgetMin: 10000000, budgetMax: 18000000, deliveryTime: 30, priority: 'HIGH' as const,
      tags: ['اینستاگرام', 'پوشاک', 'محتوا', 'برند'],
    },
    {
      title: 'بهینه‌سازی سئو سایت حقوقی',
      description: 'سئو کامل سایت یک موسسه حقوقی شامل: سئو تکنیکال، بهینه‌سازی محتوا، لینک‌سازی، بهبود Core Web Vitals و رپورتاژ آگهی. هدف: ورود به صفحه اول گوگل برای ۱۵ کلمه کلیدی.',
      city: 'تهران', province: 'تهران', categoryName: 'تولید محتوا', subcategoryName: 'سئو',
      budgetMin: 20000000, budgetMax: 35000000, deliveryTime: 90, priority: 'NORMAL' as const,
      tags: ['سئو', 'حقوقی', 'گوگل', 'لینک‌سازی'],
    },
    {
      title: 'ترجمه ۵۰ صفحه متون حقوقی از انگلیسی به فارسی',
      description: 'ترجمه تخصصی ۵۰ صفحه متون حقوقی شامل قراردادها، نظرات مشورتی و اسناد حقوقی از انگلیسی به فارسی. نیاز به دقت بالا و آشنایی با اصطلاحات حقوقی بین‌المللی.',
      city: 'قم', province: 'قم', categoryName: 'تولید محتوا', subcategoryName: 'ترجمه',
      budgetMin: 10000000, budgetMax: 18000000, deliveryTime: 14, priority: 'HIGH' as const,
      tags: ['ترجمه', 'حقوقی', 'انگلیسی', 'تخصصی'],
    },

    // === طراحی گرافیک ===
    {
      title: 'طراحی لوگو برای برند قهوه تخصصی',
      description: 'طراحی لوگو و هویت بصری برای یک کافه قهوه تخصصی جدید. سبک مورد نظر: مینیمال، مدرن و گرم. نیاز به ۳ طرح اولیه و ۲ مرحله اصلاح. تحویل فایل‌های لایه‌بندی شده.',
      city: 'تبریز', province: 'آذربایجان شرقی', categoryName: 'طراحی گرافیک', subcategoryName: 'لوگو',
      budgetMin: 5000000, budgetMax: 12000000, deliveryTime: 10, priority: 'NORMAL' as const,
      tags: ['لوگو', 'قهوه', 'کافه', 'هویت بصری'],
    },
    {
      title: 'طراحی UI اپلیکیشن سفر و گردشگری',
      description: 'طراحی کامل رابط کاربری اپلیکیشن گردشگری شامل: صفحه اصلی، جستجوی هتل و پرواز، صفحه مقصد، رزرو آنلاین، پروفایل کاربر و نظرات. طراحی باید الهام گرفته از فرهنگ ایرانی باشد.',
      city: 'اصفهان', province: 'اصفهان', categoryName: 'طراحی گرافیک', subcategoryName: 'UI/UX',
      budgetMin: 15000000, budgetMax: 25000000, deliveryTime: 25, priority: 'HIGH' as const,
      tags: ['UI/UX', 'گردشگری', 'اپلیکیشن', 'Figma'],
    },
    {
      title: 'طراحی ۱۰ بنر تبلیغاتی برای کمپین نوروزی',
      description: 'طراحی ۱۰ بنر تبلیغاتی حرفه‌ای برای کمپین فروش نوروزی فروشگاه اینترنایی. ابعاد مختلف: استوری، پست، وب‌سایت و بیلبورد. تم رنگی: سبز و قرمز نوروزی.',
      city: 'تهران', province: 'تهران', categoryName: 'طراحی گرافیک', subcategoryName: 'بنر',
      budgetMin: 8000000, budgetMax: 15000000, deliveryTime: 7, priority: 'URGENT' as const,
      tags: ['بنر', 'نوروز', 'تبلیغات', 'فروشگاه'],
    },

    // === مشاوره و آموزش ===
    {
      title: 'مشاوره مهاجرت تحصیلی به کانادا',
      description: 'نیاز به مشاوره کامل برای مهاجرت تحصیلی به کانادا. شرایط: مدرک کارشناسی ارشد مهندسی کامپیوتر، معدل ۱۸، آیلتس ۶.۵. می‌خواهم در حوزه هوش مصنوعی ادامه تحصیل دهم.',
      city: 'تهران', province: 'تهران', categoryName: 'مشاوره و آموزش', subcategoryName: 'مهاجرت',
      budgetMin: 5000000, budgetMax: 10000000, deliveryTime: 30, priority: 'NORMAL' as const,
      tags: ['مهاجرت', 'کانادا', 'تحصیلی', 'هوش مصنوعی'],
    },
    {
      title: 'آموزش خصوصی ریاضی کنکور - دوره فشرده',
      description: 'نیاز به معلم خصوصی ریاضی برای دانش‌آموز سال آخر ریاضی‌فیزیک. دوره فشرده ۳ ماهه، هفته‌ای ۳ جلسه ۲ ساعته. تمرکز بر حل تست و تکنیک‌های کنکور. تدریس در منزل یا آنلاین.',
      city: 'کرمانشاه', province: 'کرمانشاه', categoryName: 'مشاوره و آموزش', subcategoryName: 'آموزش خصوصی',
      budgetMin: 10000000, budgetMax: 20000000, deliveryTime: 90, priority: 'HIGH' as const,
      tags: ['ریاضی', 'کنکور', 'آموزش خصوصی', 'فشرده'],
    },
    {
      title: 'مشاوره حقوقی دعاوی ملکی',
      description: 'نیاز به وکیل متخصص امور ملکی برای پیگیری دعوای ملکی مربوط به عدم تحویل آپارتمان پیش‌فروش. پرونده در مرحله اولیه دادگاه است. نیاز به بررسی قرارداد و ارائه لایحه دفاعیه.',
      city: 'مشهد', province: 'خراسان رضوی', categoryName: 'مشاوره و آموزش', subcategoryName: 'وکالت',
      budgetMin: 15000000, budgetMax: 30000000, deliveryTime: 60, priority: 'HIGH' as const,
      tags: ['وکالت', 'ملکی', 'دادگاه', 'پیش‌فروش'],
    },
    {
      title: 'آموزش زبان انگلیسی از مبتدی تا متوسط',
      description: 'آموزش زبان انگلیسی برای بزرگسال مبتدی. هدف رسیدن به سطح B1 در ۶ ماه. هفته‌ای ۳ جلسه آنلاین. نیاز به تقویت مکالمه، گرامر و لغات. تمرکز بر انگلیسی عمومی و تجاری.',
      city: 'اهواز', province: 'خوزستان', categoryName: 'مشاوره و آموزش', subcategoryName: 'آموزش خصوصی',
      budgetMin: 12000000, budgetMax: 20000000, deliveryTime: 180, priority: 'NORMAL' as const,
      tags: ['زبان انگلیسی', 'آموزش', 'آنلاین', 'مکالمه'],
    },

    // === هوش مصنوعی ===
    {
      title: 'توسعه سیستم تشخیص تقلب در تراکنش‌های مالی',
      description: 'توسعه سیستم هوش مصنوعی برای تشخیص تقلب در تراکنش‌های مالی بانک. سیستم باید بتواند الگوهای مشکوک را در لحظه تشخیص دهد. نیاز به مدل یادگیری ماشین با دقت بالا و API برای یکپارچه‌سازی.',
      city: 'تهران', province: 'تهران', categoryName: 'هوش مصنوعی', subcategoryName: 'یادگیری ماشین',
      budgetMin: 50000000, budgetMax: 100000000, deliveryTime: 90, priority: 'URGENT' as const,
      tags: ['هوش مصنوعی', 'تقلب', 'بانک', 'یادگیری ماشین'],
    },
    {
      title: 'توسعه چت‌بات فروشگاهی با پشتیبانی فارسی',
      description: 'توسعه چت‌بات هوشمند برای فروشگاه اینترنایی. امکانات: پاسخگویی سوالات متداول، پیشنهاد محصول، پیگیری سفارش و انتقال به پشتیبانی انسانی. باید زبان فارسی را به خوبی درک کند.',
      city: 'کرج', province: 'البرز', categoryName: 'هوش مصنوعی', subcategoryName: 'چت‌بات',
      budgetMin: 20000000, budgetMax: 40000000, deliveryTime: 45, priority: 'NORMAL' as const,
      tags: ['چت‌بات', 'فروشگاه', 'فارسی', 'هوش مصنوعی'],
    },
    {
      title: 'پیاده‌سازی سیستم OCR برای اسناد فارسی',
      description: 'پیاده‌سازی سیستم بینایی ماشین برای استخراج متن از اسناد فارسی شامل: کارت ملی، شناسنامه، قبض و فاکتور. نیاز به دقت بالای ۹۵ درصد و پشتیبانی از فونت‌های مختلف فارسی.',
      city: 'رشت', province: 'گیلان', categoryName: 'هوش مصنوعی', subcategoryName: 'پردازش تصویر',
      budgetMin: 30000000, budgetMax: 50000000, deliveryTime: 60, priority: 'NORMAL' as const,
      tags: ['OCR', 'فارسی', 'بینایی ماشین', 'پردازش تصویر'],
    },

    // === درخواست‌های بیشتر با تنوع بالا ===
    {
      title: 'تعمیر کولر گازی اسپلیت سامسونگ',
      description: 'کولر گازی اسپلیت سامسونگ ۲۴۰۰۰ خنک نمی‌کند و صدای غیرعادی دارد. نیاز به سرویس کامل، شارژ گاز و بررسی کمپرسور. دستگاه ۳ ساله است و هنوز گارانتی دارد.',
      city: 'اهواز', province: 'خوزستان', categoryName: 'تعمیرات', subcategoryName: 'خودرو',
      budgetMin: 2000000, budgetMax: 5000000, deliveryTime: 1, priority: 'URGENT' as const,
      tags: ['کولر', 'تعمیر', 'سامسونگ', 'سرویس'],
    },
    {
      title: 'طراحی و توسعه وب‌سایت کاریابی',
      description: 'طراحی وب‌سایت کاریابی آنلاین شامل: ثبت‌نام کارجو و کارفرما، جستجوی آگهی شغلی، ارسال رزومه، پنل مدیریت و سیستم اعلان. طراحی مدرن و سریع با پشتیبانی موبایل.',
      city: 'تهران', province: 'تهران', categoryName: 'طراحی و توسعه وب', subcategoryName: 'طراحی سایت',
      budgetMin: 20000000, budgetMax: 35000000, deliveryTime: 35, priority: 'NORMAL' as const,
      tags: ['کاریابی', 'استخدام', 'وب‌سایت', 'رزومه'],
    },
    {
      title: 'عکاسی صنعتی از محصولات شرکت',
      description: 'عکاسی حرفه‌ای از ۵۰ محصول شرکت لوازم خانگی برای استفاده در وب‌سایت و کاتالوگ. عکس‌ها باید با پس‌زمینه سفید، نورپردازی استودیویی و ویرایش حرفه‌ای باشند.',
      city: 'اصفهان', province: 'اصفهان', categoryName: 'طراحی گرافیک', subcategoryName: 'بنر',
      budgetMin: 15000000, budgetMax: 25000000, deliveryTime: 7, priority: 'NORMAL' as const,
      tags: ['عکاسی', 'صنعتی', 'محصول', 'استودیو'],
    },
    {
      title: 'توسعه اپلیکیشن یادگیری زبان با هوش مصنوعی',
      description: 'توسعه اپلیکیشن موبایل یادگیری زبان انگلیسی با قابلیت‌های: درس‌های تعاملی، تمرین مکالمه با هوش مصنوعی، آزمون، بازی‌نویسی و سیستم پاداش. ظاهر جذاب و کاربرپسند.',
      city: 'تهران', province: 'تهران', categoryName: 'اپلیکیشن موبایل', subcategoryName: 'فلاتر',
      budgetMin: 40000000, budgetMax: 70000000, deliveryTime: 75, priority: 'NORMAL' as const,
      tags: ['آموزش', 'زبان', 'هوش مصنوعی', 'فلاتر'],
    },
    {
      title: 'مشاوره سرمایه‌گذاری در استارتاپ',
      description: 'نیاز به مشاوره تخصصی برای سرمایه‌گذاری در یک استارتاپ فناوری‌محور. مبلغ سرمایه‌گذاری حدود ۵۰۰ میلیون تومان. نیاز به بررسی طرح توجیهی و پیش‌بینی مالی.',
      city: 'تهران', province: 'تهران', categoryName: 'مشاوره و آموزش', subcategoryName: 'وکالت',
      budgetMin: 5000000, budgetMax: 10000000, deliveryTime: 14, priority: 'LOW' as const,
      tags: ['مشاوره', 'سرمایه‌گذاری', 'استارتاپ', 'فناوری'],
    },
    {
      title: 'نقشه‌کشی و طراحی نما برای ساختمان مسکونی',
      description: 'طراحی معماری و نقشه‌کشی کامل یک ساختمان مسکونی ۵ واحدی در ۴ طبقه. شامل پلان طبقات، نما، سایت‌پلان و نمای داخلی. سبک مدرن و هماهنگ با بافت شهری.',
      city: 'شیراز', province: 'فارس', categoryName: 'طراحی گرافیک', subcategoryName: 'UI/UX',
      budgetMin: 30000000, budgetMax: 50000000, deliveryTime: 30, priority: 'HIGH' as const,
      tags: ['معماری', 'نقشه', 'نما', 'ساختمان'],
    },
    {
      title: 'نظافت و تنظیم حرفه‌ای باغ ویلا',
      description: 'نظافت کامل باغ ویلا ۵۰۰ متری شامل هرس درختان،清理 علف هرز، اصلاح چمن، آبیاری خودکار و چیدمان فضای سبز. باغ در شمال شهر واقع شده و قبلاً ۳ ماه رسیدگی نشده.',
      city: 'رشت', province: 'گیلان', categoryName: 'خدمات خانگی', subcategoryName: 'نظافت',
      budgetMin: 3000000, budgetMax: 8000000, deliveryTime: 3, priority: 'NORMAL' as const,
      tags: ['باغ', 'نظافت', 'فضای سبز', 'ویلا'],
    },
    {
      title: 'تولید ویدیو معرفی شرکت برای یوتیوب',
      description: 'تولید یک ویدیو حرفه‌ای ۳ دقیقه‌ای معرفی شرکت فناوری اطلاعات برای انتشار در یوتیوب و وب‌سایت. شامل فیلم‌برداری، تدوین، موسیقی متن و زیرنویس فارسی و انگلیسی.',
      city: 'تهران', province: 'تهران', categoryName: 'تولید محتوا', subcategoryName: 'نویسندگی',
      budgetMin: 20000000, budgetMax: 35000000, deliveryTime: 14, priority: 'HIGH' as const,
      tags: ['ویدیو', 'تدوین', 'معرفی', 'یوتیوب'],
    },
    {
      title: 'نصب و راه‌اندازی دوربین مداربسته منزل',
      description: 'نصب ۸ دوربین مداربسته در یک منزل مسکونی شامل: دوربین‌های بی‌سیم، دستگاه ضبط، هارد دیسک، کابل‌کشی و تنظیمات نرم‌افزاری. دسترسی از راه دور برای موبایل لازم است.',
      city: 'کرمانشاه', province: 'کرمانشاه', categoryName: 'خدمات خانگی', subcategoryName: 'برقکاری',
      budgetMin: 8000000, budgetMax: 15000000, deliveryTime: 2, priority: 'NORMAL' as const,
      tags: ['دوربین', 'مداربسته', 'نصب', 'امنیت'],
    },
    {
      title: 'توسعه سیستم مدیریت موجودی انبار',
      description: 'توسعه نرم‌افزار مدیریت موجودی انبار شامل: ثبت ورود و خروج کالا، گزارش موجودی، هشدار کمبود کالا، کدگذاری بارکد و اتصال به بارکدخوان. فرانت‌اند و بک‌اند کامل.',
      city: 'تهران', province: 'تهران', categoryName: 'طراحی و توسعه وب', subcategoryName: 'بک‌اند',
      budgetMin: 25000000, budgetMax: 45000000, deliveryTime: 40, priority: 'NORMAL' as const,
      tags: ['انبار', 'موجودی', 'مدیریت', 'نرم‌افزار'],
    },
  ];

  let createdRequests = 0;
  for (const req of serviceRequestsData) {
    try {
      const category = categoryMap.get(req.categoryName);
      if (!category) {
        console.log(`  ⚠️  دسته‌بندی "${req.categoryName}" یافت نشد`);
        continue;
      }

      const subcategory = req.subcategoryName
        ? allCategories.find(c => c.name === req.subcategoryName)
        : undefined;

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const budgetType = budgetTypes[Math.floor(Math.random() * budgetTypes.length)];

      const client = allClients[Math.floor(Math.random() * allClients.length)];
      if (!client) continue;

      await prisma.serviceRequest.create({
        data: {
          title: req.title,
          slug: generateSlug(req.title),
          description: req.description,
          budgetMin: req.budgetMin,
          budgetMax: req.budgetMax,
          budgetType,
          deliveryTime: req.deliveryTime,
          deliveryUnit: 'day',
          city: req.city,
          province: req.province,
          categoryId: category.id,
          subcategoryId: subcategory?.id,
          priority: req.priority,
          status,
          tags: JSON.stringify(req.tags),
          userId: client.id,
          isFeatured: req.priority === 'URGENT' || req.priority === 'HIGH',
        },
      });
      createdRequests++;
    } catch (e: any) {
      console.log(`  ⚠️  خطا در ساخت درخواست "${req.title}": ${e.message}`);
    }
  }

  console.log(`  ✅ ${createdRequests} درخواست خدمات جدید ساخته شد\n`);

  // ========== آمار نهایی ==========
  const finalSpecialists = await prisma.user.count({ where: { role: 'SPECIALIST' } });
  const finalRequests = await prisma.serviceRequest.count();
  const openRequests = await prisma.serviceRequest.count({ where: { status: 'OPEN' } });
  const totalReviews = await prisma.review.count();

  console.log('========== آمار نهایی ==========');
  console.log(`👥 مجموع متخصصین: ${finalSpecialists}`);
  console.log(`📋 مجموع درخواست‌ها: ${finalRequests}`);
  console.log(`🟢 درخواست‌های باز: ${openRequests}`);
  console.log(`⭐ مجموع نظرات: ${totalReviews}`);
  console.log('================================\n');
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
