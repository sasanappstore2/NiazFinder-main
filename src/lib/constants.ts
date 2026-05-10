import type { Category, SpecialistProfile, ServiceRequest, Review } from './types';

// ============ CATEGORIES ============
export const CATEGORIES: Category[] = [
  {
    id: '1', name: 'طراحی و توسعه وب', slug: 'web-design-development',
    icon: '💻', requestCount: 234, specialistCount: 89,
    children: [
      { id: '1-1', name: 'طراحی سایت', slug: 'website-design', icon: '🎨', requestCount: 120, specialistCount: 45 },
      { id: '1-2', name: 'توسعه فرانت‌اند', slug: 'frontend-development', icon: '⚛️', requestCount: 89, specialistCount: 34 },
      { id: '1-3', name: 'توسعه بک‌اند', slug: 'backend-development', icon: '🔧', requestCount: 67, specialistCount: 28 },
    ],
  },
  {
    id: '2', name: 'اپلیکیشن موبایل', slug: 'mobile-app',
    icon: '📱', requestCount: 178, specialistCount: 56,
    children: [
      { id: '2-1', name: 'اندروید', slug: 'android', icon: '🤖', requestCount: 89, specialistCount: 30 },
      { id: '2-2', name: 'iOS', slug: 'ios', icon: '🍎', requestCount: 56, specialistCount: 18 },
      { id: '2-3', name: 'فلاتر', slug: 'flutter', icon: '💙', requestCount: 33, specialistCount: 12 },
    ],
  },
  {
    id: '3', name: 'تولید محتوا', slug: 'content-creation',
    icon: '✍️', requestCount: 312, specialistCount: 145,
    children: [
      { id: '3-1', name: 'نویسندگی', slug: 'copywriting', icon: '📝', requestCount: 145, specialistCount: 67 },
      { id: '3-2', name: 'سئو', slug: 'seo', icon: '🔍', requestCount: 89, specialistCount: 45 },
      { id: '3-3', name: 'ترجمه', slug: 'translation', icon: '🌐', requestCount: 78, specialistCount: 33 },
    ],
  },
  {
    id: '4', name: 'طراحی گرافیک', slug: 'graphic-design',
    icon: '🎨', requestCount: 267, specialistCount: 98,
    children: [
      { id: '4-1', name: 'لوگو', slug: 'logo-design', icon: '✏️', requestCount: 134, specialistCount: 56 },
      { id: '4-2', name: 'UI/UX', slug: 'ui-ux-design', icon: '🎭', requestCount: 89, specialistCount: 34 },
      { id: '4-3', name: 'بنر و پوستر', slug: 'banner-poster', icon: '🖼️', requestCount: 44, specialistCount: 20 },
    ],
  },
  {
    id: '5', name: 'خدمات خانگی', slug: 'home-services',
    icon: '🏠', requestCount: 456, specialistCount: 234,
    children: [
      { id: '5-1', name: 'نظافت منزل', slug: 'cleaning', icon: '🧹', requestCount: 200, specialistCount: 100 },
      { id: '5-2', name: 'تاسیسات', slug: 'plumbing', icon: '🔧', requestCount: 156, specialistCount: 78 },
      { id: '5-3', name: 'برقکاری', slug: 'electrical', icon: '⚡', requestCount: 100, specialistCount: 56 },
    ],
  },
  {
    id: '6', name: 'تعمیرات', slug: 'repair-services',
    icon: '🔧', requestCount: 189, specialistCount: 87,
    children: [
      { id: '6-1', name: 'موبایل', slug: 'mobile-repair', icon: '📱', requestCount: 89, specialistCount: 45 },
      { id: '6-2', name: 'لپ‌تاپ', slug: 'laptop-repair', icon: '💻', requestCount: 56, specialistCount: 23 },
      { id: '6-3', name: 'خودرو', slug: 'car-repair', icon: '🚗', requestCount: 44, specialistCount: 19 },
    ],
  },
  {
    id: '7', name: 'مشاوره و آموزش', slug: 'consulting-education',
    icon: '🎓', requestCount: 145, specialistCount: 67,
    children: [
      { id: '7-1', name: 'مشاور مهاجرت', slug: 'immigration-consulting', icon: '✈️', requestCount: 56, specialistCount: 23 },
      { id: '7-2', name: 'آموزش خصوصی', slug: 'private-tutoring', icon: '📚', requestCount: 45, specialistCount: 22 },
      { id: '7-3', name: 'وکالت', slug: 'legal-services', icon: '⚖️', requestCount: 44, specialistCount: 22 },
    ],
  },
  {
    id: '8', name: 'هوش مصنوعی', slug: 'ai-services',
    icon: '🤖', requestCount: 89, specialistCount: 34,
    children: [
      { id: '8-1', name: 'چت‌بات', slug: 'chatbot', icon: '💬', requestCount: 34, specialistCount: 15 },
      { id: '8-2', name: 'پردازش تصویر', slug: 'image-processing', icon: '🖼️', requestCount: 28, specialistCount: 12 },
      { id: '8-3', name: 'یادگیری ماشین', slug: 'machine-learning', icon: '🧠', requestCount: 27, specialistCount: 10 },
    ],
  },
];

