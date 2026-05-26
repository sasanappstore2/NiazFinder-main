'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  Dot,
  ArrowRight,
  Car,
  Laptop,
  Armchair,
  Wrench,
  Shirt,
  Ticket,
  Users,
  Briefcase,
  HomeIcon,
  Building2,
  House,
  LandPlot,
  Handshake,
  Store,
  Bike,
  Smartphone,
  Gamepad2,
  Clapperboard,
  Camera,
  BookOpen,
  Dog,
  Music,
  GraduationCap,
  Sparkles,
  BadgePercent,
  Landmark,
  TrendingUp,
  Palette,
  HeartPulse,
  Truck,
  KeyRound,
  Ship,
  Tablet,
  Headphones,
  Monitor,
  Cpu,
  CookingPot,
  Refrigerator,
  WashingMachine,
  Microwave,
  Sofa,
  Table,
  Lamp,
  Image,
  Layers,
  PartyPopper,
  Watch,
  SprayCan,
  Baby,
  Plane,
  Dumbbell,
  CalendarDays,
  Presentation,
  Trophy,
  HeartHandshake,
  HardHat,
  Search,
  Dices,
  LayoutGrid,
  ChevronDown,
  Droplets,
  Zap,
  Paintbrush,
  Stethoscope,
  Scale,
  Code2,
  Package,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { SheetTitle } from '@/components/ui/sheet';

// ============ Type definitions ============
export type FormFieldDefinition = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: Record<string, unknown>;
};

export interface MegaMenuCategory {
  id: string;
  name: string;
  value: string;
  /** Canonical slug for URLs, intake, and DB (preferred over legacy `value`). */
  canonicalSlug?: string;
  label: string;
  icon: React.ElementType;
  color?: string;
  parent?: string | null;
  subCategories?: MegaMenuCategory[];
  specificFields?: FormFieldDefinition[];
}

/** Resolve canonical slug from mega-menu node. */
export function getMegaMenuCanonicalSlug(category: MegaMenuCategory): string {
  return category.canonicalSlug ?? category.id;
}

export function getCategoryBrowseHref(category: MegaMenuCategory, pathname = '/browse') {
  const slug = getMegaMenuCanonicalSlug(category);
  const params = new URLSearchParams({ category: slug });
  return `${pathname}?${params.toString()}`;
}

/** Link to need intake with pre-selected category (and optional city). */
export function getPostNeedHref(category: MegaMenuCategory, citySlug?: string) {
  const params = new URLSearchParams({ category: getMegaMenuCanonicalSlug(category) });
  if (citySlug) params.set('city', citySlug);
  return `/post?${params.toString()}`;
}

// ============ Categories data ============
const addParentValue = (categories: MegaMenuCategory[], parentValue: string | null = null): MegaMenuCategory[] => {
  return categories.map(category => {
    const newCategory = { ...category, parent: parentValue };
    if (newCategory.subCategories) {
      newCategory.subCategories = addParentValue(newCategory.subCategories, newCategory.value);
    }
    return newCategory;
  });
};

