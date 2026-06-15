import { REPAIR_SUBCATEGORIES } from '@/config/repair-subcategories';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';

const REPAIR_LEAF_SLUGS = new Set(REPAIR_SUBCATEGORIES.map((item) => item.slug));

/** Standalone service categories (depth-1 under services). */
const SERVICE_NEED_SUBJECT: Record<string, string> = {
  repairs: '\u062A\u0639\u0645\u06CC\u0631\u0627\u062A',
  plumbing: '\u0644\u0648\u0644\u0647\u200C\u06A9\u0634\u06CC',
  electrical: '\u0628\u0631\u0642\u200C\u06A9\u0627\u0631\u06CC',
  cleaning: '\u0646\u0638\u0627\u0641\u062A \u0645\u0646\u0632\u0644',
  painting: '\u0646\u0642\u0627\u0634\u06CC \u0633\u0627\u062E\u062A\u0645\u0627\u0646',
  moving: '\u0627\u0633\u0628\u0627\u0628\u200C\u06A9\u0634\u06CC',
  'legal-services': '\u0645\u0634\u0627\u0648\u0631\u0647 \u062D\u0642\u0648\u0642\u06CC',
  'medical-health': '\u062E\u062F\u0645\u0627\u062A \u067E\u0632\u0634\u06A9\u06CC',
  'it-services': '\u062E\u062F\u0645\u0627\u062A \u0641\u0646\u0627\u0648\u0631\u06CC',
  education: '\u0622\u0645\u0648\u0632\u0634 \u0648 \u062A\u062F\u0631\u06CC\u0633',
  'beauty-health': '\u0622\u0631\u0627\u06CC\u0634\u06AF\u0631\u06CC \u0648 \u0632\u06CC\u0628\u0627\u06CC\u06CC',
  transportation: '\u062D\u0645\u0644 \u0648 \u0646\u0642\u0644',
  'events-catering': '\u0628\u0631\u06AF\u0632\u0627\u0631\u06CC \u0645\u0631\u0627\u0633\u0645',
};

const REAL_ESTATE_PARENT_SUBJECT: Record<string, string> = {
  'residential-sale': '\u0641\u0631\u0648\u0634 \u0645\u0633\u06A9\u0648\u0646\u06CC',
  'residential-rent': '\u0627\u062C\u0627\u0631\u0647 \u0645\u0633\u06A9\u0648\u0646\u06CC',
  'commercial-sale': '\u0641\u0631\u0648\u0634 \u062A\u062C\u0627\u0631\u06CC',
  'commercial-rent': '\u0627\u062C\u0627\u0631\u0647 \u062A\u062C\u0627\u0631\u06CC',
  'short-term-rent': '\u0627\u062C\u0627\u0631\u0647 \u06A9\u0648\u062A\u0627\u0647\u200C\u0645\u062F\u062A',
  'real-estate-services': '\u062E\u062F\u0645\u0627\u062A \u0627\u0645\u0644\u0627\u06A9',
};

const ROOT_NEED_SUBJECT: Record<string, string> = {
  'real-estate': '\u062E\u0631\u06CC\u062F\u060C \u0641\u0631\u0648\u0634 \u0648 \u0627\u062C\u0627\u0631\u0647 \u0627\u0645\u0644\u0627\u06A9',
  vehicles: '\u062E\u0631\u06CC\u062F \u0648 \u0641\u0631\u0648\u0634 \u062E\u0648\u062F\u0631\u0648',
  electronics: '\u062E\u0631\u06CC\u062F \u0648 \u0641\u0631\u0648\u0634 \u0644\u0648\u0627\u0632\u0645 \u0627\u0644\u06A9\u062A\u0631\u0648\u0646\u06CC\u06A9',
  'home-appliances': '\u062E\u0631\u06CC\u062F \u0648 \u0641\u0631\u0648\u0634 \u0644\u0648\u0627\u0632\u0645 \u062E\u0627\u0646\u06AF\u06CC',
  services: '\u062E\u062F\u0645\u0627\u062A',
  jobs: '\u0627\u0633\u062A\u062D\u062F\u0627\u0645 \u0648 \u06A9\u0627\u0631\u06CC\u0627\u0628\u06CC',
  'personal-items': '\u062E\u0631\u06CC\u062F \u0648 \u0641\u0631\u0648\u0634 \u06A9\u0627\u0644\u0627',
  entertainment: '\u062E\u0631\u06CC\u062F \u0648 \u0641\u0631\u0648\u0634 \u0633\u0631\u06AF\u0631\u0645\u06CC',
};

export interface CategorySeoHeadingInput {
  listingType: BrowseListingType;
  categorySlug?: string | null;
  parentCategorySlug?: string | null;
  categoryTitle?: string | null;
  parentCategoryTitle?: string | null;
}

function isRepairLeaf(slug: string | null | undefined): boolean {
  return Boolean(slug && (REPAIR_LEAF_SLUGS as ReadonlySet<string>).has(slug));
}

function repairNeedSubject(
  categorySlug: string | null | undefined,
  categoryTitle: string
): string {
  if (categorySlug === 'general-handyman-repair') return categoryTitle;
  if (categorySlug === 'repairs') return '\u062A\u0639\u0645\u06CC\u0631\u0627\u062A';
  return `\u062A\u0639\u0645\u06CC\u0631\u0627\u062A ${categoryTitle}`;
}

