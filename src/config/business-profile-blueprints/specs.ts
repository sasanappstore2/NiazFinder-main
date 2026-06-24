import type { ProfileSectionId } from '@/contracts/business-profile';
import { ONLINE_STORE_SECTOR_SLUGS } from '@/config/online-stores';
import type { BusinessProfileBlueprint, ProfileTabSpec } from './types';

const INTRO: ProfileSectionId[] = ['highlights', 'about', 'credentials', 'seo'];

function tabs(...specs: ProfileTabSpec[]): ProfileTabSpec[] {
  return specs;
}

export const BLUEPRINT_SPECS: BusinessProfileBlueprint[] = [
  {
    id: 'real_estate',
    titleFa: 'املاک',
    match: {
      occupationSectors: ['real-estate-facility'],
      occupationSlugs: [
        'real-estate-agent',
        'real-estate-office',
        'property-manager',
        'interior-designer',
        'architect',
      ],
      extensionHint: 'realEstate',
    },
    sectionOrder: [
      'hero',
      'highlights',
      'about',
      'listings',
      'services',
      'trust',
      'contact',
      'seo',
    ],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'listings', labelFa: 'آگهی‌ها', sections: ['listings'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'intro',
    cmsModules: ['offers', 'listings'],
  },
  {
    id: 'restaurant',
    titleFa: 'رستوران',
    match: {
      occupationSectors: ['food-hospitality'],
      occupationSlugs: ['restaurant-cafe', 'catering', 'pastry-bakery', 'butcher', 'hotel-guesthouse'],
      extensionHint: 'restaurant',
    },
    sectionOrder: ['hero', 'highlights', 'about', 'menu', 'services', 'trust', 'contact', 'seo'],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'menu', labelFa: 'منو', sections: ['menu'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'intro',
    cmsModules: ['menu', 'offers'],
  },
  {
    id: 'store',
    titleFa: 'فروشگاه',
    match: {
      occupationSlugs: [
        'mobile-repair',
        'computer-repair',
        'appliance-repair',
        'car-dealership',
        'auto-parts-store',
        'mobile-phone-store',
        'computer-store',
        'furniture-store',
        'appliance-store',
      ],
    },
    sectionOrder: ['hero', 'highlights', 'about', 'products', 'trust', 'contact', 'seo'],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'products', labelFa: 'محصولات', sections: ['products'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'products',
    cmsModules: ['offers'],
  },
  {
    id: 'online_store',
    titleFa: 'فروشگاه اینترنتی',
    match: {
      onlineStoreSectors: [...ONLINE_STORE_SECTOR_SLUGS],
    },
    sectionOrder: ['hero', 'highlights', 'about', 'products', 'trust', 'contact', 'seo'],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'products', labelFa: 'محصولات', sections: ['products'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'products',
    cmsModules: ['offers'],
  },
  {
    id: 'coach',
    titleFa: 'مربی / گالری',
    match: {
      occupationSlugs: ['sports-coach', 'photographer', 'videographer-editor', 'music-teacher'],
      occupationSectors: ['education-coaching', 'creative-media'],
      extensionHint: 'coach',
    },
    sectionOrder: ['hero', 'highlights', 'about', 'gallery', 'trust', 'contact', 'seo'],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'gallery', labelFa: 'گالری', sections: ['gallery'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'gallery',
    cmsModules: ['portfolio'],
    galleryLayout: 'masonry',
  },
  {
    id: 'agency',
    titleFa: 'آژانس / طراحی',
    match: {
      occupationSectors: ['tech-digital', 'creative-media'],
      occupationSlugs: [
        'web-developer',
        'ui-ux-designer',
        'graphic-designer',
        'seo-digital-marketing',
        'photographer',
        'social-media-manager',
      ],
    },
    sectionOrder: ['hero', 'highlights', 'about', 'portfolio', 'services', 'trust', 'contact', 'seo'],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'portfolio', labelFa: 'نمونه‌کار', sections: ['portfolio'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'portfolio',
    cmsModules: ['offers', 'portfolio'],
    galleryLayout: 'portfolio',
  },
  {
    id: 'professional',
    titleFa: 'حرفه‌ای',
    match: {
      occupationSectors: ['professional-legal-finance', 'health-beauty', 'education-coaching'],
      occupationSlugs: [
        'lawyer',
        'accountant',
        'tax-advisor',
        'general-practitioner',
        'dentist',
        'private-tutor',
        'career-coach',
      ],
      extensionHint: 'doctor',
    },
    sectionOrder: [
      'hero',
      'highlights',
      'about',
      'credentials',
      'services',
      'trust',
      'contact',
      'seo',
    ],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: [...INTRO, 'credentials'] },
      { id: 'services', labelFa: 'خدمات', sections: ['services'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'intro',
    cmsModules: ['offers'],
  },
  {
    id: 'services',
    titleFa: 'خدمات',
    match: {
      occupationSectors: ['trades-construction', 'home-personal-services', 'transport-logistics'],
      occupationSlugs: [
        'plumber',
        'electrician',
        'painter-decorator',
        'cleaner',
        'moving-company',
        'auto-mechanic',
        'appliance-repair',
      ],
      extensionHint: 'mechanic',
    },
    sectionOrder: ['hero', 'highlights', 'about', 'services', 'portfolio', 'trust', 'contact', 'seo'],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'services', labelFa: 'خدمات', sections: ['services'] },
      { id: 'portfolio', labelFa: 'نمونه‌کار', sections: ['portfolio'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'intro',
    cmsModules: ['offers', 'portfolio'],
    galleryLayout: 'portfolio',
  },
  {
    id: 'company',
    titleFa: 'شرکت / سازمان',
    match: {
      occupationSlugs: ['management-consultant', 'recruitment-hr', 'event-planner'],
      extensionHint: 'company',
    },
    sectionOrder: [
      'hero',
      'highlights',
      'about',
      'companyProfile',
      'services',
      'companyNeeds',
      'trust',
      'contact',
      'seo',
    ],
    tabs: tabs(
      { id: 'intro', labelFa: 'معرفی', sections: INTRO },
      { id: 'company', labelFa: 'شرکت', sections: ['companyProfile'] },
      { id: 'needs', labelFa: 'نیازها', sections: ['companyNeeds'] },
      { id: 'reviews', labelFa: 'نظرات', sections: ['trust'] }
    ),
    defaultTab: 'intro',
    cmsModules: ['companyInfo', 'needs', 'offers'],
  },
];
