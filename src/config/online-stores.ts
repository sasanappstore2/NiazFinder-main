/**
 * Online store / e-commerce vertical taxonomy for Iran market.
 * Product-domain categories (Digikala/Basalam-style), NOT a directory of shop brands.
 * See docs/ONLINE_STORE_CATEGORIES.md
 */

export interface OnlineStoreCategory {
  slug: string;
  parentSlug: string | null;
  title: string;
  englishTitle?: string;
  depth: 0 | 1;
  sortOrder?: number;
}

export const ONLINE_STORE_CATEGORIES: readonly OnlineStoreCategory[] = [
  // ── online-fashion
  { slug: 'online-fashion', parentSlug: null, title: 'مد و پوشاک', englishTitle: 'Fashion', depth: 0, sortOrder: 100 },
  { slug: 'online-clothing-apparel', parentSlug: 'online-fashion', title: 'پوشاک و لباس', englishTitle: 'Clothing', depth: 1, sortOrder: 101 },
  { slug: 'online-footwear', parentSlug: 'online-fashion', title: 'کفش', englishTitle: 'Footwear', depth: 1, sortOrder: 102 },
  { slug: 'online-traditional-clothing', parentSlug: 'online-fashion', title: 'لباس محلی و مجلسی', englishTitle: 'Traditional Clothing', depth: 1, sortOrder: 103 },
  { slug: 'online-hijab-modest-fashion', parentSlug: 'online-fashion', title: 'حجاب و پوشش اسلامی', englishTitle: 'Modest Fashion', depth: 1, sortOrder: 104 },
  { slug: 'online-bags-leather', parentSlug: 'online-fashion', title: 'کیف و چرم', englishTitle: 'Bags & Leather', depth: 1, sortOrder: 105 },
  { slug: 'online-fashion-accessories', parentSlug: 'online-fashion', title: 'اکسسوری مد', englishTitle: 'Fashion Accessories', depth: 1, sortOrder: 106 },

  // ── online-jewelry-watches
  { slug: 'online-jewelry-watches', parentSlug: null, title: 'زیورآلات و ساعت', englishTitle: 'Jewelry & Watches', depth: 0, sortOrder: 200 },
  { slug: 'online-costume-jewelry', parentSlug: 'online-jewelry-watches', title: 'بدلیجات و اکسسوری', englishTitle: 'Costume Jewelry', depth: 1, sortOrder: 201 },
  { slug: 'online-gold-silver-jewelry', parentSlug: 'online-jewelry-watches', title: 'طلا و نقره', englishTitle: 'Gold & Silver', depth: 1, sortOrder: 202 },
  { slug: 'online-watches', parentSlug: 'online-jewelry-watches', title: 'ساعت', englishTitle: 'Watches', depth: 1, sortOrder: 203 },
  { slug: 'online-gems-stones', parentSlug: 'online-jewelry-watches', title: 'سنگ قیمتی و عقیق', englishTitle: 'Gems', depth: 1, sortOrder: 204 },

  // ── online-digital
  { slug: 'online-digital', parentSlug: null, title: 'کالای دیجیتال', englishTitle: 'Digital', depth: 0, sortOrder: 300 },
  { slug: 'online-mobile-tablet', parentSlug: 'online-digital', title: 'موبایل و تبلت', englishTitle: 'Mobile & Tablet', depth: 1, sortOrder: 301 },
  { slug: 'online-laptop-computer', parentSlug: 'online-digital', title: 'لپ‌تاپ و رایانه', englishTitle: 'Laptop & PC', depth: 1, sortOrder: 302 },
  { slug: 'online-computer-parts', parentSlug: 'online-digital', title: 'قطعات و لوازم جانبی کامپیوتر', englishTitle: 'PC Parts', depth: 1, sortOrder: 303 },
  { slug: 'online-gaming-console', parentSlug: 'online-digital', title: 'کنسول و بازی', englishTitle: 'Gaming', depth: 1, sortOrder: 304 },
  { slug: 'online-audio-video', parentSlug: 'online-digital', title: 'صوتی و تصویری', englishTitle: 'Audio Video', depth: 1, sortOrder: 305 },
  { slug: 'online-camera-photography', parentSlug: 'online-digital', title: 'دوربین و عکاسی', englishTitle: 'Camera', depth: 1, sortOrder: 306 },
  { slug: 'online-digital-accessories', parentSlug: 'online-digital', title: 'لوازم جانبی دیجیتال', englishTitle: 'Digital Accessories', depth: 1, sortOrder: 307 },
  { slug: 'online-smart-home-iot', parentSlug: 'online-digital', title: 'خانه هوشمند و IoT', englishTitle: 'Smart Home', depth: 1, sortOrder: 308 },

  // ── online-home-kitchen
  { slug: 'online-home-kitchen', parentSlug: null, title: 'خانه و آشپزخانه', englishTitle: 'Home & Kitchen', depth: 0, sortOrder: 400 },
  { slug: 'online-home-appliances', parentSlug: 'online-home-kitchen', title: 'لوازم خانگی برقی', englishTitle: 'Home Appliances', depth: 1, sortOrder: 401 },
  { slug: 'online-small-kitchen-appliances', parentSlug: 'online-home-kitchen', title: 'لوازم کوچک آشپزخانه', englishTitle: 'Small Appliances', depth: 1, sortOrder: 402 },
  { slug: 'online-cookware-tableware', parentSlug: 'online-home-kitchen', title: 'ظروف و سرویس آشپزخانه', englishTitle: 'Cookware', depth: 1, sortOrder: 403 },
  { slug: 'online-home-decor', parentSlug: 'online-home-kitchen', title: 'دکوراسیون منزل', englishTitle: 'Home Decor', depth: 1, sortOrder: 404 },
  { slug: 'online-furniture', parentSlug: 'online-home-kitchen', title: 'مبلمان', englishTitle: 'Furniture', depth: 1, sortOrder: 405 },
  { slug: 'online-bedding-mattress', parentSlug: 'online-home-kitchen', title: 'روتختی و تشک', englishTitle: 'Bedding', depth: 1, sortOrder: 406 },
  { slug: 'online-carpet-rug', parentSlug: 'online-home-kitchen', title: 'فرش و گلیم', englishTitle: 'Carpet & Rug', depth: 1, sortOrder: 407 },
  { slug: 'online-lighting', parentSlug: 'online-home-kitchen', title: 'روشنایی', englishTitle: 'Lighting', depth: 1, sortOrder: 408 },
  { slug: 'online-curtains-textiles', parentSlug: 'online-home-kitchen', title: 'پرده و منسوجات', englishTitle: 'Textiles', depth: 1, sortOrder: 409 },

  // ── online-beauty-health
  { slug: 'online-beauty-health', parentSlug: null, title: 'زیبایی و سلامت', englishTitle: 'Beauty & Health', depth: 0, sortOrder: 500 },
  { slug: 'online-cosmetics-skincare', parentSlug: 'online-beauty-health', title: 'آرایشی و مراقبت پوست', englishTitle: 'Cosmetics', depth: 1, sortOrder: 501 },
  { slug: 'online-perfume-fragrance', parentSlug: 'online-beauty-health', title: 'عطر و ادکلن', englishTitle: 'Perfume', depth: 1, sortOrder: 502 },
  { slug: 'online-haircare-salon-supplies', parentSlug: 'online-beauty-health', title: 'مراقبت و لوازم مو', englishTitle: 'Haircare', depth: 1, sortOrder: 503 },
  { slug: 'online-personal-hygiene', parentSlug: 'online-beauty-health', title: 'بهداشت شخصی', englishTitle: 'Hygiene', depth: 1, sortOrder: 504 },
  { slug: 'online-health-supplements', parentSlug: 'online-beauty-health', title: 'مکمل و تغذیه سلامت', englishTitle: 'Supplements', depth: 1, sortOrder: 505 },
  { slug: 'online-medical-equipment-consumer', parentSlug: 'online-beauty-health', title: 'تجهیزات پزشکی مصرفی', englishTitle: 'Medical Supplies', depth: 1, sortOrder: 506 },
  { slug: 'online-herbal-traditional', parentSlug: 'online-beauty-health', title: 'عطاری و گیاهی', englishTitle: 'Herbal', depth: 1, sortOrder: 507 },

  // ── online-food-grocery
  { slug: 'online-food-grocery', parentSlug: null, title: 'خوراکی و سوپرمارکت', englishTitle: 'Food & Grocery', depth: 0, sortOrder: 600 },
  { slug: 'online-supermarket-grocery', parentSlug: 'online-food-grocery', title: 'سوپرمارکت آنلاین', englishTitle: 'Supermarket', depth: 1, sortOrder: 601 },
  { slug: 'online-fresh-produce', parentSlug: 'online-food-grocery', title: 'میوه و سبزی تازه', englishTitle: 'Fresh Produce', depth: 1, sortOrder: 602 },
  { slug: 'online-dried-nuts-saffron', parentSlug: 'online-food-grocery', title: 'خشکبار، آجیل و زعفران', englishTitle: 'Nuts & Saffron', depth: 1, sortOrder: 603 },
  { slug: 'online-dairy-bakery', parentSlug: 'online-food-grocery', title: 'لبنیات و شیرینی', englishTitle: 'Dairy & Bakery', depth: 1, sortOrder: 604 },
  { slug: 'online-organic-health-food', parentSlug: 'online-food-grocery', title: 'ارگانیک و سلامت‌محور', englishTitle: 'Organic Food', depth: 1, sortOrder: 605 },
  { slug: 'online-beverages', parentSlug: 'online-food-grocery', title: 'نوشیدنی', englishTitle: 'Beverages', depth: 1, sortOrder: 606 },

  // ── online-kids-baby
  { slug: 'online-kids-baby', parentSlug: null, title: 'کودک و نوزاد', englishTitle: 'Kids & Baby', depth: 0, sortOrder: 700 },
  { slug: 'online-baby-gear', parentSlug: 'online-kids-baby', title: 'سیسمونی و تجهیزات نوزاد', englishTitle: 'Baby Gear', depth: 1, sortOrder: 701 },
  { slug: 'online-toys', parentSlug: 'online-kids-baby', title: 'اسباب‌بازی', englishTitle: 'Toys', depth: 1, sortOrder: 702 },
  { slug: 'online-kids-clothing', parentSlug: 'online-kids-baby', title: 'پوشاک کودک', englishTitle: 'Kids Clothing', depth: 1, sortOrder: 703 },
  { slug: 'online-maternity', parentSlug: 'online-kids-baby', title: 'بارداری و مادر', englishTitle: 'Maternity', depth: 1, sortOrder: 704 },

  // ── online-sports-travel
  { slug: 'online-sports-travel', parentSlug: null, title: 'ورزش و سفر', englishTitle: 'Sports & Travel', depth: 0, sortOrder: 800 },
  { slug: 'online-sporting-goods', parentSlug: 'online-sports-travel', title: 'لوازم ورزشی', englishTitle: 'Sporting Goods', depth: 1, sortOrder: 801 },
  { slug: 'online-outdoor-camping', parentSlug: 'online-sports-travel', title: 'کمپینگ و طبیعت', englishTitle: 'Outdoor', depth: 1, sortOrder: 802 },
  { slug: 'online-travel-luggage', parentSlug: 'online-sports-travel', title: 'چمدان و لوازم سفر', englishTitle: 'Luggage', depth: 1, sortOrder: 803 },
  { slug: 'online-bicycle-scooter', parentSlug: 'online-sports-travel', title: 'دوچرخه و اسکوتر', englishTitle: 'Bicycle', depth: 1, sortOrder: 804 },

  // ── online-auto-motor
  { slug: 'online-auto-motor', parentSlug: null, title: 'خودرو و موتور', englishTitle: 'Auto & Motor', depth: 0, sortOrder: 900 },
  { slug: 'online-auto-parts', parentSlug: 'online-auto-motor', title: 'قطعات خودرو', englishTitle: 'Auto Parts', depth: 1, sortOrder: 901 },
  { slug: 'online-motorcycle-parts', parentSlug: 'online-auto-motor', title: 'قطعات موتورسیکلت', englishTitle: 'Motorcycle Parts', depth: 1, sortOrder: 902 },
  { slug: 'online-car-accessories', parentSlug: 'online-auto-motor', title: 'لوازم جانبی خودرو', englishTitle: 'Car Accessories', depth: 1, sortOrder: 903 },
  { slug: 'online-tires', parentSlug: 'online-auto-motor', title: 'لاستیک و رینگ', englishTitle: 'Tires', depth: 1, sortOrder: 904 },

  // ── online-books-culture
  { slug: 'online-books-culture', parentSlug: null, title: 'کتاب و فرهنگ', englishTitle: 'Books & Culture', depth: 0, sortOrder: 1000 },
  { slug: 'online-books', parentSlug: 'online-books-culture', title: 'کتاب', englishTitle: 'Books', depth: 1, sortOrder: 1001 },
  { slug: 'online-stationery', parentSlug: 'online-books-culture', title: 'لوازم‌التحریر', englishTitle: 'Stationery', depth: 1, sortOrder: 1002 },
  { slug: 'online-music-instruments', parentSlug: 'online-books-culture', title: 'آلات موسیقی', englishTitle: 'Music Instruments', depth: 1, sortOrder: 1003 },
  { slug: 'online-art-supplies', parentSlug: 'online-books-culture', title: 'لوازم هنری', englishTitle: 'Art Supplies', depth: 1, sortOrder: 1004 },

  // ── online-pets-plants
  { slug: 'online-pets-plants', parentSlug: null, title: 'حیوانات و گیاه', englishTitle: 'Pets & Plants', depth: 0, sortOrder: 1100 },
  { slug: 'online-pet-supplies', parentSlug: 'online-pets-plants', title: 'لوازم حیوانات خانگی', englishTitle: 'Pet Supplies', depth: 1, sortOrder: 1101 },
  { slug: 'online-plants-seeds', parentSlug: 'online-pets-plants', title: 'گل و گیاه و بذر', englishTitle: 'Plants', depth: 1, sortOrder: 1102 },
  { slug: 'online-garden-tools', parentSlug: 'online-pets-plants', title: 'ابزار باغبانی', englishTitle: 'Garden Tools', depth: 1, sortOrder: 1103 },

  // ── online-gifts-crafts
  { slug: 'online-gifts-crafts', parentSlug: null, title: 'هدایا و صنایع دستی', englishTitle: 'Gifts & Crafts', depth: 0, sortOrder: 1200 },
  { slug: 'online-handicrafts-traditional', parentSlug: 'online-gifts-crafts', title: 'صنایع دستی و سنتی', englishTitle: 'Handicrafts', depth: 1, sortOrder: 1201 },
  { slug: 'online-art-collectibles', parentSlug: 'online-gifts-crafts', title: 'هنری و کلکسیونی', englishTitle: 'Collectibles', depth: 1, sortOrder: 1202 },
  { slug: 'online-flowers-gifts', parentSlug: 'online-gifts-crafts', title: 'گل و هدیه', englishTitle: 'Flowers & Gifts', depth: 1, sortOrder: 1203 },
  { slug: 'online-religious-cultural', parentSlug: 'online-gifts-crafts', title: 'مذهبی و فرهنگی', englishTitle: 'Religious', depth: 1, sortOrder: 1204 },
  { slug: 'online-party-supplies', parentSlug: 'online-gifts-crafts', title: 'جشن و مهمانی', englishTitle: 'Party Supplies', depth: 1, sortOrder: 1205 },

  // ── online-office-b2b
  { slug: 'online-office-b2b', parentSlug: null, title: 'اداری و B2B', englishTitle: 'Office & B2B', depth: 0, sortOrder: 1300 },
  { slug: 'online-office-supplies', parentSlug: 'online-office-b2b', title: 'لوازم اداری', englishTitle: 'Office Supplies', depth: 1, sortOrder: 1301 },
  { slug: 'online-industrial-tools', parentSlug: 'online-office-b2b', title: 'ابزار صنعتی', englishTitle: 'Industrial Tools', depth: 1, sortOrder: 1302 },
  { slug: 'online-building-materials', parentSlug: 'online-office-b2b', title: 'مصالح ساختمانی', englishTitle: 'Building Materials', depth: 1, sortOrder: 1303 },
  { slug: 'online-packaging-printing', parentSlug: 'online-office-b2b', title: 'بسته‌بندی و چاپ', englishTitle: 'Packaging', depth: 1, sortOrder: 1304 },

  // ── online-specialty
  { slug: 'online-specialty', parentSlug: null, title: 'تخصصی', englishTitle: 'Specialty', depth: 0, sortOrder: 1400 },
  { slug: 'online-eyewear-optical', parentSlug: 'online-specialty', title: 'عینک و اپتیک', englishTitle: 'Eyewear', depth: 1, sortOrder: 1401 },
  { slug: 'online-security-cctv', parentSlug: 'online-specialty', title: 'دوربین مداربسته و امنیت', englishTitle: 'Security', depth: 1, sortOrder: 1402 },
  { slug: 'online-solar-energy-products', parentSlug: 'online-specialty', title: 'پنل و تجهیزات خورشیدی', englishTitle: 'Solar', depth: 1, sortOrder: 1403 },
  { slug: 'online-sewing-fabric', parentSlug: 'online-specialty', title: 'پارچه و خرازی', englishTitle: 'Fabric', depth: 1, sortOrder: 1404 },
  { slug: 'online-tailoring-supplies', parentSlug: 'online-specialty', title: 'لوازم خیاطی', englishTitle: 'Tailoring Supplies', depth: 1, sortOrder: 1405 },

  // ── online-platform
  { slug: 'online-platform', parentSlug: null, title: 'مدل فروش آنلاین', englishTitle: 'Sales Model', depth: 0, sortOrder: 1500 },
  { slug: 'online-multi-category-marketplace', parentSlug: 'online-platform', title: 'فروشنده چنددسته‌ای (مارکت‌پلیس)', englishTitle: 'Marketplace Seller', depth: 1, sortOrder: 1501 },
  { slug: 'online-single-brand-store', parentSlug: 'online-platform', title: 'فروشگاه تک‌برند', englishTitle: 'Single Brand', depth: 1, sortOrder: 1502 },
  { slug: 'online-dropshipping', parentSlug: 'online-platform', title: 'دراپ‌شیپینگ', englishTitle: 'Dropshipping', depth: 1, sortOrder: 1503 },
  { slug: 'online-social-commerce', parentSlug: 'online-platform', title: 'فروش اینستاگرام و تلگرام', englishTitle: 'Social Commerce', depth: 1, sortOrder: 1504 },
  { slug: 'online-b2b-wholesale', parentSlug: 'online-platform', title: 'عمده‌فروشی B2B', englishTitle: 'B2B Wholesale', depth: 1, sortOrder: 1505 },
] as const;

