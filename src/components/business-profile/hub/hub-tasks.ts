import {
  Building2,
  ImageIcon,
  LayoutList,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import type { BusinessHubProfile, HubTaskId } from './types';

export type HubTaskDef = {
  id: HubTaskId;
  label: string;
  hint: string;
  shortLabel: string;
  icon: LucideIcon;
  realEstateOnly?: boolean;
};

export const HUB_TASKS: HubTaskDef[] = [
  {
    id: 'storefront',
    label: 'ویترین و محصولات',
    hint: 'دسته و محصول اضافه کنید',
    shortLabel: 'ویترین',
    icon: LayoutList,
  },
  {
    id: 'profile',
    label: 'معرفی و تماس',
    hint: 'نام، موقعیت روی نقشه و تماس',
    shortLabel: 'معرفی',
    icon: UserRound,
  },
  {
    id: 'brand',
    label: 'عکس و لینک‌ها',
    hint: 'لوگو، کاور و شبکه‌های اجتماعی',
    shortLabel: 'عکس',
    icon: Store,
  },
  {
    id: 'gallery',
    label: 'نمونه کارها',
    hint: 'عکس یا ویدیو از کارهای شما',
    shortLabel: 'نمونه',
    icon: ImageIcon,
  },
  {
    id: 'contacts',
    label: 'مخاطبین و تیم',
    hint: 'بخش‌های تماس و دعوت کارمند',
    shortLabel: 'تیم',
    icon: Users,
  },
  {
    id: 'filings',
    label: 'میزکار املاک',
    hint: 'نیازها، فایلینگ منطقه، همکاری و پیگیری',
    shortLabel: 'میزکار',
    icon: Building2,
    realEstateOnly: true,
  },
];

export const HUB_TASK_LABELS: Record<HubTaskId, string> = {
  storefront: 'ویترین و محصولات',
  profile: 'معرفی و تماس',
  brand: 'عکس و لینک‌ها',
  gallery: 'نمونه کارها',
  contacts: 'مخاطبین و تیم',
  filings: 'میزکار املاک',
};

export function getVisibleHubTasks(profile: BusinessHubProfile | null): HubTaskDef[] {
  const isRe = profile ? isRealEstateBusiness(profile.occupationSlugs) : false;
  return HUB_TASKS.filter((task) => !task.realEstateOnly || isRe);
}
