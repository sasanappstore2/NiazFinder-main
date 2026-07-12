import type { CrawlBlueprint } from '@/lib/filing/ingest/crawl-blueprint';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';

/** Pre-built blueprint for ShowMelk-style filing portals (div.box.file.clearfix cards). */
export const SHOWMELK_BLUEPRINT: CrawlBlueprint = {
  version: 2,
  auth: {
    waitAfterLoginMs: 3000,
  },
  antiBot: {
    minDelayMs: 1000,
    maxDelayMs: 3500,
    scrollJitter: true,
    viewportRandomize: true,
  },
  listPage: {
    containerSelector: 'div.box.file.clearfix',
    itemLinkSelector: 'a[href]',
    dedupField: 'fileCode',
    pagination: {
      mode: 'nextButton',
      selector: 'a.next, .pagination a:has-text("بعدی")',
      maxPages: 20,
    },
  },
  detailPage: {
    enabled: false,
    linkFromList: true,
    waitMs: 2000,
    skipIfKnown: true,
  },
  fieldMap: {
    title: {
      scope: 'item',
      selector: '.title, h3, h4, .file-title',
      attr: 'textContent',
      transform: 'trim',
    },
    fileCode: {
      scope: 'item',
      attr: 'textContent',
      regex: 'کد\\s*فایل[:\\s]*(\\d+)',
      regexGroup: 1,
    },
    deposit: {
      scope: 'item',
      attr: 'textContent',
      regex: 'مبلغ\\s*رهن[:\\s]*([\\d,]+)',
      regexGroup: 1,
      transform: 'toman',
    },
    monthlyRent: {
      scope: 'item',
      attr: 'textContent',
      regex: 'مبلغ\\s*اجاره[:\\s]*([\\d,]+)',
      regexGroup: 1,
      transform: 'toman',
    },
    floor: {
      scope: 'item',
      attr: 'textContent',
      regex: 'طبقه[:\\s]*(\\d+)',
      regexGroup: 1,
      transform: 'digits',
    },
    area: {
      scope: 'item',
      attr: 'textContent',
      regex: '(\\d+)\\s*متری',
      regexGroup: 1,
    },
    location: {
      scope: 'item',
      attr: 'textContent',
      regex: '(مشهد|تهران|اصفهان|شیراز|تبریز)[^\\n]*',
      regexGroup: 0,
      transform: 'trim',
    },
    dealType: {
      scope: 'item',
      attr: 'textContent',
      regex: '(رهن و اجاره|فروش|رهن کامل|پیش\\s*فروش)',
      regexGroup: 1,
    },
    propertyKind: {
      scope: 'item',
      attr: 'textContent',
      regex: '(آپارتمان|ویلا|زمین|تجاری|مغازه|دفتر)',
      regexGroup: 1,
    },
  },
  titleTemplate: '{dealType} {propertyKind} {area} متری',
  neighborhoodParse: {
    splitOn: '-',
    cityIndex: 0,
    neighborhoodIndex: 1,
  },
  llmFallback: {
    enabled: true,
    customPrompt:
      'از متن هر کارت املاک فیلدهای title، fileCode، dealType، propertyKind، city، neighborhood، deposit، monthlyRent، area، floor را استخراج کن.',
  },
};

export const FILING_BLUEPRINT_TEMPLATES = [
  { id: 'showmelk', label: 'ShowMelk / کارت box.file', blueprint: SHOWMELK_BLUEPRINT },
  { id: 'maskanyaban', label: 'مسکن یابان / listing-item', blueprint: MASKANYABAN_BLUEPRINT },
  { id: 'blank', label: 'خالی (دستی)', blueprint: { version: 2 as const } },
] as const;