const BY_SLUG: ReadonlyMap<string, OnlineStoreCategory> = new Map(
  ONLINE_STORE_CATEGORIES.map((c) => [c.slug, c])
);

const ALL_SLUGS: ReadonlySet<string> = new Set(ONLINE_STORE_CATEGORIES.map((c) => c.slug));

export const ONLINE_STORE_SECTOR_SLUGS: readonly string[] = ONLINE_STORE_CATEGORIES.filter(
  (c) => c.depth === 0
).map((c) => c.slug);

function categorySortKey(c: OnlineStoreCategory): number {
  return c.sortOrder ?? 9999;
}

export function compareOnlineStoresByDisplayOrder(
  a: OnlineStoreCategory,
  b: OnlineStoreCategory
): number {
  const byOrder = categorySortKey(a) - categorySortKey(b);
  if (byOrder !== 0) return byOrder;
  return a.title.localeCompare(b.title, 'fa');
}

export function isOnlineStoreSlug(slug: string): boolean {
  return ALL_SLUGS.has(slug.trim());
}

export function getOnlineStoreBySlug(slug: string): OnlineStoreCategory | null {
  return BY_SLUG.get(slug.trim()) ?? null;
}

export function getOnlineStorePath(slug: string): OnlineStoreCategory[] {
  const path: OnlineStoreCategory[] = [];
  let cursor: OnlineStoreCategory | null = BY_SLUG.get(slug.trim()) ?? null;
  let safety = 4;
  while (cursor && safety-- > 0) {
    path.unshift(cursor);
    cursor = cursor.parentSlug ? BY_SLUG.get(cursor.parentSlug) ?? null : null;
  }
  return path;
}

export function isAncestorOnlineStore(parent: string, child: string): boolean {
  const path = getOnlineStorePath(child);
  return path.some((c) => c.slug === parent && c.slug !== child);
}

export function getPickableOnlineStores(): OnlineStoreCategory[] {
  return ONLINE_STORE_CATEGORIES.filter((c) => c.depth === 1).sort(compareOnlineStoresByDisplayOrder);
}

export function getOnlineStoreSectors(): OnlineStoreCategory[] {
  return ONLINE_STORE_CATEGORIES.filter((c) => c.depth === 0).sort(compareOnlineStoresByDisplayOrder);
}

export function getOnlineStoreTitle(slug: string): string {
  return getOnlineStoreBySlug(slug)?.title ?? slug;
}

export function isPickableOnlineStoreSlug(slug: string): boolean {
  const c = getOnlineStoreBySlug(slug);
  return c != null && c.depth === 1;
}

export function getPickableOnlineStoreCount(): number {
  return getPickableOnlineStores().length;
}