// ============ IRANIAN CITIES ============
export const CITIES = [
  'تهران', 'اصفهان', 'شیراز', 'تبریز', 'مشهد', 'اهواز', 'کرج', 'قم', 'کرمانشاه',
  'ارومیه', 'رشت', 'زاهدان', 'همدان', 'کرمان', 'یزد', 'اردبیل', 'بندرعباس',
  'اراک', 'سنندج', 'قزوین', 'زنجان', 'گرگان', 'ساری', 'بوشهر', 'بجنورد',
  'ایلام', 'لرستان', 'خوزستان', 'چهارمحال و بختیاری', 'سیستان و بلوچستان',
];

export const PROVINCES = [
  'تهران', 'اصفهان', 'فارس', 'آذربایجان شرقی', 'خراسان رضوی', 'خوزستان',
  'البرز', 'قم', 'کرمانشاه', 'آذربایجان غربی', 'گیلان', 'سیستان و بلوچستان',
  'همدان', 'کرمان', 'یزد', 'اردبیل', 'هرمزگان', 'مرکزی', 'کردستان', 'قزوین',
];

// ============ SPECIALISTS ============
export const MOCK_SPECIALISTS: SpecialistProfile[] = [
  {
    id: 's1', email: 'ali@email.com', firstName: 'علی', lastName: 'محمدی',
    displayName: 'علی محمدی', avatar: '/avatars/s1.jpg',
    bio: 'طراح و توسعه‌دهنده وب با بیش از ۸ سال تجربه در ساخت وبسایت‌ها و اپلیکیشن‌های مدرن',
    city: 'تهران', province: 'تهران', role: 'SPECIALIST',
    isVerified: true, isActive: true, online: true,
    rating: 4.9, projectCount: 127, completionRate: 98, responseRate: 95,
    skills: [{ name: 'React', level: 5 }, { name: 'Next.js', level: 5 }, { name: 'TypeScript', level: 4 }, { name: 'Node.js', level: 4 }],
    portfolios: [
      { id: 'p1', title: 'طراحی سایت فروشگاهی', description: 'طراحی و توسعه یک فروشگاه آنلاین مدرن', imageUrls: ['/portfolio/p1.jpg'], completedAt: '2024-01-15' },
      { id: 'p2', title: 'اپلیکیشن مدیریت پروژه', description: 'توسعه اپلیکیشن مدیریت پروژه با React', imageUrls: ['/portfolio/p2.jpg'], completedAt: '2024-03-20' },
    ],
    hourlyRate: 350000, minProjectPrice: 5000000, memberSince: '2020-06-15',
    responseTime: 'زیر ۱ ساعت', completedProjects: 127, createdAt: '2020-06-15',
  },
  {
    id: 's2', email: 'sara@email.com', firstName: 'سارا', lastName: 'احمدی',
    displayName: 'سارا احمدی', avatar: '/avatars/s2.jpg',
    bio: 'طراح گرافیک حرفه‌ای با تخصص در طراحی لوگو و هویت بصری برندها',
    city: 'اصفهان', province: 'اصفهان', role: 'SPECIALIST',
    isVerified: true, isActive: true, online: false,
    rating: 4.8, projectCount: 89, completionRate: 96, responseRate: 92,
    skills: [{ name: 'Photoshop', level: 5 }, { name: 'Illustrator', level: 5 }, { name: 'Figma', level: 4 }, { name: 'Logo Design', level: 5 }],
    portfolios: [
      { id: 'p3', title: 'طراحی لوگو شرکت فناوری', description: 'طراحی لوگو و هویت بصری', imageUrls: ['/portfolio/p3.jpg'], completedAt: '2024-02-10' },
    ],
    hourlyRate: 250000, minProjectPrice: 2000000, memberSince: '2021-03-20',
    responseTime: 'زیر ۲ ساعت', completedProjects: 89, createdAt: '2021-03-20',
  },
  {
    id: 's3', email: 'reza@email.com', firstName: 'رضا', lastName: 'کریمی',
    displayName: 'رضا کریمی', avatar: '/avatars/s3.jpg',
    bio: 'متخصص تعمیرات موبایل و لپ‌تاپ با بیش از ۱۰ سال تجربه',
    city: 'شیراز', province: 'فارس', role: 'SPECIALIST',
    isVerified: true, isActive: true, online: true,
    rating: 4.7, projectCount: 234, completionRate: 99, responseRate: 98,
    skills: [{ name: 'تعمیر موبایل', level: 5 }, { name: 'تعمیر لپ‌تاپ', level: 5 }, { name: 'تعویض صفحه نمایش', level: 5 }],
    portfolios: [],
    hourlyRate: 0, minProjectPrice: 500000, memberSince: '2019-01-10',
    responseTime: 'فوری', completedProjects: 234, createdAt: '2019-01-10',
  },
  {
    id: 's4', email: 'mina@email.com', firstName: 'مینا', lastName: 'حسینی',
    displayName: 'مینا حسینی', avatar: '/avatars/s4.jpg',
    bio: 'نویسنده و تولیدکننده محتوای حرفه‌ای با تخصص در سئو و بازاریابی محتوایی',
    city: 'تهران', province: 'تهران', role: 'SPECIALIST',
    isVerified: true, isActive: true, online: false,
    rating: 4.6, projectCount: 156, completionRate: 94, responseRate: 90,
    skills: [{ name: 'نویسندگی', level: 5 }, { name: 'سئو', level: 5 }, { name: 'بازاریابی محتوا', level: 4 }, { name: 'وردپرس', level: 4 }],
    portfolios: [
      { id: 'p4', title: 'استراتژی محتوایی استارتاپ', description: 'طراحی استراتژی محتوای کامل', imageUrls: ['/portfolio/p4.jpg'], completedAt: '2024-04-05' },
    ],
    hourlyRate: 200000, minProjectPrice: 1500000, memberSince: '2021-09-01',
    responseTime: 'زیر ۳ ساعت', completedProjects: 156, createdAt: '2021-09-01',
  },
  {
    id: 's5', email: 'hasan@email.com', firstName: 'حسن', lastName: 'نجفی',
    displayName: 'حسن نجفی', avatar: '/avatars/s5.jpg',
    bio: 'مهندس نرم‌افزار با تخصص در هوش مصنوعی و یادگیری ماشین',
    city: 'تبریز', province: 'آذربایجان شرقی', role: 'SPECIALIST',
    isVerified: true, isActive: true, online: true,
    rating: 4.9, projectCount: 45, completionRate: 100, responseRate: 88,
    skills: [{ name: 'Python', level: 5 }, { name: 'Machine Learning', level: 5 }, { name: 'TensorFlow', level: 4 }, { name: 'NLP', level: 4 }],
    portfolios: [
      { id: 'p5', title: 'سیستم تشخیص چهره', description: 'توسعه سیستم تشخیص چهره با AI', imageUrls: ['/portfolio/p5.jpg'], completedAt: '2024-05-20' },
    ],
    hourlyRate: 500000, minProjectPrice: 10000000, memberSince: '2022-01-15',
    responseTime: 'زیر ۴ ساعت', completedProjects: 45, createdAt: '2022-01-15',
  },
  {
    id: 's6', email: 'fatemeh@email.com', firstName: 'فاطمه', lastName: 'رضایی',
    displayName: 'فاطمه رضایی', avatar: '/avatars/s6.jpg',
    bio: 'مشاور حقوقی و وکیل پایه یک دادگستری با تخصص در حقوق تجاری',
    city: 'تهران', province: 'تهران', role: 'SPECIALIST',
    isVerified: true, isActive: true, online: false,
    rating: 4.8, projectCount: 67, completionRate: 100, responseRate: 85,
    skills: [{ name: 'حقوق تجاری', level: 5 }, { name: 'حقوق کار', level: 4 }, { name: 'مشاوره حقوقی', level: 5 }],
    portfolios: [],
    hourlyRate: 800000, minProjectPrice: 3000000, memberSince: '2020-11-01',
    responseTime: 'زیر ۲ ساعت', completedProjects: 67, createdAt: '2020-11-01',
  },
];