const ALL_CATEGORIES_UNPROCESSED: MegaMenuCategory[] = [
  {
    id: 'real-estate',
    name: 'املاک',
    value: 'real-estate',
    label: 'املاک',
    icon: HomeIcon,
    subCategories: [
      {
        id: 'residential-sale',
        name: 'فروش مسکونی',
        value: 'real-estate-residential-sale',
        label: 'فروش مسکونی',
        icon: Building2,
        subCategories: [
          { id: 'apartment-sale', name: 'آپارتمان', value: 'real-estate-residential-sale-apartment-sale', label: 'آپارتمان', icon: Building2, specificFields: [{ name: 'bedrooms', label: 'تعداد اتاق', type: 'select' as const, options: [{ value: '1', label: '۱' }, { value: '2', label: '۲' }, { value: '3', label: '۳+' }] }] },
          { id: 'villa-sale', name: 'خانه و ویلا', value: 'real-estate-residential-sale-villa-sale', label: 'خانه و ویلا', icon: House },
          { id: 'land-sale', name: 'زمین و کلنگی', value: 'real-estate-residential-sale-land-sale', label: 'زمین و کلنگی', icon: LandPlot },
        ],
      },
      {
        id: 'residential-rent',
        name: 'اجاره مسکونی',
        value: 'real-estate-residential-rent',
        label: 'اجاره مسکونی',
        icon: House,
        subCategories: [
          { id: 'apartment-rent', name: 'آپارتمان', value: 'real-estate-residential-rent-apartment-rent', label: 'آپارتمان', icon: Building2, specificFields: [{ name: 'bedrooms', label: 'تعداد اتاق', type: 'select' as const, options: [{ value: '1', label: '۱' }, { value: '2', label: '۲' }, { value: '3', label: '۳+' }] }] },
          { id: 'villa-rent', name: 'خانه و ویلا', value: 'real-estate-residential-rent-villa-rent', label: 'خانه و ویلا', icon: House },
        ],
      },
      {
        id: 'commercial-sale',
        name: 'فروش اداری و تجاری',
        value: 'real-estate-commercial-sale',
        label: 'فروش اداری و تجاری',
        icon: Store,
        subCategories: [
          { id: 'office-sale', name: 'دفتر کار، اتاق و مطب', value: 'real-estate-commercial-sale-office-sale', label: 'دفتر کار', icon: Briefcase },
          { id: 'shop-sale', name: 'مغازه و غرفه', value: 'real-estate-commercial-sale-shop-sale', label: 'مغازه', icon: Store },
          { id: 'industrial-sale', name: 'صنعتی، کشاورزی و تجاری', value: 'real-estate-commercial-sale-industrial-sale', label: 'صنعتی', icon: HardHat },
        ],
      },
      {
        id: 'commercial-rent',
        name: 'اجاره اداری و تجاری',
        value: 'real-estate-commercial-rent',
        label: 'اجاره اداری و تجاری',
        icon: Store,
        subCategories: [
          { id: 'office-rent', name: 'دفتر کار، اتاق و مطب', value: 'real-estate-commercial-rent-office-rent', label: 'دفتر کار', icon: Briefcase },
          { id: 'shop-rent', name: 'مغازه و غرفه', value: 'real-estate-commercial-rent-shop-rent', label: 'مغازه', icon: Store },
          { id: 'industrial-rent', name: 'صنعتی، کشاورزی و تجاری', value: 'real-estate-commercial-rent-industrial-rent', label: 'صنعتی', icon: HardHat },
        ],
      },
      {
        id: 'real-estate-services',
        name: 'خدمات املاک',
        value: 'real-estate-real-estate-services',
        label: 'خدمات املاک',
        icon: Handshake,
        subCategories: [
          { id: 'agency-services', name: 'آژانس املاک', value: 'real-estate-real-estate-services-agency-services', canonicalSlug: 'agency-services', label: 'آژانس املاک', icon: Handshake },
          { id: 'construction-partnership', name: 'مشارکت در ساخت', value: 'real-estate-real-estate-services-construction-partnership', canonicalSlug: 'construction-partnership', label: 'مشارکت در ساخت', icon: HardHat },
          { id: 'pre-sale-services', name: 'پیش‌فروش', value: 'real-estate-real-estate-services-pre-sale-services', canonicalSlug: 'pre-sale-services', label: 'پیش‌فروش', icon: BadgePercent },
        ],
      },
    ],
  },
  {
    id: 'vehicles',
    name: 'وسایل نقلیه',
    value: 'vehicles',
    label: 'وسایل نقلیه',
    icon: Car,
    subCategories: [
      {
        id: 'car',
        name: 'خودرو',
        value: 'vehicles-car',
        label: 'خودرو',
        icon: Car,
        subCategories: [
          { id: 'car-ride', name: 'سواری', value: 'vehicles-car-car-ride', label: 'سواری', icon: Car },
          { id: 'car-heavy', name: 'سنگین', value: 'vehicles-car-car-heavy', label: 'سنگین', icon: Truck },
          { id: 'car-classic', name: 'کلاسیک', value: 'vehicles-car-car-classic', label: 'کلاسیک', icon: Car },
          { id: 'car-rental', name: 'اجاره‌ای', value: 'vehicles-car-car-rental', label: 'اجاره‌ای', icon: KeyRound },
        ],
      },
      { id: 'motorcycle', name: 'موتورسیکلت', value: 'vehicles-motorcycle', label: 'موتورسیکلت', icon: Bike },
      { id: 'spare-parts', name: 'قطعات یدکی و لوازم جانبی', value: 'vehicles-spare-parts', label: 'قطعات یدکی', icon: Wrench },
      { id: 'boat', name: 'قایق و لوازم جانبی', value: 'vehicles-boat', label: 'قایق', icon: Ship },
    ],
  },
  {
    id: 'electronics',
    name: 'لوازم الکترونیکی',
    value: 'electronics',
    label: 'لوازم الکترونیکی',
    icon: Laptop,
    subCategories: [
      {
        id: 'mobile-tablet',
        name: 'موبایل و تبلت',
        value: 'electronics-mobile-tablet',
        label: 'موبایل و تبلت',
        icon: Smartphone,
        subCategories: [
          { id: 'mobile-phone', name: 'گوشی موبایل', value: 'electronics-mobile-tablet-mobile-phone', label: 'گوشی موبایل', icon: Smartphone },
          { id: 'tablet', name: 'تبلت', value: 'electronics-mobile-tablet-tablet', label: 'تبلت', icon: Tablet },
          { id: 'mobile-accessories', name: 'لوازم جانبی', value: 'electronics-mobile-tablet-mobile-accessories', label: 'لوازم جانبی', icon: Headphones },
        ],
      },
      {
        id: 'computer',
        name: 'رایانه',
        value: 'electronics-computer',
        label: 'رایانه',
        icon: Laptop,
        subCategories: [
          { id: 'desktop-computer', name: 'رایانه رومیزی', value: 'electronics-computer-desktop-computer', label: 'رومیزی', icon: Monitor },
          { id: 'laptop', name: 'لپ‌تاپ', value: 'electronics-computer-laptop', label: 'لپ‌تاپ', icon: Laptop },
          { id: 'computer-parts', name: 'قطعات و لوازم جانبی', value: 'electronics-computer-computer-parts', label: 'قطعات', icon: Cpu },
        ],
      },
      { id: 'game-console', name: 'کنسول، بازی ویدئویی و آنلاین', value: 'electronics-game-console', label: 'کنسول و بازی', icon: Gamepad2 },
      { id: 'audio-video', name: 'صوتی و تصویری', value: 'electronics-audio-video', label: 'صوتی و تصویری', icon: Clapperboard },
      { id: 'camera', name: 'دوربین عکاسی و فیلم‌برداری', value: 'electronics-camera', label: 'دوربین', icon: Camera },
    ],
  },
  {
    id: 'home-appliances',
    name: 'لوازم خانگی',
    value: 'home-appliances',
    label: 'لوازم خانگی',
    icon: Armchair,
    subCategories: [
      {
        id: 'kitchen-appliances',
        name: 'لوازم آشپزخانه',
        value: 'home-appliances-kitchen-appliances',
        label: 'لوازم آشپزخانه',
        icon: CookingPot,
        subCategories: [
          { id: 'refrigerator', name: 'یخچال و فریزر', value: 'home-appliances-kitchen-appliances-refrigerator', label: 'یخچال', icon: Refrigerator },
          { id: 'washing-machine', name: 'ماشین لباسشویی و ظرفشویی', value: 'home-appliances-kitchen-appliances-washing-machine', label: 'ماشین شستشو', icon: WashingMachine },
          { id: 'stove-microwave', name: 'اجاق گاز و مایکروویو', value: 'home-appliances-kitchen-appliances-stove-microwave', label: 'اجاق و مایکروویو', icon: Microwave },
          { id: 'cooking-utensils', name: 'ظروف و وسایل آشپزخانه', value: 'home-appliances-kitchen-appliances-cooking-utensils', label: 'ظروف', icon: CookingPot },
        ],
      },
      {
        id: 'furniture-decor',
        name: 'مبلمان و لوازم چوبی',
        value: 'home-appliances-furniture-decor',
        label: 'مبلمان و دکور',
        icon: Sofa,
        subCategories: [
          { id: 'sofa-chair', name: 'مبلمان و صندلی', value: 'home-appliances-furniture-decor-sofa-chair', label: 'مبلمان', icon: Sofa },
          { id: 'table-closet', name: 'میز و کمد', value: 'home-appliances-furniture-decor-table-closet', label: 'میز و کمد', icon: Table },
          { id: 'lighting', name: 'نور و روشنایی', value: 'home-appliances-furniture-decor-lighting', label: 'روشنایی', icon: Lamp },
          { id: 'decorative-art', name: 'تزیینی و آثار هنری', value: 'home-appliances-furniture-decor-decorative-art', label: 'تزیینی', icon: Image },
        ],
      },
      { id: 'rugs', name: 'فرش و گلیم', value: 'home-appliances-rugs', label: 'فرش و گلیم', icon: Layers },
      { id: 'building-industrial', name: 'ابزار و وسایل ساختمانی', value: 'home-appliances-building-industrial', label: 'ابزار ساختمانی', icon: HardHat },
    ],
  },
  {
    id: 'services',
    name: 'خدمات',
    value: 'services',
    label: 'خدمات',
    icon: Wrench,
    subCategories: [
      { id: 'cleaning', name: 'نظافت', value: 'services-cleaning', canonicalSlug: 'cleaning', label: 'نظافت', icon: Sparkles },
      { id: 'repairs', name: 'تعمیرات', value: 'services-repairs', canonicalSlug: 'repairs', label: 'تعمیرات', icon: Wrench },
      { id: 'plumbing', name: 'لوله‌کشی', value: 'services-plumbing', canonicalSlug: 'plumbing', label: 'لوله‌کشی', icon: Droplets },
      { id: 'moving', name: 'اسباب‌کشی و باربری', value: 'services-moving', canonicalSlug: 'moving', label: 'اسباب‌کشی', icon: Package },
      { id: 'electrical', name: 'برق‌کاری', value: 'services-electrical', canonicalSlug: 'electrical', label: 'برق‌کاری', icon: Zap },
      { id: 'painting', name: 'نقاشی و کاغذدیواری', value: 'services-painting', canonicalSlug: 'painting', label: 'نقاشی', icon: Paintbrush },
      { id: 'medical-health', name: 'خدمات درمانی و پزشکی', value: 'services-medical-health', canonicalSlug: 'medical-health', label: 'درمانی', icon: Stethoscope },
      { id: 'legal-services', name: 'مشاوره حقوقی', value: 'services-legal-services', canonicalSlug: 'legal-services', label: 'حقوقی', icon: Scale },
      { id: 'it-services', name: 'خدمات فناوری', value: 'services-it-services', canonicalSlug: 'it-services', label: 'فناوری', icon: Code2 },
      { id: 'transportation', name: 'حمل و نقل', value: 'services-transportation', canonicalSlug: 'transportation', label: 'حمل و نقل', icon: Truck },
      { id: 'beauty-health', name: 'آرایشگری و زیبایی', value: 'services-beauty-health', canonicalSlug: 'beauty-health', label: 'زیبایی', icon: HeartPulse },
      { id: 'events-catering', name: 'مراسم و پذیرایی', value: 'services-events-catering', canonicalSlug: 'events-catering', label: 'مراسم', icon: PartyPopper },
      { id: 'education', name: 'آموزش', value: 'services-education', canonicalSlug: 'education', label: 'آموزش', icon: GraduationCap },
    ],
  },
  {
    id: 'personal-items',
    name: 'وسایل شخصی',
    value: 'personal-items',
    label: 'وسایل شخصی',
    icon: Shirt,
    subCategories: [
      { id: 'clothing', name: 'پوشاک', value: 'personal-items-clothing', label: 'پوشاک', icon: Shirt },
      { id: 'jewelry-watches', name: 'جواهرات و ساعت', value: 'personal-items-jewelry-watches', label: 'جواهرات', icon: Watch },
      { id: 'cosmetics-health', name: 'آرایشی و بهداشتی', value: 'personal-items-cosmetics-health', label: 'آرایشی', icon: SprayCan },
      { id: 'kids-baby', name: 'وسایل بچه و اسباب بازی', value: 'personal-items-kids-baby', label: 'کودک', icon: Baby },
    ],
  },
  {
    id: 'entertainment',
    name: 'سرگرمی و فراغت',
    value: 'entertainment',
    label: 'سرگرمی',
    icon: Dices,
    subCategories: [
      { id: 'books', name: 'کتاب و مجله', value: 'entertainment-books', label: 'کتاب', icon: BookOpen },
      { id: 'tickets', name: 'بلیط (کنسرت، تئاتر و...)', value: 'entertainment-tickets', label: 'بلیط', icon: Ticket },
      { id: 'tours', name: 'تور و چارتر', value: 'entertainment-tours', label: 'تور', icon: Plane },
      { id: 'sports-fitness', name: 'ورزش و تناسب اندام', value: 'entertainment-sports-fitness', label: 'ورزش', icon: Dumbbell },
      { id: 'pets', name: 'حیوانات خانگی', value: 'entertainment-pets', label: 'حیوانات', icon: Dog },
      { id: 'musical-instruments', name: 'آلات موسیقی', value: 'entertainment-musical-instruments', label: 'موسیقی', icon: Music },
    ],
  },
  {
    id: 'social',
    name: 'اجتماعی',
    value: 'social',
    label: 'اجتماعی',
    icon: Users,
    subCategories: [
      {
        id: 'events',
        name: 'رویداد',
        value: 'social-events',
        label: 'رویداد',
        icon: CalendarDays,
        subCategories: [
          { id: 'cultural-artistic', name: 'فرهنگی و هنری', value: 'social-events-cultural-artistic', label: 'فرهنگی', icon: Palette },
          { id: 'conference', name: 'همایش و کنفرانس', value: 'social-events-conference', label: 'همایش', icon: Presentation },
          { id: 'sporting', name: 'ورزشی', value: 'social-events-sporting', label: 'ورزشی', icon: Trophy },
        ],
      },
      { id: 'volunteering', name: 'داوطلبانه', value: 'social-volunteering', label: 'داوطلبانه', icon: HeartHandshake },
      { id: 'lost-found', name: 'گم‌شده‌ها و پیدا‌شده‌ها', value: 'social-lost-found', label: 'گم‌شده‌ها', icon: Search },
    ],
  },
  {
    id: 'jobs',
    name: 'استخدام و کاریابی',
    value: 'jobs',
    label: 'استخدام',
    icon: Briefcase,
    subCategories: [
      { id: 'admin-management', name: 'اداری و مدیریت', value: 'jobs-admin-management', label: 'اداری', icon: Briefcase },
      { id: 'it', name: 'فناوری اطلاعات و اینترنت', value: 'jobs-it', label: 'فناوری اطلاعات', icon: Laptop },
      { id: 'finance-legal', name: 'مالی و حقوقی', value: 'jobs-finance-legal', label: 'مالی و حقوقی', icon: Landmark },
      { id: 'marketing-sales', name: 'بازاریابی و فروش', value: 'jobs-marketing-sales', label: 'بازاریابی', icon: TrendingUp },
      { id: 'engineering', name: 'فنی و مهندسی', value: 'jobs-engineering', label: 'فنی و مهندسی', icon: HardHat },
      { id: 'art-media', name: 'هنر و رسانه', value: 'jobs-art-media', label: 'هنر و رسانه', icon: Palette },
      { id: 'health-beauty', name: 'درمانی، زیبایی و بهداشتی', value: 'jobs-health-beauty', label: 'درمانی و زیبایی', icon: HeartPulse },
    ],
  },
];

