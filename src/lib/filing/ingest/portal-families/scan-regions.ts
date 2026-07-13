import type { CrawlBlueprint, FilingFieldKey } from '@/lib/filing/ingest/crawl-blueprint';
import {
  CONFIDENCE_THRESHOLD_REQUIRED,
  CRITICAL_FILING_FIELDS,
  type FieldGuess,
  type SiteIndex,
} from '@/lib/filing/ingest/portal-families/types';

export type ScanRegionStatus = 'found' | 'uncertain' | 'missing';

export type ScanRegionKind = 'login' | 'list' | 'pagination' | 'field';

export type ScanRegion = {
  id: string;
  kind: ScanRegionKind;
  label: string;
  hint?: string;
  selector?: string;
  containerSelector?: string;
  innerSelector?: string;
  pickTarget:
    | 'usernameSelector'
    | 'passwordSelector'
    | 'submitSelector'
    | 'containerSelector'
    | 'itemLinkSelector'
    | `field:${FilingFieldKey}`
    | null;
  confidence: number;
  value?: string;
  status: ScanRegionStatus;
};

const FIELD_LABELS: Record<string, string> = {
  title: 'عنوان آگهی',
  fileCode: 'کد فایل',
  dealType: 'نوع معامله',
  propertyKind: 'نوع ملک',
  neighborhood: 'محله',
  location: 'آدرس / محله',
  deposit: 'مبلغ رهن',
  monthlyRent: 'مبلغ اجاره',
  price: 'قیمت فروش',
  area: 'متراژ',
  rooms: 'تعداد اتاق',
  floor: 'طبقه',
};

const STANDARD_FIELDS: FilingFieldKey[] = [
  'fileCode',
  'dealType',
  'propertyKind',
  'neighborhood',
  'deposit',
  'monthlyRent',
  'price',
  'area',
  'floor',
  'rooms',
  'location',
];

function regionStatus(confidence: number, hasSelector: boolean): ScanRegionStatus {
  if (!hasSelector && confidence <= 0) return 'missing';
  if (confidence >= CONFIDENCE_THRESHOLD_REQUIRED) return 'found';
  if (confidence > 0) return 'uncertain';
  return 'missing';
}

const PAGE_KIND_LABELS: Record<string, string> = {
  login: 'صفحه ورود',
  list: 'صفحه لیست فایل‌ها',
  home: 'صفحه اصلی',
  unknown: 'صفحه ناشناخته',
};

export function pageKindLabel(kind: SiteIndex['pageKind']): string {
  return PAGE_KIND_LABELS[kind] ?? kind;
}