// ============ SERVICE REQUESTS ============
export const MOCK_REQUESTS: ServiceRequest[] = [
  {
    id: 'r1', title: 'طراحی سایت فروشگاهی آنلاین', slug: 'online-store-website-design',
    description: 'نیاز به طراحی یک سایت فروشگاهی حرفه‌ای با امکان مدیریت محصولات، سبد خرید، درگاه پرداخت و پنل مدیریت دارم. طراحی باید ریسپانسیو و سریع باشد.',
    budgetMin: 15000000, budgetMax: 30000000, budgetType: 'FIXED',
    deliveryTime: 30, deliveryUnit: 'day', city: 'تهران', province: 'تهران',
    categoryId: '1', categoryName: 'طراحی و توسعه وب', categoryIcon: '💻',
    priority: 'HIGH', status: 'OPEN', tags: ['فروشگاهی', 'ریسپانسیو', 'درگاه پرداخت'],
    viewCount: 234, proposalCount: 12,
    user: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '/avatars/u1.jpg', city: 'تهران', createdAt: '2024-01-15' },
    createdAt: '2024-06-10T10:30:00Z', updatedAt: '2024-06-10T10:30:00Z',
  },
  {
    id: 'r2', title: 'تعمیر گوشی سامسونگ S23', slug: 'samsung-s23-repair',
    description: 'صفحه نمایش گوشی سامسونگ S23 شکسته شده و نیاز به تعویض دارم. گوشی هم چنین داغ می‌کند و باتری آن زود خالی می‌شود.',
    budgetMin: 2000000, budgetMax: 4000000, budgetType: 'NEGOTIABLE',
    deliveryTime: 1, deliveryUnit: 'day', city: 'شیراز', province: 'فارس',
    categoryId: '6', categoryName: 'تعمیرات', categoryIcon: '🔧',
    priority: 'URGENT', status: 'OPEN', tags: ['سامسونگ', 'صفحه نمایش', 'باتری'],
    viewCount: 89, proposalCount: 5,
    user: { id: 'u2', firstName: 'زهرا', lastName: 'محمدی', avatar: '/avatars/u2.jpg', city: 'شیراز', createdAt: '2024-03-20' },
    createdAt: '2024-06-11T14:20:00Z', updatedAt: '2024-06-11T14:20:00Z',
  },
  {
    id: 'r3', title: 'تولید محتوای وبلاگ شرکت', slug: 'company-blog-content',
    description: 'برای وبلاگ شرکت خود نیاز به تولید ۲۰ مقاله سئو شده در حوزه فناوری اطلاعات دارم. هر مقاله باید بین ۱۵۰۰ تا ۲۰۰۰ کلمه باشد.',
    budgetMin: 8000000, budgetMax: 15000000, budgetType: 'FIXED',
    deliveryTime: 20, deliveryUnit: 'day', city: 'تهران', province: 'تهران',
    categoryId: '3', categoryName: 'تولید محتوا', categoryIcon: '✍️',
    priority: 'NORMAL', status: 'OPEN', tags: ['وبلاگ', 'سئو', 'فناوری', 'مقاله'],
    viewCount: 156, proposalCount: 8,
    user: { id: 'u3', firstName: 'امیر', lastName: 'رضایی', avatar: '/avatars/u3.jpg', city: 'تهران', createdAt: '2024-02-10' },
    createdAt: '2024-06-09T09:15:00Z', updatedAt: '2024-06-09T09:15:00Z',
  },
  {
    id: 'r4', title: 'طراحی لوگو و هویت بصری برند', slug: 'logo-brand-identity-design',
    description: 'برای استارتاپ جدیدم در حوزه فین‌تک نیاز به طراحی لوگو و هویت بصری کامل شامل کارت ویزیت، سربرگ و طرح شبکه‌های اجتماعی دارم.',
    budgetMin: 5000000, budgetMax: 10000000, budgetType: 'FIXED',
    deliveryTime: 14, deliveryUnit: 'day', city: 'اصفهان', province: 'اصفهان',
    categoryId: '4', categoryName: 'طراحی گرافیک', categoryIcon: '🎨',
    priority: 'NORMAL', status: 'OPEN', tags: ['لوگو', 'هویت بصری', 'فین‌تک'],
    viewCount: 198, proposalCount: 15,
    user: { id: 'u4', firstName: 'نرگس', lastName: 'کریمی', avatar: '/avatars/u4.jpg', city: 'اصفهان', createdAt: '2024-04-05' },
    createdAt: '2024-06-08T16:45:00Z', updatedAt: '2024-06-08T16:45:00Z',
  },
  {
    id: 'r5', title: 'ساخت اپلیکیشن مدیریت وظایف', slug: 'task-management-app',
    description: 'نیاز به ساخت یک اپلیکیشن موبایل مدیریت وظایف با قابلیت‌های: ایجاد تسک، دسته‌بندی، یادآوری، همکاری تیمی و همگام‌سازی ابری.',
    budgetMin: 25000000, budgetMax: 50000000, budgetType: 'FIXED',
    deliveryTime: 45, deliveryUnit: 'day', city: 'تهران', province: 'تهران',
    categoryId: '2', categoryName: 'اپلیکیشن موبایل', categoryIcon: '📱',
    priority: 'HIGH', status: 'OPEN', tags: ['موبایل', 'مدیریت وظایف', 'تیمی'],
    viewCount: 312, proposalCount: 7,
    user: { id: 'u5', firstName: 'حسین', lastName: 'نوری', avatar: '/avatars/u5.jpg', city: 'تهران', createdAt: '2024-01-20' },
    createdAt: '2024-06-07T11:00:00Z', updatedAt: '2024-06-07T11:00:00Z',
  },
  {
    id: 'r6', title: 'نظافت منزل ۳ خوابه', slug: 'apartment-cleaning',
    description: 'منزل ما ۳ خوابه و حدود ۱۲۰ متر است. نیاز به نظافت کامل شامل شستشوی کف، نظافت آشپزخانه و حمام داریم.',
    budgetMin: 1500000, budgetMax: 2500000, budgetType: 'FIXED',
    deliveryTime: 1, deliveryUnit: 'day', city: 'تهران', province: 'تهران',
    categoryId: '5', categoryName: 'خدمات خانگی', categoryIcon: '🏠',
    priority: 'NORMAL', status: 'OPEN', tags: ['نظافت', 'منزل', 'تمیزکاری'],
    viewCount: 67, proposalCount: 20,
    user: { id: 'u6', firstName: 'لیلا', lastName: 'عباسی', avatar: '/avatars/u6.jpg', city: 'تهران', createdAt: '2024-05-10' },
    createdAt: '2024-06-12T08:30:00Z', updatedAt: '2024-06-12T08:30:00Z',
  },
  {
    id: 'r7', title: 'مشاوره مهاجرت به کانادا', slug: 'canada-immigration-consulting',
    description: 'نیاز به مشاوره کامل برای مهاجرت به کانادا از طریق برنامه Express Entry دارم. لطفاً شرایط و مراحل را توضیح دهید.',
    budgetMin: 5000000, budgetMax: 10000000, budgetType: 'HOURLY',
    deliveryTime: 7, deliveryUnit: 'day', city: 'تهران', province: 'تهران',
    categoryId: '7', categoryName: 'مشاوره و آموزش', categoryIcon: '🎓',
    priority: 'NORMAL', status: 'OPEN', tags: ['مهاجرت', 'کانادا', 'Express Entry'],
    viewCount: 145, proposalCount: 6,
    user: { id: 'u7', firstName: 'پویا', lastName: 'فرهادی', avatar: '/avatars/u7.jpg', city: 'تهران', createdAt: '2024-02-28' },
    createdAt: '2024-06-06T13:20:00Z', updatedAt: '2024-06-06T13:20:00Z',
  },
  {
    id: 'r8', title: 'توسعه چت‌بات هوشمند', slug: 'smart-chatbot-development',
    description: 'برای وبسایت شرکت نیاز به یک چت‌بات هوشمند دارم که بتواند به سوالات متداول مشتریان پاسخ دهد و فرم‌های سفارش را مدیریت کند.',
    budgetMin: 20000000, budgetMax: 40000000, budgetType: 'FIXED',
    deliveryTime: 30, deliveryUnit: 'day', city: 'تبریز', province: 'آذربایجان شرقی',
    categoryId: '8', categoryName: 'هوش مصنوعی', categoryIcon: '🤖',
    priority: 'HIGH', status: 'OPEN', tags: ['چت‌بات', 'هوش مصنوعی', 'پشتیبانی'],
    viewCount: 201, proposalCount: 4,
    user: { id: 'u8', firstName: 'سمیرا', lastName: 'صادقی', avatar: '/avatars/u8.jpg', city: 'تبریز', createdAt: '2024-03-15' },
    createdAt: '2024-06-05T10:00:00Z', updatedAt: '2024-06-05T10:00:00Z',
  },
];