export const ALL_CATEGORIES = addParentValue(ALL_CATEGORIES_UNPROCESSED);

// ============ Helpers ============
export const getCategoryIcon = (value: string | null | undefined) => {
  if (!value) return Dices;

  // Recursive search through all nesting levels
  const search = (categories: MegaMenuCategory[]): React.ElementType | null => {
    for (const c of categories) {
      if (c.value === value) return c.icon;
      if (c.subCategories) {
        const found = search(c.subCategories);
        if (found) return found;
      }
    }
    return null;
  };

  return search(ALL_CATEGORIES) || Dices;
};

// ============ Category Colors (Color Psychology) ============

/** Maps top-level category IDs to psychology-based hex colors. */
const CATEGORY_COLORS: Record<string, string> = {
  'real-estate': '#3b82f6',    // آبی: اعتماد، ثبات، امنیت
  'vehicles': '#ef4444',       // قرمز: سرعت، قدرت، انرژی
  'electronics': '#06b6d4',    // فیروزه‌ای: فناوری، نوآوری، مدرن
  'home-appliances': '#f97316', // نارنجی: گرما، خانه، آسایش
  'services': '#8b5cf6',       // بنفش: حرفه‌ای، کیفیت، پریمیوم
  'personal-items': '#ec4899',  // صورتی: شخصی، زیبایی، مد
  'entertainment': '#eab308',   // زرد: شادی، سرگرمی، نشاط
  'social': '#10b981',         // سبز: جامعه، رشد، ارتباط
  'jobs': '#6366f1',           // نیلی: حرفه‌ای، شرکتی، جاه‌طلبی
};

