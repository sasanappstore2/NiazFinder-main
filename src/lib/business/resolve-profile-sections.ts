import type {
  Business,
  ProfileLayoutConfig,
  ProfileSectionId,
  ProfileTemplate,
  ResolvedProfileLayout,
  ResolvedProfileSection,
} from '@/contracts/business-profile';
import {
  getBlueprintForBusiness,
  getBlueprintByTemplate,
} from '@/config/business-profile-blueprints';

const DEFAULT_LABELS: Record<ProfileSectionId, string> = {
  hero: 'معرفی',
  highlights: 'خلاصه',
  about: 'درباره',
  services: 'خدمات',
  products: 'محصولات',
  portfolio: 'نمونه‌کارها',
  gallery: 'گالری',
  listings: 'آگهی‌ها',
  menu: 'منو',
  credentials: 'تخصص‌ها',
  companyProfile: 'مشخصات شرکت',
  companyNeeds: 'نیازهای شرکت',
  trust: 'نظرات',
  contact: 'تماس',
  seo: 'اطلاعات بیشتر',
};

export function inferProfileTemplate(business: Business): ProfileTemplate {
  const explicit = business.layoutConfig?.template;
  if (explicit) return explicit;
  return getBlueprintForBusiness(business).id;
}

function isSectionVisible(id: ProfileSectionId, business: Business, template: ProfileTemplate): boolean {
  const ext = business.extensions;

  switch (id) {
    case 'hero':
    case 'about':
    case 'contact':
      return true;
    case 'highlights':
      return (
        business.trust.reviewCount > 0 ||
        business.trust.yearsActive > 0 ||
        business.trust.responseRate > 0 ||
        business.trust.verified
      );
    case 'services':
      return template !== 'store' && business.offers.length > 0;
    case 'products':
      return template === 'store' && business.offers.length > 0;
    case 'portfolio':
      return business.portfolio.length > 0;
    case 'gallery':
      return business.portfolio.length > 0;
    case 'listings':
      return (ext?.realEstate?.listings?.length ?? 0) > 0;
    case 'menu':
      return (ext?.restaurant?.menu?.length ?? 0) > 0;
    case 'credentials':
      return Boolean(
        ext?.doctor?.specialties?.length ||
          ext?.mechanic?.supportedBrands?.length ||
          ext?.salon?.serviceStyles?.length ||
          ext?.coach?.certifications?.length ||
          business.trust.badges.some((b) => /مجوز|پروانه|وکیل|تخصص/i.test(b))
      );
    case 'companyProfile':
      return Boolean(
        ext?.company?.legalName ||
          ext?.company?.registrationNumber ||
          ext?.company?.industry ||
          ext?.company?.description
      );
    case 'companyNeeds':
      return true;
    case 'trust':
      return business.reviews.length > 0 || business.trust.reviewCount > 0;
    case 'seo':
      return Boolean(business.seo.description?.trim());
    default:
      return false;
  }
}

export function resolveProfileSections(business: Business): ResolvedProfileLayout {
  const template = inferProfileTemplate(business);
  const blueprint = getBlueprintByTemplate(template);
  const config: ProfileLayoutConfig = business.layoutConfig ?? {};
  const order = config.sectionOrder ?? blueprint.sectionOrder;

  const sections: ResolvedProfileSection[] = order.map((id) => ({
    id,
    label: config.labels?.[id] ?? DEFAULT_LABELS[id],
    visible: isSectionVisible(id, business, template),
    anchor: `section-${id}`,
  }));

  return { template, sections: sections.filter((s) => s.visible) };
}

/** Nav-eligible sections (exclude hero/contact which have dedicated UI). */
export function profileNavSections(layout: ResolvedProfileLayout): ResolvedProfileSection[] {
  return layout.sections.filter((s) => s.id !== 'hero' && s.id !== 'contact' && s.id !== 'seo');
}

/** Main content sections rendered in the scroll column. */
export function profileContentSections(layout: ResolvedProfileLayout): ResolvedProfileSection[] {
  return layout.sections.filter((s) => s.id !== 'hero' && s.id !== 'contact');
}

export { DEFAULT_LABELS };