// ============ REVIEWS ============
export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rv1', rating: 5,
    comment: 'کار فوق‌العاده‌ای بود! سایت دقیقاً مطابق با سلیقه من طراحی شد و سرعت اجرای پروژه هم عالی بود.',
    author: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '/avatars/u1.jpg' },
    createdAt: '2024-05-15T10:00:00Z',
  },
  {
    id: 'rv2', rating: 5,
    comment: 'لوگویی که طراحی شد بسیار حرفه‌ای و خلاقانه بود. کاملاً راضی هستم.',
    author: { id: 'u4', firstName: 'نرگس', lastName: 'کریمی', avatar: '/avatars/u4.jpg' },
    createdAt: '2024-05-10T14:30:00Z',
  },
  {
    id: 'rv3', rating: 4,
    comment: 'تعمیر گوشی بسیار سریع و با کیفیت انجام شد. قیمت هم منصفانه بود.',
    author: { id: 'u2', firstName: 'زهرا', lastName: 'محمدی', avatar: '/avatars/u2.jpg' },
    createdAt: '2024-04-28T09:15:00Z',
  },
  {
    id: 'rv4', rating: 5,
    comment: 'مقالاتی که نوشته شد بسیار حرفه‌ای و سئو شده بودند. ترافیک سایت ما خیلی افزایش پیدا کرد.',
    author: { id: 'u3', firstName: 'امیر', lastName: 'رضایی', avatar: '/avatars/u3.jpg' },
    createdAt: '2024-04-20T16:45:00Z',
  },
  {
    id: 'rv5', rating: 4,
    comment: 'مشاوره حقوقی بسیار مفیدی دریافت کردم. آقای رضایی بسیار مسلط و حرفه‌ای هستند.',
    author: { id: 'u7', firstName: 'پویا', lastName: 'فرهادی', avatar: '/avatars/u7.jpg' },
    createdAt: '2024-04-15T11:20:00Z',
  },
  {
    id: 'rv6', rating: 5,
    comment: 'اپلیکیشنی که ساختند بسیار کاربردی و باکیفیت بود. تیم فنی همیشه در دسترس بودند.',
    author: { id: 'u5', firstName: 'حسین', lastName: 'نوری', avatar: '/avatars/u5.jpg' },
    createdAt: '2024-04-10T13:00:00Z',
  },
];