/** Build clickable scan regions from discovery output + compiled blueprint. */
export function buildScanRegions(input: {
  siteIndex: SiteIndex;
  fieldGuesses: FieldGuess[];
  blueprint: CrawlBlueprint;
}): ScanRegion[] {
  const { siteIndex, fieldGuesses, blueprint } = input;
  const regions: ScanRegion[] = [];
  const container = blueprint.listPage?.containerSelector ?? siteIndex.bestListRegion?.containerSelector;

  const login = siteIndex.loginForm;
  if (login?.usernameSelector) {
    regions.push({
      id: 'login-username',
      kind: 'login',
      label: 'فیلد نام کاربری',
      hint: 'اینجا کاربر وارد می‌شود',
      selector: login.usernameSelector,
      pickTarget: 'usernameSelector',
      confidence: login.confidence ?? 0.85,
      status: regionStatus(login.confidence ?? 0.85, true),
    });
  }
  if (login?.passwordSelector) {
    regions.push({
      id: 'login-password',
      kind: 'login',
      label: 'فیلد رمز عبور',
      selector: login.passwordSelector,
      pickTarget: 'passwordSelector',
      confidence: login.confidence ?? 0.9,
      status: regionStatus(login.confidence ?? 0.9, true),
    });
  }
  if (login?.submitSelector) {
    regions.push({
      id: 'login-submit',
      kind: 'login',
      label: 'دکمه ورود',
      selector: login.submitSelector,
      pickTarget: 'submitSelector',
      confidence: login.confidence ?? 0.8,
      status: regionStatus(login.confidence ?? 0.8, true),
    });
  }
  if (!login && siteIndex.pageKind === 'login') {
    regions.push({
      id: 'login-missing',
      kind: 'login',
      label: 'فرم ورود',
      hint: 'شناسایی نشد — روی صفحه کلیک کنید تا انتخاب کنید',
      pickTarget: 'usernameSelector',
      confidence: 0,
      status: 'missing',
    });
  }

  if (container) {
    const cardCount = siteIndex.bestListRegion?.cardCount ?? 0;
    regions.push({
      id: 'list-container',
      kind: 'list',
      label: 'باکس آگهی‌ها',
      hint: cardCount > 0 ? `${cardCount} کارت تکراری شناسایی شد` : 'کانتینر لیست',
      selector: container,
      pickTarget: 'containerSelector',
      confidence: siteIndex.bestListRegion?.score ? Math.min(0.98, siteIndex.bestListRegion.score / 100) : 0.75,
      value: cardCount > 0 ? `${cardCount} آگهی` : undefined,
      status: regionStatus(siteIndex.bestListRegion?.score ? siteIndex.bestListRegion.score / 100 : 0.75, true),
    });
  } else if (siteIndex.pageKind === 'list') {
    regions.push({
      id: 'list-missing',
      kind: 'list',
      label: 'باکس آگهی‌ها',
      hint: 'کارت‌های تکراری پیدا نشد — دستی انتخاب کنید',
      pickTarget: 'containerSelector',
      confidence: 0,
      status: 'missing',
    });
  }

  const pagination = siteIndex.pagination;
  const paginationSelector =
    pagination?.selector ?? blueprint.listPage?.pagination?.selector;
  if (paginationSelector) {
    regions.push({
      id: 'pagination',
      kind: 'pagination',
      label: 'صفحه‌بندی',
      hint: 'دکمه صفحه بعد',
      selector: paginationSelector,
      pickTarget: null,
      confidence: pagination?.confidence ?? 0.7,
      status: regionStatus(pagination?.confidence ?? 0.7, true),
    });
  }

  const guessByKey = new Map(fieldGuesses.map((g) => [g.key, g]));
  for (const key of STANDARD_FIELDS) {
    const g = guessByKey.get(key);
    const ext = g?.extractor;
    const fieldSpec = blueprint.fieldMap?.[key];
    const relSelector = ext?.selector ?? fieldSpec?.selector;
    const hasRegex = Boolean(ext?.regex ?? fieldSpec?.regex);

    if (g || fieldSpec) {
      regions.push({
        id: `field-${key}`,
        kind: 'field',
        label: FIELD_LABELS[key] ?? key,
        containerSelector: container,
        innerSelector: relSelector,
        selector: relSelector && !container ? relSelector : undefined,
        pickTarget: `field:${key}`,
        confidence: g?.confidence ?? (hasRegex ? 0.65 : 0),
        value: g?.value,
        status: regionStatus(
          g?.confidence ?? (hasRegex ? 0.65 : 0),
          Boolean(relSelector || hasRegex)
        ),
      });
      continue;
    }

    if (CRITICAL_FILING_FIELDS.includes(key)) {
      regions.push({
        id: `field-${key}-missing`,
        kind: 'field',
        label: FIELD_LABELS[key] ?? key,
        hint: 'شناسایی نشد',
        pickTarget: `field:${key}`,
        confidence: 0,
        status: 'missing',
      });
    }
  }

  return regions;
}

export function scanSummary(regions: ScanRegion[]): {
  found: number;
  uncertain: number;
  missing: number;
  total: number;
} {
  let found = 0;
  let uncertain = 0;
  let missing = 0;
  for (const r of regions) {
    if (r.status === 'found') found += 1;
    else if (r.status === 'uncertain') uncertain += 1;
    else missing += 1;
  }
  return { found, uncertain, missing, total: regions.length };
}