/** SEO subject phrase (without location suffix). */
export function resolveCategorySeoSubject(input: CategorySeoHeadingInput): string | null {
  const {
    listingType,
    categorySlug,
    parentCategorySlug,
    categoryTitle,
    parentCategoryTitle,
  } = input;

  if (!categoryTitle?.trim()) return null;

  const title = categoryTitle.trim();

  if (listingType === 'business') {
    if (parentCategorySlug === 'repairs' && isRepairLeaf(categorySlug)) {
      return `\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631\u0627\u0646 ${title}`;
    }
    if (categorySlug === 'repairs' || (categorySlug && isRepairLeaf(categorySlug))) {
      return categorySlug === 'repairs'
        ? '\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631\u0627\u0646'
        : `\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631\u0627\u0646 ${title}`;
    }
    if (categorySlug && SERVICE_NEED_SUBJECT[categorySlug]) {
      return `\u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u0647\u0627\u06CC ${SERVICE_NEED_SUBJECT[categorySlug]}`;
    }
    if (categorySlug && ROOT_NEED_SUBJECT[categorySlug]) {
      return `\u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u0647\u0627\u06CC ${ROOT_NEED_SUBJECT[categorySlug]}`;
    }
    if (parentCategoryTitle) return `${parentCategoryTitle} \u2014 ${title}`;
    return title;
  }

  if (parentCategorySlug === 'repairs' && isRepairLeaf(categorySlug)) {
    return repairNeedSubject(categorySlug, title);
  }
  if (categorySlug && isRepairLeaf(categorySlug)) {
    return repairNeedSubject(categorySlug, title);
  }
  if (categorySlug === 'repairs') {
    return '\u062A\u0639\u0645\u06CC\u0631\u0627\u062A';
  }

  if (categorySlug && SERVICE_NEED_SUBJECT[categorySlug]) {
    return SERVICE_NEED_SUBJECT[categorySlug];
  }

  if (parentCategorySlug && REAL_ESTATE_PARENT_SUBJECT[parentCategorySlug]) {
    return `${REAL_ESTATE_PARENT_SUBJECT[parentCategorySlug]} \u2014 ${title}`;
  }

  if (categorySlug && ROOT_NEED_SUBJECT[categorySlug]) {
    return ROOT_NEED_SUBJECT[categorySlug];
  }

  if (parentCategorySlug === 'car' || categorySlug === 'car') {
    return `\u062E\u0631\u06CC\u062F \u0648 \u0641\u0631\u0648\u0634 \u062E\u0648\u062F\u0631\u0648 \u2014 ${title}`;
  }

  if (parentCategorySlug === 'jobs' || categorySlug === 'jobs') {
    return `\u0627\u0633\u062A\u062D\u062F\u0627\u0645 \u0648 \u06A9\u0627\u0631\u06CC\u0627\u0628\u06CC \u2014 ${title}`;
  }

  if (parentCategoryTitle) {
    return `${parentCategoryTitle} \u2014 ${title}`;
  }

  return title;
}

export function buildCategorySeoH1(
  input: CategorySeoHeadingInput & { locationLabel: string }
): string {
  const { listingType, locationLabel } = input;
  const subject = resolveCategorySeoSubject(input);

  if (!subject) {
    return listingType === 'business'
      ? `\u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u0647\u0627 \u062F\u0631 ${locationLabel}`
      : `\u0646\u06CC\u0627\u0632\u0647\u0627 \u062F\u0631 ${locationLabel}`;
  }

  if (listingType === 'business') {
    const phrase = subject.startsWith('\u06A9\u0633\u0628') ? subject : `\u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u0647\u0627\u06CC ${subject}`;
    return `${phrase} \u062F\u0631 ${locationLabel}`;
  }

  return `${subject} \u062F\u0631 ${locationLabel}`;
}

export function buildCategorySeoDescription(opts: {
  listingType: BrowseListingType;
  locationLabel: string;
  siteName: string;
  subject: string | null;
}): string {
  const { listingType, locationLabel, siteName, subject } = opts;
  const where =
    locationLabel === '\u0633\u0631\u0627\u0633\u0631 \u0627\u06CC\u0631\u0627\u0646'
      ? '\u0633\u0631\u0627\u0633\u0631 \u0627\u06CC\u0631\u0627\u0646'
      : locationLabel;

  if (!subject) {
    return listingType === 'business'
      ? `\u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u0647\u0627 \u062F\u0631 ${where} \u062F\u0631 ${siteName}.`
      : `\u062C\u062F\u06CC\u062F\u062A\u0631\u06CC\u0646 \u0646\u06CC\u0627\u0632\u0647\u0627 \u0648 \u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u0647\u0627 \u062F\u0631 ${where} \u062F\u0631 ${siteName}.`;
  }

  if (listingType === 'business') {
    return `${subject} \u062F\u0631 ${where} \u0631\u0627 \u062F\u0631 ${siteName} \u0645\u0634\u0627\u0647\u062F\u0647 \u0648 \u0645\u0642\u0627\u06CC\u0633\u0647 \u06A9\u0646\u06CC\u062F.`;
  }

  if (subject.startsWith('\u062A\u0639\u0645\u06CC\u0631')) {
    return `${subject} \u062F\u0631 ${where} \u2014 \u062B\u0628\u062A \u0646\u06CC\u0627\u0632 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0648 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0627\u0632 \u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631\u0627\u0646 \u062F\u0631 ${siteName}.`;
  }

  return `${subject} \u062F\u0631 ${where} \u2014 \u062B\u0628\u062A \u0646\u06CC\u0627\u0632 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0648 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u062F\u0631 ${siteName}.`;
}