// ============ BUDGET LABELS ============
export const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return `${(price / 1000000).toLocaleString('fa-IR')} میلیون تومان`;
  }
  return `${price.toLocaleString('fa-IR')} تومان`;
};

export const formatBudgetRange = (min?: number, max?: number): string => {
  if (min && max) return `${formatPrice(min)} - ${formatPrice(max)}`;
  if (min) return `از ${formatPrice(min)}`;
  if (max) return `تا ${formatPrice(max)}`;
  return 'توافقی';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    OPEN: 'باز',
    IN_PROGRESS: 'در حال انجام',
    CLOSED: 'بسته شده',
    COMPLETED: 'تکمیل شده',
    CANCELLED: 'لغو شده',
    PENDING: 'در انتظار',
    ACCEPTED: 'پذیرفته شده',
    REJECTED: 'رد شده',
    WITHDRAWN: 'بازگشتی',
  };
  return labels[status] || status;
};

export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    LOW: 'کم',
    NORMAL: 'عادی',
    HIGH: 'زیاد',
    URGENT: 'فوری',
  };
  return labels[priority] || priority;
};

export const getBudgetTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    FIXED: 'ثابت',
    HOURLY: 'ساعتی',
    NEGOTIABLE: 'توافقی',
  };
  return labels[type] || type;
};

