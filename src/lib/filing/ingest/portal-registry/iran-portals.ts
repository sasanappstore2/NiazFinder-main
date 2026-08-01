import type { PortalFamilyId } from '@/lib/filing/ingest/portal-families/types';

export type PortalCatalogStatus = 'verified' | 'beta' | 'unverified';

export type PortalCatalogEntry = {
  siteKey: string;
  name: string;
  portalFamily?: PortalFamilyId;
  /** Example login URLs (operator replaces with real tenant URL). */
  loginUrlExamples?: string[];
  knownLoginPatterns?: string[];
  defaultListPathHints?: string[];
  status: PortalCatalogStatus;
  notes?: string;
};

/** Curated Iranian real-estate filing portals (expand with fixtures + live tests). */
export const IRAN_FILING_PORTALS: PortalCatalogEntry[] = [
  {
    siteKey: 'showmelk',
    name: 'شوملک (ShowMelk)',
    portalFamily: 'showmelk',
    loginUrlExamples: ['https://showmelk.com/login'],
    defaultListPathHints: ['/list', '/files', '/MelkList'],
    status: 'verified',
    notes: 'کارت div.box.file.clearfix — fixture و blueprint آماده',
  },
  {
    siteKey: 'maskanyaban',
    name: 'مسکن‌یابان',
    portalFamily: 'maskanyaban',
    loginUrlExamples: ['https://maskanyaban.com/login'],
    defaultListPathHints: ['/listings', '/properties', '/dashboard'],
    status: 'verified',
    notes: 'کارت listing-item.property-card — fixture و blueprint آماده',
  },
  {
    siteKey: 'melkify',
    name: 'ملکی‌فای',
    portalFamily: 'generic_iran_filing',
    knownLoginPatterns: ['melkify'],
    defaultListPathHints: ['/panel', '/files'],
    status: 'beta',
    notes: 'نیاز به fixture و تست زنده',
  },
  {
    siteKey: 'filemelk',
    name: 'فایل‌ملک',
    portalFamily: 'generic_iran_filing',
    knownLoginPatterns: ['filemelk', 'file-melk'],
    defaultListPathHints: ['/files', '/archive'],
    status: 'beta',
  },
  {
    siteKey: 'amlakfile',
    name: 'املاک فایل',
    portalFamily: 'generic_iran_filing',
    knownLoginPatterns: ['amlakfile', 'amlak-file'],
    status: 'unverified',
  },
  {
    siteKey: 'iranfile',
    name: 'ایران فایل',
    portalFamily: 'generic_iran_filing',
    knownLoginPatterns: ['iranfile'],
    status: 'unverified',
  },
  {
    siteKey: 'melkfile',
    name: 'ملک فایل',
    portalFamily: 'generic_iran_filing',
    knownLoginPatterns: ['melkfile'],
    status: 'unverified',
  },
  {
    siteKey: 'iran-batch',
    name: 'ایران batch (stress)',
    portalFamily: 'generic_iran_filing',
    status: 'verified',
    notes: 'fixture synthetic 1000 کارت — تست DOM',
  },
  {
    siteKey: 'custom',
    name: 'سایت دیگر',
    portalFamily: 'generic_iran_filing',
    status: 'unverified',
    notes: 'فقط آدرس ورود کافی است — کلید سایت خودکار ساخته می‌شود',
  },
];

export function getPortalBySiteKey(siteKey: string): PortalCatalogEntry | undefined {
  return IRAN_FILING_PORTALS.find((p) => p.siteKey === siteKey);
}

export function applyPortalToWizardDefaults(
  portal: PortalCatalogEntry,
  current: { siteKey: string; name: string; loginUrl: string; listingsUrl: string }
): { siteKey: string; name: string; loginUrl: string; listingsUrl: string } {
  const loginExample = portal.loginUrlExamples?.[0] ?? '';
  let listingsUrl = current.listingsUrl;
  if (!listingsUrl && loginExample && portal.defaultListPathHints?.[0]) {
    try {
      const u = new URL(loginExample);
      listingsUrl = `${u.origin}${portal.defaultListPathHints[0]}`;
    } catch {
      /* keep */
    }
  }
  return {
    siteKey: portal.siteKey === 'custom' ? '' : portal.siteKey,
    name: portal.siteKey === 'custom' ? current.name : portal.name,
    loginUrl: current.loginUrl || loginExample,
    listingsUrl,
  };
}

export function portalStatusLabel(status: PortalCatalogStatus): string {
  if (status === 'verified') return 'تأییدشده';
  if (status === 'beta') return 'آزمایشی';
  return 'بررسی‌نشده';
}
