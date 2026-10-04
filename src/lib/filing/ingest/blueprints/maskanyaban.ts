import type { CrawlBlueprint } from '@/lib/filing/ingest/crawl-blueprint';

/**
 * Production blueprint for maskanyaban.ir
 * List cards load via POST /Melk/_SelectAll (AJAX HTML fragment).
 * Detail pages are SSR at /home/{id}/...
 */
export const MASKANYABAN_BLUEPRINT: CrawlBlueprint = {
  version: 2,
  portalFamily: 'maskanyaban',
  auth: {
    usernameSelector: 'input#UserName, input[name="UserName"]',
    passwordSelector: 'input#Password, input[name="Password"]',
    submitSelector: 'button[type="submit"], input[type="submit"]',
    waitAfterLoginMs: 2500,
    loginSuccessUrlPattern: '/Melk|/Admin|/estate',
  },
  antiBot: {
    minDelayMs: 600,
    maxDelayMs: 1800,
    maxRetries: 5,
    warmup: true,
    usePlaywrightFallback: true,
    scrollJitter: false,
    viewportRandomize: false,
  },
  listPage: {
    fetchMode: 'ajaxHtml',
    containerSelector: 'a[id][href*="/home/"]',
    dedupField: 'fileCode',
    pagination: {
      mode: 'ajaxPost',
      urlTemplate: 'https://maskanyaban.ir/Melk/_SelectAll?page={page}',
      maxPages: 30,
    },
  },
  listApi: {
    baseUrl: 'https://maskanyaban.ir',
    endpoint: '/Melk/_SelectAll',
    method: 'POST',
    pageParam: 'page',
    pageSize: 20,
    contentType: 'application/json',
    filters: {},
  },
  detailPage: {
    enabled: true,
    linkFromList: true,
    enrichAfterImport: true,
    waitMs: 0,
    skipIfKnown: false,
    maxConcurrent: 2,
    delayMs: 800,
  },
  fieldMap: {
    dealType: {
      scope: 'item',
      selector: '.size .small, .sizeWithImg .small',
      attr: 'textContent',
      transform: 'trim',
    },
    propertyKind: {
      scope: 'item',
      selector: '.size .small, .sizeWithImg .small',
      attr: 'textContent',
      transform: 'trim',
    },
    fileCode: {
      scope: 'item',
      selector: '.file-code span',
      attr: 'textContent',
      transform: 'digits',
    },
    area: {
      scope: 'item',
      selector: '.size .large, .sizeWithImg .large',
      attr: 'textContent',
      transform: 'digits',
    },
    location: {
      scope: 'item',
      selector: 'h2',
      attr: 'textContent',
      transform: 'trim',
    },
    price: {
      scope: 'item',
      selector: '.pricing .item .title',
      attr: 'textContent',
      regex: 'مبلغ\\s*کل',
      regexGroup: 0,
    },
    pricePerMeter: {
      scope: 'item',
      selector: '.pricing .item .PriceKama',
      attr: 'textContent',
      transform: 'toman',
    },
    deposit: {
      scope: 'item',
      attr: 'textContent',
      regex: 'مبلغ\\s*رهن[\\s\\S]*?PriceKama">(\\d+)',
      regexGroup: 1,
      transform: 'toman',
    },
    monthlyRent: {
      scope: 'item',
      attr: 'textContent',
      regex: 'مبلغ\\s*اجاره[\\s\\S]*?PriceKama">(\\d+)',
      regexGroup: 1,
      transform: 'toman',
    },
    floor: {
      scope: 'item',
      selector: '.features .item span',
      attr: 'textContent',
      regex: 'طبقه\\s*(\\d+)',
      regexGroup: 1,
      transform: 'digits',
    },
    rooms: {
      scope: 'item',
      selector: '.features .item span',
      attr: 'textContent',
      regex: '(\\d+)\\s*خواب',
      regexGroup: 1,
      transform: 'digits',
    },
    buildingAge: {
      scope: 'item',
      selector: '.features .item span',
      attr: 'textContent',
      regex: '(\\d+)\\s*سال\\s*ساخت',
      regexGroup: 1,
      transform: 'digits',
    },
    documentType: {
      scope: 'item',
      selector: '.features .item span',
      attr: 'textContent',
      regex: 'سند\\s+(.+)',
      regexGroup: 1,
      transform: 'trim',
    },
    postedAt: {
      scope: 'item',
      selector: '.FDate',
      attr: 'textContent',
      transform: 'trim',
    },
  },
  titleTemplate: '{dealType} {propertyKind} {area} متری',
  neighborhoodParse: {
    splitOn: '-',
    cityIndex: 0,
    neighborhoodIndex: 1,
  },
  llmFallback: {
    enabled: false,
  },
};
