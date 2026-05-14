import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Data cleaned\n');

  // ============ CATEGORIES ============
  console.log('📂 Creating categories...');
  
  const categoriesData = [
    { name: 'طراحی و توسعه وب', slug: 'web-design-development', icon: '💻', description: 'طراحی سایت، فرانت‌اند و بک‌اند', order: 1, children: [
      { name: 'طراحی سایت', slug: 'website-design', icon: '🎨', order: 1 },
      { name: 'توسعه فرانت‌اند', slug: 'frontend-development', icon: '⚛️', order: 2 },
      { name: 'توسعه بک‌اند', slug: 'backend-development', icon: '🔧', order: 3 },
      { name: 'وردپرس', slug: 'wordpress', icon: '📝', order: 4 },
    ]},
    { name: 'اپلیکیشن موبایل', slug: 'mobile-app', icon: '📱', description: 'اندروید، iOS و فلاتر', order: 2, children: [
      { name: 'اندروید', slug: 'android', icon: '🤖', order: 1 },
      { name: 'iOS', slug: 'ios', icon: '🍎', order: 2 },
      { name: 'فلاتر', slug: 'flutter', icon: '💙', order: 3 },
      { name: 'ری‌اکت نیتیو', slug: 'react-native', icon: '⚛️', order: 4 },
    ]},
    { name: 'تولید محتوا', slug: 'content-creation', icon: '✍️', description: 'نویسندگی، سئو و ترجمه', order: 3, children: [
      { name: 'نویسندگی', slug: 'copywriting', icon: '📝', order: 1 },
      { name: 'سئو', slug: 'seo', icon: '🔍', order: 2 },
      { name: 'ترجمه', slug: 'translation', icon: '🌐', order: 3 },
      { name: 'تایپ و ویرایش', slug: 'typing-editing', icon: '📄', order: 4 },
    ]},
    { name: 'طراحی گرافیک', slug: 'graphic-design', icon: '🎨', description: 'لوگو، UI/UX، بنر و پوستر', order: 4, children: [
      { name: 'طراحی لوگو', slug: 'logo-design', icon: '✏️', order: 1 },
      { name: 'UI/UX', slug: 'ui-ux-design', icon: '🎭', order: 2 },
      { name: 'بنر و پوستر', slug: 'banner-poster', icon: '🖼️', order: 3 },
      { name: 'ویرایش عکس', slug: 'photo-editing', icon: '📸', order: 4 },
    ]},
    { name: 'خدمات خانگی', slug: 'home-services', icon: '🏠', description: 'نظافت، تاسیسات و برقکاری', order: 5, children: [
      { name: 'نظافت منزل', slug: 'cleaning', icon: '🧹', order: 1 },
      { name: 'تاسیسات', slug: 'plumbing', icon: '🔧', order: 2 },
      { name: 'برقکاری', slug: 'electrical', icon: '⚡', order: 3 },
      { name: 'نقاشی ساختمان', slug: 'painting', icon: '🎨', order: 4 },
    ]},
    { name: 'تعمیرات', slug: 'repair-services', icon: '🔧', description: 'موبایل، لپ‌تاپ و خودرو', order: 6, children: [
      { name: 'تعمیر موبایل', slug: 'mobile-repair', icon: '📱', order: 1 },
      { name: 'تعمیر لپ‌تاپ', slug: 'laptop-repair', icon: '💻', order: 2 },
      { name: 'تعمیر خودرو', slug: 'car-repair', icon: '🚗', order: 3 },
      { name: 'تعمیر لوازم خانگی', slug: 'appliance-repair', icon: '🏠', order: 4 },
    ]},
    { name: 'مشاوره و آموزش', slug: 'consulting-education', icon: '🎓', description: 'مشاوره مهاجرت، وکالت و آموزش', order: 7, children: [
      { name: 'مشاور مهاجرت', slug: 'immigration-consulting', icon: '✈️', order: 1 },
      { name: 'آموزش خصوصی', slug: 'private-tutoring', icon: '📚', order: 2 },
      { name: 'وکالت', slug: 'legal-services', icon: '⚖️', order: 3 },
      { name: 'مشاور مالیاتی', slug: 'tax-consulting', icon: '💰', order: 4 },
    ]},
    { name: 'هوش مصنوعی', slug: 'ai-services', icon: '🤖', description: 'چت‌بات، پردازش تصویر و یادگیری ماشین', order: 8, children: [
      { name: 'چت‌بات', slug: 'chatbot', icon: '💬', order: 1 },
      { name: 'پردازش تصویر', slug: 'image-processing', icon: '🖼️', order: 2 },
      { name: 'یادگیری ماشین', slug: 'machine-learning', icon: '🧠', order: 3 },
      { name: 'پردازش زبان طبیعی', slug: 'nlp', icon: '🗣️', order: 4 },
    ]},
    { name: 'بازاریابی دیجیتال', slug: 'digital-marketing', icon: '📢', description: 'تبلیغات، شبکه‌های اجتماعی و ایمیل مارکتینگ', order: 9, children: [
      { name: 'مدیریت شبکه‌های اجتماعی', slug: 'social-media', icon: '📱', order: 1 },
      { name: 'تبلیغات گوگل', slug: 'google-ads', icon: '🔍', order: 2 },
      { name: 'ایمیل مارکتینگ', slug: 'email-marketing', icon: '📧', order: 3 },
    ]},
    { name: 'موسیقی و صدا', slug: 'music-audio', icon: '🎵', description: 'آهنگسازی، میکس و مسترینگ', order: 10, children: [
      { name: 'آهنگسازی', slug: 'music-production', icon: '🎹', order: 1 },
      { name: 'میکس و مسترینگ', slug: 'mixing-mastering', icon: '🎧', order: 2 },
      { name: 'VO', slug: 'voice-over', icon: '🎤', order: 3 },
    ]},
    { name: 'ویدئو و انیمیشن', slug: 'video-animation', icon: '🎬', description: 'تدوین ویدئو، انیمیشن و موشن‌گرافیک', order: 11, children: [
      { name: 'تدوین ویدئو', slug: 'video-editing', icon: '🎬', order: 1 },
      { name: 'انیمیشن', slug: 'animation', icon: '🎞️', order: 2 },
      { name: 'موشن‌گرافیک', slug: 'motion-graphics', icon: '✨', order: 3 },
    ]},
    { name: 'حمل و نقل', slug: 'transportation', icon: '🚚', description: 'باربری، اسباب‌کشی و ارسال', order: 12, children: [
      { name: 'باربری', slug: 'shipping', icon: '📦', order: 1 },
      { name: 'اسباب‌کشی', slug: 'moving', icon: '🚛', order: 2 },
      { name: 'پیک و ارسال', slug: 'delivery', icon: '🛵', order: 3 },
    ]},
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categoriesData) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        order: cat.order,
      },
    });
    createdCategories[cat.slug] = parent.id;

    if (cat.children) {
      for (const child of cat.children) {
        await prisma.category.create({
          data: {
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            parentId: parent.id,
            order: child.order,
          },
        });
      }
    }
  }

  console.log(`✅ ${categoriesData.length} root categories + ${categoriesData.reduce((s, c) => s + (c.children?.length || 0), 0)} subcategories created\n`);

  // ============ SKILLS ============
  console.log('🎯 Creating skills...');

  const skillsData = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Django', 'Flask',
    'Vue.js', 'Angular', 'PHP', 'Laravel', 'WordPress', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Redis', 'Docker', 'Kubernetes', 'AWS', 'Figma', 'Photoshop', 'Illustrator',
    'After Effects', 'Premiere Pro', 'Java', 'Kotlin', 'Swift', 'Flutter', 'Dart',
    'React Native', 'TensorFlow', 'PyTorch', 'Selenium', 'Unity', 'Unreal Engine',
    'C++', 'C#', 'Go', 'Rust', 'Tailwind CSS', 'SASS', 'HTML/CSS', 'REST API',
    'GraphQL', 'Git', 'CI/CD', 'Linux', 'تعمیر موبایل', 'تعمیر لپ‌تاپ',
    'نویسندگی', 'سئو', 'ترجمه', 'وکالت', 'مشاور مالیاتی', 'برقکاری', 'تاسیسات',
  ];

  const usedSlugs = new Set<string>();
  for (const skillName of skillsData) {
    let slug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) slug = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    usedSlugs.add(slug);
    await prisma.skill.create({
      data: { name: skillName, slug },
    });
  }

  console.log(`✅ ${skillsData.length} skills created\n`);

  // ============ USERS ============
  console.log('👥 Creating users...');

  const password = await hashPassword('password123');

  const usersData = [
    // Admins
    { email: 'admin@needfinder.ir', password, firstName: 'مدیر', lastName: 'سیستم', role: 'SUPER_ADMIN' as const, phone: '09121234567', isVerified: true },
    { email: 'support@needfinder.ir', password, firstName: 'پشتیبانی', lastName: 'نیاز فایندر', role: 'ADMIN' as const, phone: '09121234568', isVerified: true },
    { email: 'moderator@needfinder.ir', password, firstName: 'ناظر', lastName: 'سایت', role: 'ADMIN' as const, isVerified: true },
    // Clients
    { email: 'ali@email.com', password, firstName: 'علی', lastName: 'محمدی', role: 'CLIENT' as const, phone: '09121111111', city: 'تهران', province: 'تهران', isVerified: true },
    { email: 'zahra@email.com', password, firstName: 'زهرا', lastName: 'حسینی', role: 'CLIENT' as const, phone: '09122222222', city: 'شیراز', province: 'فارس', isVerified: true },
    { email: 'amir@email.com', password, firstName: 'امیر', lastName: 'رضایی', role: 'CLIENT' as const, phone: '09123333333', city: 'اصفهان', province: 'اصفهان', isVerified: true },
    { email: 'narges@email.com', password, firstName: 'نرگس', lastName: 'کریمی', role: 'CLIENT' as const, phone: '09124444444', city: 'تبریز', province: 'آذربایجان شرقی', isVerified: true },
    // Specialists
    { email: 'sara@email.com', password, firstName: 'سارا', lastName: 'احمدی', role: 'SPECIALIST' as const, phone: '09125555555', city: 'اصفهان', province: 'اصفهان', isVerified: true, bio: 'طراح گرافیک حرفه‌ای با بیش از ۵ سال تجربه در طراحی لوگو و هویت بصری برندها', online: true },
    { email: 'reza@email.com', password, firstName: 'رضا', lastName: 'کریمی', role: 'SPECIALIST' as const, phone: '09126666666', city: 'شیراز', province: 'فارس', isVerified: true, bio: 'متخصص تعمیرات موبایل و لپ‌تاپ با بیش از ۱۰ سال تجربه', online: true },
    { email: 'mina@email.com', password, firstName: 'مینا', lastName: 'حسینی', role: 'SPECIALIST' as const, phone: '09127777777', city: 'تهران', province: 'تهران', isVerified: true, bio: 'نویسنده و تولیدکننده محتوای حرفه‌ای با تخصص در سئو', online: false },
    { email: 'hasan@email.com', password, firstName: 'حسن', lastName: 'نجفی', role: 'SPECIALIST' as const, phone: '09128888888', city: 'تبریز', province: 'آذربایجان شرقی', isVerified: true, bio: 'مهندس نرم‌افزار با تخصص در هوش مصنوعی و یادگیری ماشین', online: true },
    { email: 'fatemeh@email.com', password, firstName: 'فاطمه', lastName: 'رضایی', role: 'SPECIALIST' as const, phone: '09129999999', city: 'تهران', province: 'تهران', isVerified: true, bio: 'مشاور حقوقی و وکیل پایه یک دادگستری با تخصص در حقوق تجاری', online: false },
  ];

  const createdUsers: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: u.password,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: `${u.firstName} ${u.lastName}`,
        phone: u.phone || null,
        role: u.role,
        isVerified: u.isVerified,
        bio: u.bio || null,
        city: u.city || null,
        province: u.province || null,
        online: u.online ?? false,
      },
    });

    // Create wallet
    await prisma.wallet.create({ data: { userId: user.id } });

    createdUsers[u.email] = user;
  }

  console.log(`✅ ${usersData.length} users created\n`);

  // ============ USER SKILLS ============
  console.log('🔧 Assigning skills to specialists...');

  const skillAssignments: Record<string, { name: string; level: number }[]> = {
    'sara@email.com': [
      { name: 'Photoshop', level: 5 }, { name: 'Illustrator', level: 5 },
      { name: 'Figma', level: 4 }, { name: 'After Effects', level: 3 },
    ],
    'reza@email.com': [
      { name: 'تعمیر موبایل', level: 5 }, { name: 'تعمیر لپ‌تاپ', level: 5 },
    ],
    'mina@email.com': [
      { name: 'نویسندگی', level: 5 }, { name: 'سئو', level: 5 },
      { name: 'WordPress', level: 4 },
    ],
    'hasan@email.com': [
      { name: 'Python', level: 5 }, { name: 'TensorFlow', level: 4 },
      { name: 'React', level: 4 }, { name: 'Next.js', level: 4 },
    ],
    'fatemeh@email.com': [
      { name: 'وکالت', level: 5 }, { name: 'مشاور مالیاتی', level: 4 },
    ],
  };

  for (const [email, skills] of Object.entries(skillAssignments)) {
    const user = createdUsers[email];
    for (const skill of skills) {
      const skillRecord = await prisma.skill.findFirst({ where: { name: skill.name } });
      if (skillRecord) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skillRecord.id,
            level: skill.level,
          },
        });
      }
    }
  }

  console.log('✅ Skills assigned\n');

  // ============ SERVICE REQUESTS ============
  console.log('📋 Creating service requests...');

  const requestsData = [
    {
      title: 'طراحی سایت فروشگاهی آنلاین', categoryId: createdCategories['web-design-development'],
      description: 'نیاز به طراحی یک سایت فروشگاهی حرفه‌ای با امکان مدیریت محصولات، سبد خرید، درگاه پرداخت و پنل مدیریت دارم. طراحی باید ریسپانسیو و سریع باشد.',
      budgetMin: 15000000, budgetMax: 30000000, budgetType: 'FIXED',
      deliveryTime: 30, city: 'تهران', province: 'تهران', priority: 'HIGH',
      tags: ['فروشگاهی', 'ریسپانسیو', 'درگاه پرداخت'], isFeatured: true, userId: createdUsers['ali@email.com'].id,
    },
    {
      title: 'تعمیر گوشی سامسونگ S23', categoryId: createdCategories['repair-services'],
      description: 'صفحه نمایش گوشی سامسونگ S23 شکسته شده و نیاز به تعویض دارم. گوشی همچنین داغ می‌کند و باتری آن زود خالی می‌شود.',
      budgetMin: 2000000, budgetMax: 4000000, budgetType: 'NEGOTIABLE',
      deliveryTime: 1, city: 'شیراز', province: 'فارس', priority: 'URGENT',
      tags: ['سامسونگ', 'صفحه نمایش', 'باتری'], userId: createdUsers['zahra@email.com'].id,
    },
    {
      title: 'تولید محتوای وبلاگ شرکت', categoryId: createdCategories['content-creation'],
      description: 'برای وبلاگ شرکت خود نیاز به تولید ۲۰ مقاله سئو شده در حوزه فناوری اطلاعات دارم. هر مقاله باید بین ۱۵۰۰ تا ۲۰۰۰ کلمه باشد.',
      budgetMin: 8000000, budgetMax: 15000000, budgetType: 'FIXED',
      deliveryTime: 20, city: 'تهران', province: 'تهران', priority: 'NORMAL',
      tags: ['وبلاگ', 'سئو', 'فناوری'], isFeatured: true, userId: createdUsers['amir@email.com'].id,
    },
    {
      title: 'طراحی لوگو و هویت بصری برند', categoryId: createdCategories['graphic-design'],
      description: 'برای استارتاپ جدیدم در حوزه فین‌تک نیاز به طراحی لوگو و هویت بصری کامل شامل کارت ویزیت، سربرگ و طرح شبکه‌های اجتماعی دارم.',
      budgetMin: 5000000, budgetMax: 10000000, budgetType: 'FIXED',
      deliveryTime: 14, city: 'اصفهان', province: 'اصفهان', priority: 'NORMAL',
      tags: ['لوگو', 'هویت بصری', 'فین‌تک'], isFeatured: true, userId: createdUsers['narges@email.com'].id,
    },
    {
      title: 'ساخت اپلیکیشن مدیریت وظایف', categoryId: createdCategories['mobile-app'],
      description: 'نیاز به ساخت یک اپلیکیشن موبایل مدیریت وظایف با قابلیت‌های: ایجاد تسک، دسته‌بندی، یادآوری، همکاری تیمی و همگام‌سازی ابری.',
      budgetMin: 25000000, budgetMax: 50000000, budgetType: 'FIXED',
      deliveryTime: 45, city: 'تهران', province: 'تهران', priority: 'HIGH',
      tags: ['موبایل', 'مدیریت وظایف', 'تیمی'], userId: createdUsers['ali@email.com'].id,
    },
    {
      title: 'نظافت منزل ۳ خوابه', categoryId: createdCategories['home-services'],
      description: 'منزل ما ۳ خوابه و حدود ۱۲۰ متر است. نیاز به نظافت کامل شامل شستشوی کف، نظافت آشپزخانه و حمام داریم.',
      budgetMin: 1500000, budgetMax: 2500000, budgetType: 'FIXED',
      deliveryTime: 1, city: 'تهران', province: 'تهران', priority: 'NORMAL',
      tags: ['نظافت', 'منزل'], userId: createdUsers['zahra@email.com'].id,
    },
    {
      title: 'مشاوره مهاجرت به کانادا', categoryId: createdCategories['consulting-education'],
      description: 'نیاز به مشاوره کامل برای مهاجرت به کانادا از طریق برنامه Express Entry دارم. لطفاً شرایط و مراحل را توضیح دهید.',
      budgetMin: 5000000, budgetMax: 10000000, budgetType: 'HOURLY',
      deliveryTime: 7, city: 'تهران', province: 'تهران', priority: 'NORMAL',
      tags: ['مهاجرت', 'کانادا'], userId: createdUsers['amir@email.com'].id,
    },
    {
      title: 'توسعه چت‌بات هوشمند', categoryId: createdCategories['ai-services'],
      description: 'برای وبسایت شرکت نیاز به یک چت‌بات هوشمند دارم که بتواند به سوالات متداول مشتریان پاسخ دهد و فرم‌های سفارش را مدیریت کند.',
      budgetMin: 20000000, budgetMax: 40000000, budgetType: 'FIXED',
      deliveryTime: 30, city: 'تبریز', province: 'آذربایجان شرقی', priority: 'HIGH',
      tags: ['چت‌بات', 'هوش مصنوعی', 'پشتیبانی'], isFeatured: true, userId: createdUsers['narges@email.com'].id,
    },
    {
      title: 'طراحی رابط کاربری اپلیکیشن بانکی', categoryId: createdCategories['graphic-design'],
      description: 'نیاز به طراحی UI/UX کامل برای اپلیکیشن موبایل بانک با رعایت استانداردهای امنیتی و تجربه کاربری عالی.',
      budgetMin: 10000000, budgetMax: 20000000, budgetType: 'FIXED',
      deliveryTime: 21, city: 'تهران', province: 'تهران', priority: 'HIGH',
      tags: ['UI/UX', 'بانک', 'اپلیکیشن'], userId: createdUsers['ali@email.com'].id,
    },
    {
      title: 'تعمیر لپ‌تاپ ایسوس', categoryId: createdCategories['repair-services'],
      description: 'لپ‌تاپ ایسوس من روشن نمی‌شود. احتمالاً مشکل از مادربرد است. نیاز به بررسی و تعمیر دارم.',
      budgetMin: 3000000, budgetMax: 8000000, budgetType: 'NEGOTIABLE',
      deliveryTime: 3, city: 'شیراز', province: 'فارس', priority: 'URGENT',
      tags: ['لپ‌تاپ', 'ایسوس', 'مادربرد'], userId: createdUsers['zahra@email.com'].id,
    },
    {
      title: 'سئو و بهینه‌سازی سایت فروشگاهی', categoryId: createdCategories['digital-marketing'],
      description: 'سایت فروشگاهی ما نیاز به سئو کامل دارد. هدف: ورودی گوگل ارگانیک و افزایش فروش.',
      budgetMin: 5000000, budgetMax: 12000000, budgetType: 'MONTHLY',
      deliveryTime: 90, city: 'تهران', province: 'تهران', priority: 'NORMAL',
      tags: ['سئو', 'فروشگاهی', 'گوگل'], userId: createdUsers['amir@email.com'].id,
    },
    {
      title: 'تدوین ویدئو تبلیغاتی ۳۰ ثانیه‌ای', categoryId: createdCategories['video-animation'],
      description: 'برای معرفی محصول جدیدمان نیاز به یک ویدئو تبلیغاتی حرفه‌ای ۳۰ ثانیه‌ای دارم.',
      budgetMin: 8000000, budgetMax: 15000000, budgetType: 'FIXED',
      deliveryTime: 7, city: 'اصفهان', province: 'اصفهان', priority: 'NORMAL',
      tags: ['ویدئو', 'تبلیغاتی', 'موشن‌گرافیک'], userId: createdUsers['narges@email.com'].id,
    },
  ];

  const createdRequests: string[] = [];

  for (let i = 0; i < requestsData.length; i++) {
    const r = requestsData[i];
    const slug = `${r.title.replace(/\s+/g, '-').replace(/[^\u0600-\u06FFa-z0-9-]/g, '').toLowerCase()}-${i}`;
    const request = await prisma.serviceRequest.create({
      data: {
        title: r.title,
        slug,
        description: r.description,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        budgetType: r.budgetType as any,
        deliveryTime: r.deliveryTime,
        deliveryUnit: 'day',
        city: r.city,
        province: r.province,
        categoryId: r.categoryId,
        priority: r.priority as any,
        status: 'OPEN',
        tags: JSON.stringify(r.tags || []),
        isFeatured: r.isFeatured || false,
        viewCount: Math.floor(Math.random() * 300) + 10,
        userId: r.userId,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdRequests.push(request.id);
  }

  console.log(`✅ ${requestsData.length} service requests created\n`);

  // ============ PROPOSALS ============
  console.log('📝 Creating proposals...');

  const proposalsData = [
    { requestId: createdRequests[0], userId: createdUsers['hasan@email.com'].id, price: 25000000, deliveryTime: 25, message: 'با سلام. من بیش از ۵ سال تجربه در توسعه سایت‌های فروشگاهی با Next.js دارم. می‌توانم یک فروشگاه حرفه‌ای با پنل مدیریت، درگاه پرداخت و ریسپانسیو کامل برای شما بسازم. نمونه کارهایم در پروفایلم موجود است.' },
    { requestId: createdRequests[1], userId: createdUsers['reza@email.com'].id, price: 2500000, deliveryTime: 1, message: 'با سلام. تعویض صفحه نمایش سامسونگ S23 با قطعه اصلی انجام می‌شود. تعمیر باتری هم همزمان انجام می‌شود. ضمانت ۳ ماهه.' },
    { requestId: createdRequests[2], userId: createdUsers['mina@email.com'].id, price: 12000000, deliveryTime: 20, message: 'تولید ۲۰ مقاله سئو شده حرفه‌ای در حوزه فناوری اطلاعات. هر مقاله بین ۱۵۰۰ تا ۲۰۰۰ کلمه با تحقیق کامل کلمات کلیدی.' },
    { requestId: createdRequests[3], userId: createdUsers['sara@email.com'].id, price: 7500000, deliveryTime: 12, message: 'طراحی لوگو + کارت ویزیت + سربرگ + طرح شبکه‌های اجتماعی. ۳ طرح اولیه + ۲ بار اصلاح رایگان.' },
    { requestId: createdRequests[7], userId: createdUsers['hasan@email.com'].id, price: 30000000, deliveryTime: 35, message: 'توسعه چت‌بات هوشمند با Python و NLP. قابلیت یادگیری از مکالمات و بهبود پاسخ‌ها.' },
    { requestId: createdRequests[0], userId: createdUsers['sara@email.com'].id, price: 28000000, deliveryTime: 28, message: 'طراحی و توسعه فروشگاه آنلاین با تمرکز بر UI/UX و تجربه خرید عالی.' },
    { requestId: createdRequests[4], userId: createdUsers['hasan@email.com'].id, price: 35000000, deliveryTime: 40, message: 'ساخت اپلیکیشن مدیریت وظایف با Flutter برای اندروید و iOS با همگام‌سازی ابری.' },
    { requestId: createdRequests[6], userId: createdUsers['fatemeh@email.com'].id, price: 500000, deliveryTime: 1, message: 'مشاوره کامل مهاجرت به کانادا. بررسی شرایط و ارائه راهکارهای مناسب.' },
  ];

  for (const p of proposalsData) {
    await prisma.proposal.create({
      data: {
        price: p.price,
        deliveryTime: p.deliveryTime,
        deliveryUnit: 'day',
        message: p.message,
        userId: p.userId,
        requestId: p.requestId,
        status: 'PENDING',
      },
    });
    // Increment proposal count
    await prisma.serviceRequest.update({
      where: { id: p.requestId },
      data: { proposalCount: { increment: 1 } },
    });
  }

  console.log(`✅ ${proposalsData.length} proposals created\n`);

  // ============ REVIEWS ============
  console.log('⭐ Creating reviews...');

  const reviewsData = [
    { userId: createdUsers['sara@email.com'].id, authorId: createdUsers['narges@email.com'].id, rating: 5, qualityRating: 5, timingRating: 5, communicationRating: 4, professionalismRating: 5, comment: 'کار فوق‌العاده‌ای بود! لوگویی که طراحی شد بسیار حرفه‌ای و خلاقانه بود.', isRecommended: true },
    { userId: createdUsers['reza@email.com'].id, authorId: createdUsers['zahra@email.com'].id, rating: 5, qualityRating: 5, timingRating: 5, communicationRating: 5, professionalismRating: 5, comment: 'تعمیر گوشی بسیار سریع و با کیفیت انجام شد. قیمت هم منصفانه بود.', isRecommended: true },
    { userId: createdUsers['mina@email.com'].id, authorId: createdUsers['amir@email.com'].id, rating: 4, qualityRating: 4, timingRating: 4, communicationRating: 5, professionalismRating: 4, comment: 'مقالاتی که نوشته شد بسیار حرفه‌ای و سئو شده بودند.', isRecommended: true },
    { userId: createdUsers['hasan@email.com'].id, authorId: createdUsers['ali@email.com'].id, rating: 5, qualityRating: 5, timingRating: 4, communicationRating: 5, professionalismRating: 5, comment: 'توسعه چت‌بات عالی بود. کیفیت کار فوق‌العاده.', isRecommended: true },
    { userId: createdUsers['fatemeh@email.com'].id, authorId: createdUsers['amir@email.com'].id, rating: 4, qualityRating: 4, timingRating: 5, communicationRating: 5, professionalismRating: 4, comment: 'مشاوره حقوقی بسیار مفیدی دریافت کردم. بسیار مسلط و حرفه‌ای هستند.', isRecommended: true },
    { userId: createdUsers['sara@email.com'].id, authorId: createdUsers['ali@email.com'].id, rating: 5, qualityRating: 5, timingRating: 5, communicationRating: 5, professionalismRating: 5, comment: 'طراحی UI سایت فروشگاهی ما بسیار عالی و مدرن شد. کاملاً راضی هستیم.', isRecommended: true, pros: 'خلاقیت بالا در طراحی', cons: 'زمان تحویل کمی دیرتر از موعد بود' },
  ];

  for (const r of reviewsData) {
    await prisma.review.create({
      data: {
        userId: r.userId,
        authorId: r.authorId,
        requestId: createdRequests[0],
        rating: r.rating,
        qualityRating: r.qualityRating,
        timingRating: r.timingRating,
        communicationRating: r.communicationRating,
        professionalismRating: r.professionalismRating,
        comment: r.comment,
        pros: r.pros || null,
        cons: r.cons || null,
        isRecommended: r.isRecommended,
        isPublished: true,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`✅ ${reviewsData.length} reviews created\n`);

  // ============ CONVERSATIONS & MESSAGES ============
  console.log('💬 Creating conversations and messages...');

  const conversationsData = [
    { userId1: createdUsers['ali@email.com'].id, userId2: createdUsers['hasan@email.com'].id, requestId: createdRequests[0] },
    { userId1: createdUsers['zahra@email.com'].id, userId2: createdUsers['reza@email.com'].id, requestId: createdRequests[1] },
    { userId1: createdUsers['narges@email.com'].id, userId2: createdUsers['sara@email.com'].id, requestId: createdRequests[3] },
  ];

  const messagesTemplates = [
    ['سلام، وقت بخیر. درباره پروژه صحبت کنیم؟', 'سلام! بله، حتماً. چه سوالی دارید؟', 'می‌خواستم بدونم حدوداً چه زمانی می‌توانید شروع کنید؟', 'از هفته آینده می‌توانم شروع کنم.'],
    ['سلام، آیا تعمیر گوشی انجام می‌شود؟', 'بله، با کمال میل. لطفاً مدل گوشی را بفرمایید.', 'سامسونگ S23 - صفحه شکسته و باتری ضعیف', 'متوجه شدم. هزینه تعویض صفحه و باتری مجموعاً ۲.۵ میلیون تومان.'],
    ['سلام، من یک پروژه طراحی لوگو دارم', 'سلام! لطفاً جزئیات بیشتر بفرمایید', 'برای یک استارتاپ فین‌تک نیاز به لوگو و هویت بصری دارم', 'عالیه! من می‌توانم ۳ طرح اولیه در ۳ روز آماده کنم.'],
  ];

  for (let i = 0; i < conversationsData.length; i++) {
    const conv = conversationsData[i];
    const conversation = await prisma.conversation.create({
      data: {
        userId1: conv.userId1,
        userId2: conv.userId2,
        requestId: conv.requestId,
        lastMessage: messagesTemplates[i][messagesTemplates[i].length - 1],
        lastMessageAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Create messages
    for (let j = 0; j < messagesTemplates[i].length; j++) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: j % 2 === 0 ? conv.userId1 : conv.userId2,
          content: messagesTemplates[i][j],
          type: 'TEXT',
          isRead: j < messagesTemplates[i].length - 1,
          createdAt: new Date(Date.now() - (messagesTemplates[i].length - j) * 2 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log(`✅ ${conversationsData.length} conversations with messages created\n`);

  // ============ PORTFOLIOS ============
  console.log('🎨 Creating portfolios...');

  const portfoliosData = [
    { userId: createdUsers['sara@email.com'].id, title: 'طراحی لوگو شرکت فناوری آرمان', description: 'طراحی لوگو و هویت بصری کامل برای یک استارتاپ فناوری', completedAt: new Date('2024-01-15') },
    { userId: createdUsers['sara@email.com'].id, title: 'طراحی UI اپلیکیشن بانکداری', description: 'طراحی رابط کاربری اپلیکیشن موبایل بانک', completedAt: new Date('2024-03-20') },
    { userId: createdUsers['sara@email.com'].id, title: 'برندینگ رستوران زعفران', description: 'طراحی لوگو، منو، کارت ویزیت و بروشور', completedAt: new Date('2024-05-10') },
    { userId: createdUsers['hasan@email.com'].id, title: 'سیستم تشخیص چهره', description: 'توسعه سیستم تشخیص چهره با AI', completedAt: new Date('2024-02-10') },
    { userId: createdUsers['hasan@email.com'].id, title: 'چت‌بات پشتیبانی آنلاین', description: 'توسعه چت‌بات هوشمند برای پشتیبانی مشتریان', completedAt: new Date('2024-04-15') },
    { userId: createdUsers['mina@email.com'].id, title: 'استراتژی محتوایی استارتاپ', description: 'طراحی و اجرای استراتژی محتوای کامل', completedAt: new Date('2024-03-01') },
  ];

  for (const p of portfoliosData) {
    await prisma.portfolio.create({
      data: {
        userId: p.userId,
        title: p.title,
        description: p.description,
        completedAt: p.completedAt,
        isPublished: true,
      },
    });
  }

  console.log(`✅ ${portfoliosData.length} portfolios created\n`);

  // ============ WALLET TRANSACTIONS ============
  console.log('💰 Creating wallet transactions...');

  const walletUser = createdUsers['ali@email.com'];
  const wallet = await prisma.wallet.findUnique({ where: { userId: walletUser.id } });

  if (wallet) {
    const transactions = [
      { type: 'DEPOSIT', amount: 50000000, status: 'COMPLETED', description: 'واریز به کیف پول' },
      { type: 'PAYMENT', amount: 25000000, status: 'COMPLETED', description: 'پرداخت برای پروژه طراحی سایت' },
      { type: 'COMMISSION', amount: 1250000, status: 'COMPLETED', description: 'کمیسیون پلتفرم (۵٪)' },
      { type: 'DEPOSIT', amount: 20000000, status: 'COMPLETED', description: 'واریز به کیف پول' },
      { type: 'BONUS', amount: 100000, status: 'COMPLETED', description: 'پاداش دعوت از دوستان' },
    ];

    let balance = 0;
    for (const t of transactions) {
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          userId: walletUser.id,
          type: t.type as any,
          amount: t.amount,
          description: t.description,
          status: t.status as any,
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        },
      });
      if (t.type === 'DEPOSIT' || t.type === 'BONUS' || t.type === 'REFUND') balance += t.amount;
      if (t.type === 'PAYMENT' || t.type === 'WITHDRAW' || t.type === 'COMMISSION') balance -= t.amount;
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance },
    });
  }

  console.log('✅ Wallet transactions created\n');

  // ============ NOTIFICATIONS ============
  console.log('🔔 Creating notifications...');

  const notificationsData = [
    { userId: createdUsers['ali@email.com'].id, type: 'NEW_PROPOSAL', title: 'پیشنهاد جدید', message: 'حسن نجفی برای نیاز "طراحی سایت فروشگاهی آنلاین" پیشنهاد جدید ارسال کرد' },
    { userId: createdUsers['ali@email.com'].id, type: 'NEW_MESSAGE', title: 'پیام جدید', message: 'شما یک پیام جدید از حسن نجفی دریافت کردید' },
    { userId: createdUsers['zahra@email.com'].id, type: 'NEW_PROPOSAL', title: 'پیشنهاد جدید', message: 'رضا کریمی برای نیاز "تعمیر گوشی سامسونگ S23" پیشنهاد جدید ارسال کرد' },
    { userId: createdUsers['narges@email.com'].id, type: 'NEW_PROPOSAL', title: 'پیشنهاد جدید', message: 'سارا احمدی برای نیاز "طراحی لوگو و هویت بصری برند" پیشنهاد جدید ارسال کرد' },
    { userId: createdUsers['ali@email.com'].id, type: 'SYSTEM', title: 'خوش آمدید!', message: 'به نیاز فایندر خوش آمدید! پروفایل خود را تکمیل کنید.' },
    { userId: createdUsers['sara@email.com'].id, type: 'NEW_MESSAGE', title: 'پیام جدید', message: 'شما یک پیام جدید از نرگس کریمی دریافت کردید' },
    { userId: createdUsers['hasan@email.com'].id, type: 'PROPOSAL_ACCEPTED', title: 'پیشنهاد پذیرفته شد', message: 'پیشنهاد شما برای پروژه "توسعه چت‌بات هوشمند" پذیرفته شد' },
    { userId: createdUsers['amir@email.com'].id, type: 'SYSTEM', title: 'تکمیل پروفایل', message: 'لطفاً پروفایل خود را تکمیل کنید تا بتوانید نیاز ثبت کنید.' },
  ];

  for (let i = 0; i < notificationsData.length; i++) {
    await prisma.notification.create({
      data: {
        userId: notificationsData[i].userId,
        type: notificationsData[i].type,
        title: notificationsData[i].title,
        message: notificationsData[i].message,
        isRead: i < 3, // first 3 are read
        readAt: i < 3 ? new Date() : null,
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`✅ ${notificationsData.length} notifications created\n`);

  // ============ COUPONS ============
  console.log('🎟️ Creating coupons...');

  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME50', type: 'PERCENTAGE', value: 50, maxUses: 100, isActive: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { code: 'FIRST100', type: 'FIXED_AMOUNT', value: 100000, maxUses: 200, isActive: true, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      { code: 'VIP200', type: 'PERCENTAGE', value: 20, maxUses: 50, isActive: true },
    ],
  });

  console.log('✅ 3 coupons created\n');

  // ============ REFERRALS ============
  console.log('🔗 Creating referrals...');

  await prisma.referral.create({
    data: {
      referrerId: createdUsers['ali@email.com'].id,
      referredId: createdUsers['amir@email.com'].id,
      code: 'NF-ABC123',
      reward: 100000,
      isClaimed: false,
    },
  });

  await prisma.referral.create({
    data: {
      referrerId: createdUsers['ali@email.com'].id,
      referredId: createdUsers['narges@email.com'].id,
      code: 'NF-ABC123',
      reward: 100000,
      isClaimed: true,
    },
  });

  console.log('✅ Referrals created\n');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${categoriesData.length} categories (+ ${categoriesData.reduce((s, c) => s + (c.children?.length || 0), 0)} subcategories)`);
  console.log(`  - ${skillsData.length} skills`);
  console.log(`  - ${usersData.length} users`);
  console.log(`  - ${requestsData.length} service requests`);
  console.log(`  - ${proposalsData.length} proposals`);
  console.log(`  - ${reviewsData.length} reviews`);
  console.log(`  - ${conversationsData.length} conversations`);
  console.log(`  - ${portfoliosData.length} portfolios`);
  console.log(`  - ${notificationsData.length} notifications`);
  console.log('  - 3 coupons');
  console.log('  - 2 referrals');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