const DEFAULT_CATEGORY_COLOR = '#6b7280';

/** Recursively resolves a category value to its top-level psychology color. */
export const getCategoryColor = (value: string | null | undefined): string => {
  if (!value) return DEFAULT_CATEGORY_COLOR;

  // Direct hit for top-level categories
  if (CATEGORY_COLORS[value]) return CATEGORY_COLORS[value];

  // Walk the tree, carrying the top-level color down
  const resolve = (
    categories: MegaMenuCategory[],
    inherited: string | null = null,
  ): string | null => {
    for (const c of categories) {
      const current = CATEGORY_COLORS[c.value] ?? inherited;
      if (c.value === value) return current;
      if (c.subCategories) {
        const found = resolve(c.subCategories, current);
        if (found) return found;
      }
    }
    return null;
  };

  return resolve(ALL_CATEGORIES) || DEFAULT_CATEGORY_COLOR;
};

// ============ Desktop View (3 columns) ============
function DesktopView({
  nestedCategories,
  onClose,
  onSelect,
  getIcon,
  getHref = getCategoryBrowseHref,
}: {
  nestedCategories: MegaMenuCategory[];
  onClose: () => void;
  onSelect: (category: MegaMenuCategory) => void;
  getIcon: (slug: string) => React.ElementType;
  getHref?: (category: MegaMenuCategory) => string;
}) {
  const [activeCol1, setActiveCol1] = React.useState<MegaMenuCategory | null>(null);
  const [activeCol2, setActiveCol2] = React.useState<MegaMenuCategory | null>(null);

  // Use computed fallback instead of setState in effect
  const effectiveCol1 = activeCol1 ?? (nestedCategories.length > 0 ? nestedCategories[0] : null);

  const col2Categories = effectiveCol1?.subCategories || [];
  const col3Categories = activeCol2?.subCategories || [];

  const handleItemClick = (category: MegaMenuCategory) => {
    onSelect(category);
    onClose();
  };

  const MenuItem = ({ category, onHover, onClick, isActive, hasSub }: {
    category: MegaMenuCategory;
    onHover: () => void;
    onClick: (cat: MegaMenuCategory) => void;
    isActive: boolean;
    hasSub: boolean;
  }) => {
    const Icon = getIcon(category.value) || Dot;

    return (
      <Link
        href={getHref(category)}
        onClick={() => onClick(category)}
        onMouseEnter={onHover}
        className={cn(
          'flex w-full items-center justify-between h-10 px-3 rounded-md cursor-pointer transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          isActive ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted/50 text-foreground'
        )}
        dir="rtl"
        title={`مشاهده آگهی‌های ${category.name}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="truncate text-sm">{category.name}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Icon className="w-5 h-5" style={{ color: getCategoryColor(category.value) }} />
          {hasSub && <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-[450px]" onMouseLeave={() => setActiveCol2(null)}>
      {/* Column 1 - Main Categories */}
      <div className="w-1/3 border-s border-border/40 bg-muted/20 p-2" dir="rtl">
        <ScrollArea className="h-full">
          {nestedCategories.map(cat => (
            <MenuItem
              key={cat.id}
              category={cat}
              onHover={() => {
                setActiveCol1(cat);
                setActiveCol2(null);
              }}
              onClick={() => handleItemClick(cat)}
              isActive={effectiveCol1?.id === cat.id}
              hasSub={!!cat.subCategories && cat.subCategories.length > 0}
            />
          ))}
        </ScrollArea>
      </div>

      {/* Column 2 - Sub Categories */}
      <div className="w-1/3 border-s border-border/40 p-2" dir="rtl">
        <AnimatePresence>
          {effectiveCol1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <ScrollArea className="h-full">
                <Link
                  href={getHref(effectiveCol1)}
                  onClick={() => handleItemClick(effectiveCol1)}
                  className="flex w-full items-center h-10 px-3 font-semibold rounded-md cursor-pointer hover:bg-muted/50 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  dir="rtl"
                  title={`مشاهده همه موارد ${effectiveCol1.name}`}
                >
                  همه موارد {effectiveCol1.name}
                </Link>
                <Separator className="my-1" />
                {col2Categories.map(cat => (
                  <MenuItem
                    key={cat.id}
                    category={cat}
                    onHover={() => setActiveCol2(cat)}
                    onClick={() => handleItemClick(cat)}
                    isActive={activeCol2?.id === cat.id}
                    hasSub={!!cat.subCategories && cat.subCategories.length > 0}
                  />
                ))}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Column 3 - Deep Sub Categories */}
      <div className="w-1/3 p-2" dir="rtl">
        <AnimatePresence>
          {activeCol2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <ScrollArea className="h-full">
                <Link
                  href={getHref(activeCol2)}
                  onClick={() => handleItemClick(activeCol2)}
                  className="flex w-full items-center h-10 px-3 font-semibold rounded-md cursor-pointer hover:bg-muted/50 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  dir="rtl"
                  title={`مشاهده همه موارد ${activeCol2.name}`}
                >
                  همه موارد {activeCol2.name}
                </Link>
                <Separator className="my-1" />
                {col3Categories.map(cat => (
                  <MenuItem
                    key={cat.id}
                    category={cat}
                    onHover={() => {}}
                    onClick={() => handleItemClick(cat)}
                    isActive={false}
                    hasSub={!!cat.subCategories && cat.subCategories.length > 0}
                  />
                ))}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ Mobile View (Hierarchical with slide animation) ============
function MobileView({
  nestedCategories,
  onClose,
  onSelect,
  getIcon,
  getHref = getCategoryBrowseHref,
}: {
  nestedCategories: MegaMenuCategory[];
  onClose: () => void;
  onSelect: (category: MegaMenuCategory) => void;
  getIcon: (slug: string) => React.ElementType;
  getHref?: (category: MegaMenuCategory) => string;
}) {
  const [history, setHistory] = React.useState<MegaMenuCategory[][]>([nestedCategories]);
  const [direction, setDirection] = React.useState(1);

  const currentLevel = history[history.length - 1];

  const findParentCategory = (levels: MegaMenuCategory[][]): MegaMenuCategory | null => {
    if (levels.length <= 1) return null;
    const currentItems = levels[levels.length - 1];
    if (!currentItems || currentItems.length === 0) return null;

    const parentValue = currentItems[0].parent;
    if (!parentValue) return null;

    const previousLevel = levels[levels.length - 2];
    return previousLevel.find(cat => cat.value === parentValue) || null;
  };

  const parentCategory = findParentCategory(history);
  const parentCategoryName = parentCategory ? parentCategory.name : 'همه دسته‌بندی‌ها';

  const openSubCategories = (category: MegaMenuCategory) => {
    if (category.subCategories && category.subCategories.length > 0) {
      setDirection(1);
      setHistory(prev => [...prev, category.subCategories!]);
    }
  };

  const handleLinkClick = (category: MegaMenuCategory) => {
    onSelect(category);
    onClose();
  };

  const handleBack = () => {
    if (history.length > 1) {
      setDirection(-1);
      setHistory(prev => prev.slice(0, -1));
    } else {
      onClose();
    }
  };

  const handleSelectAll = () => {
    if (parentCategory) handleLinkClick(parentCategory);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with back button */}
      <header className="flex items-center p-4 border-b border-border/40">
        <Button variant="ghost" size="icon" onClick={handleBack} className="flex-shrink-0">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-grow text-center">
          <SheetTitle className="text-base font-semibold">{parentCategoryName}</SheetTitle>
        </div>
        <div className="w-10 flex-shrink-0" />
      </header>

      {/* Sliding content */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={history.length}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className="absolute inset-0"
          >
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {history.length > 1 && parentCategory && (
                  <>
                    <Link
                      href={getHref(parentCategory)}
                      className="flex w-full items-center text-right h-12 px-3 text-base rounded-md cursor-pointer hover:bg-muted/50 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onClick={handleSelectAll}
                      title={`مشاهده همه موارد ${parentCategoryName}`}
                    >
                      همه موارد {parentCategoryName}
                    </Link>
                    <Separator />
                  </>
                )}
                {currentLevel.map(cat => {
                  const Icon = getIcon(cat.value) || Dot;
                  const categoryColor = getCategoryColor(cat.value);
                  const hasSub = !!cat.subCategories && cat.subCategories.length > 0;
                  return (
                    <div
                      key={cat.id}
                      className="flex w-full items-center justify-between gap-2 rounded-md hover:bg-muted/50 transition-colors duration-100"
                      dir="rtl"
                    >
                      <Link
                        href={getHref(cat)}
                        onClick={() => handleLinkClick(cat)}
                        className="flex h-12 min-w-0 flex-1 items-center gap-3 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title={`مشاهده آگهی‌های ${cat.name}`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <Icon className="w-5 h-5" style={{ color: categoryColor }} />
                      </Link>
                      {hasSub && (
                        <button
                          type="button"
                          onClick={() => openSubCategories(cat)}
                          className="ml-2 flex size-10 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={`نمایش زیر‌دسته‌های ${cat.name}`}
                          title={`نمایش زیر‌دسته‌های ${cat.name}`}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ CategorySelector (Main Component) ============
interface CategorySelectorProps {
  isDesktop: boolean;
  nestedCategories: MegaMenuCategory[];
  onClose: () => void;
  onSelect: (category: MegaMenuCategory) => void;
  getIcon: (slug: string) => React.ElementType;
  getHref?: (category: MegaMenuCategory) => string;
}

export function CategorySelector({
  isDesktop,
  nestedCategories,
  onSelect,
  onClose,
  getIcon,
  getHref,
}: CategorySelectorProps) {
  if (isDesktop) {
    return <DesktopView nestedCategories={nestedCategories} onSelect={onSelect} onClose={onClose} getIcon={getIcon} getHref={getHref} />;
  }
  return <MobileView nestedCategories={nestedCategories} onSelect={onSelect} onClose={onClose} getIcon={getIcon} getHref={getHref} />;
}

// ============ Header Trigger Buttons ============

/** Desktop trigger — use inside a Popover */
export function CategoryMenuTrigger({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isOpen
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label="دسته‌بندی‌ها"
      title="مشاهده دسته‌بندی‌ها"
    >
      <LayoutGrid className="size-[16px]" />
      <span className="hidden xl:inline">دسته‌بندی‌ها</span>
      <ChevronDown
        className={cn(
          'size-3.5 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
        aria-hidden="true"
      />
    </button>
  );
}

/** Mobile trigger — use inside a Sheet */
export function CategoryMenuMobileTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="دسته‌بندی‌ها"
      title="مشاهده دسته‌بندی‌ها"
    >
      <LayoutGrid className="size-5" />
      <span>دسته‌بندی‌ها</span>
      <ChevronLeft className="ms-auto size-4" />
    </button>
  );
}