export const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'لحظاتی پیش';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه پیش`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعت پیش`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} روز پیش`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} هفته پیش`;
  return `${Math.floor(seconds / 2592000)} ماه پیش`;
};

// ============ SITE INFO ============
export const SITE_NAME = 'نیاز فایندر';
export const SITE_DESCRIPTION = 'نیاز خود را ثبت کنید، بهترین متخصص‌ها را پیدا کنید';
export const SITE_URL = 'https://needfinder.ir';

// ============ FAQ DATA ============
export const FAQ_DATA = [
  {
    question: 'نیاز فایندر چیست؟',
    answer: 'نیاز فایندر یک پلتفرم هوشمند برای ثبت نیاز و پیدا کردن بهترین متخصص‌ها در هر حوزه‌ای است. شما نیاز خود را ثبت می‌کنید و متخصص‌های مرتبط به شما پیشنهاد می‌دهند.',
  },
  {
    question: 'چگونه نیاز خود را ثبت کنم؟',
    answer: 'کافیست ثبت‌نام کنید، روی دکمه «ثبت نیاز جدید» کلیک کنید، جزئیات نیاز خود را وارد کنید و منتظر پیشنهاد متخصص‌ها باشید.',
  },
  {
    question: 'آیا استفاده از پلتفرم رایگان است؟',
    answer: 'ثبت نیاز و جستجوی متخصص‌ها کاملاً رایگان است. پلتفرم فقط در صورت انجام معامله، کمیسیون جزئی دریافت می‌کند.',
  },
  {
    question: 'چگونه متخصص‌ها را اعتبارسنجی می‌کنید؟',
    answer: 'ما سیستم جامعی برای احراز هویت متخصص‌ها داریم شامل بررسی مدارک، نمونه کارها، نظرات کاربران قبلی و سیستم امتیازدهی.',
  },
  {
    question: 'آیا پرداخت امن است؟',
    answer: 'بله! ما سیستم پرداخت امن با کیف پول دیجیتال داریم. مبلغ تا زمان رضایت شما از کار نزد ما نگهداری می‌شود.',
  },
  {
    question: 'اگر از کار متخصص راضی نباشم چه کار کنم؟',
    answer: 'می‌توانید از طریق سیستم داوری ما موضوع را مطرح کنید. تیم پشتیبانی ما به صورت بی‌طرف بررسی کرده و بهترین راه‌حل را ارائه می‌دهد.',
  },
];
