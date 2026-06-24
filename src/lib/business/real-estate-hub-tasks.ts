import type { RealEstateSubtype } from '@/lib/business/widget-registry';
import { isRealEstateListingSubtype } from '@/lib/business/real-estate-listing-subtypes';

export type RealEstateHubTaskId =
  | 'overview'
  | 'profile'
  | 'brand'
  | 'listings'
  | 'portfolio'
  | 'services'
  | 'coverage'
  | 'widgets'
  | 'documents'
  | 'contacts';

export type RealEstateHubTask = {
  id: RealEstateHubTaskId;
  label: string;
  hint: string;
};

const BASE_TASKS: RealEstateHubTask[] = [
  { id: 'overview', label: 'پیشخوان', hint: 'وضعیت پروفایل و میانبرها' },
  { id: 'profile', label: 'معرفی و تماس', hint: 'نام، توضیحات، موقعیت، تماس' },
  { id: 'brand', label: 'برند و تصاویر', hint: 'لوگو، کاور، شبکه‌های اجتماعی' },
  { id: 'coverage', label: 'محدوده و تخصص', hint: 'مناطق تحت پوشش و تخصص‌ها' },
  { id: 'widgets', label: 'ویجت‌های صفحه', hint: 'نمایش بخش‌ها در صفحه عمومی' },
  { id: 'documents', label: 'مدارک', hint: 'بارگذاری مدارک احراز هویت' },
  { id: 'contacts', label: 'تیم و مخاطبین', hint: 'اعضای تیم و بخش‌های تماس' },
];

const LISTINGS_TASK: RealEstateHubTask = {
  id: 'listings',
  label: 'آگهی‌ها',
  hint: 'املاک فعال، فروخته‌شده و اجاره‌ای',
};

const PORTFOLIO_TASK: RealEstateHubTask = {
  id: 'portfolio',
  label: 'نمونه‌کار',
  hint: 'پروژه‌ها و گالری تصاویر',
};

const SERVICES_TASK: RealEstateHubTask = {
  id: 'services',
  label: 'خدمات و پکیج',
  hint: 'پکیج خدمات و انواع پروژه',
};

const PORTFOLIO_SUBTYPES = new Set<RealEstateSubtype>([
  'architect',
  'interior-designer',
  'general-contractor',
  'land-surveyor',
  'official-appraiser',
]);

const SERVICES_SUBTYPES = new Set<RealEstateSubtype>([
  'architect',
  'interior-designer',
  'real-estate-agent',
  'real-estate-office',
  'property-manager',
  'general-contractor',
]);

export function getRealEstateHubTasks(subtype: RealEstateSubtype): RealEstateHubTask[] {
  const tasks = [...BASE_TASKS];

  if (isRealEstateListingSubtype(subtype)) {
    tasks.splice(3, 0, LISTINGS_TASK);
  }

  if (PORTFOLIO_SUBTYPES.has(subtype)) {
    const insertAt = isRealEstateListingSubtype(subtype) ? 4 : 3;
    tasks.splice(insertAt, 0, PORTFOLIO_TASK);
  }

  if (SERVICES_SUBTYPES.has(subtype)) {
    const portfolioIndex = tasks.findIndex((t) => t.id === 'portfolio');
    const insertAt = portfolioIndex >= 0 ? portfolioIndex + 1 : 3;
    tasks.splice(insertAt, 0, SERVICES_TASK);
  }

  return tasks;
}

export const REAL_ESTATE_TASK_LABELS: Record<RealEstateHubTaskId, string> = {
  overview: 'پیشخوان',
  profile: 'معرفی و تماس',
  brand: 'برند و تصاویر',
  listings: 'آگهی‌ها',
  portfolio: 'نمونه‌کار',
  services: 'خدمات و پکیج',
  coverage: 'محدوده و تخصص',
  widgets: 'ویجت‌های صفحه',
  documents: 'مدارک',
  contacts: 'تیم و مخاطبین',
};
