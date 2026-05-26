import type { ProfileSectionId } from '@/contracts/business-profile';
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
      rootSlugs: ['real-estate'],
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
      extensionHint: 'restaurant',
      parentSlugs: ['food-dining'],
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
      rootSlugs: ['electronics', 'home-appliances', 'personal-items'],
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
      rootSlugs: ['entertainment'],
      parentSlugs: ['sports-fitness', 'beauty-health'],
      leafSlugs: ['sports-fitness'],
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
      parentSlugs: ['it-services', 'graphic-design', 'web-design'],
      leafSlugs: ['it-services', 'logo-design', 'frontend', 'web-design', 'graphic-design'],
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
      parentSlugs: ['legal-services', 'medical-health', 'education'],
      leafSlugs: ['legal-services', 'medical-health', 'consulting-education'],
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
      rootSlugs: ['services'],
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
      rootSlugs: ['jobs', 'social'],
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
