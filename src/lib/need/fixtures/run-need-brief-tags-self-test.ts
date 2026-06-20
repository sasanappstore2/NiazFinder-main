import { buildNeedBriefTags, formatDealTypeTag } from '@/lib/need/format-need-brief-tags';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const SHOP_RENT = 'shop-rent';
const COMMERCIAL = 'commercial-rent';

const labels = buildNeedBriefTags({
  tags: ['property_search', COMMERCIAL, SHOP_RENT, 'rent_rahn_ejare'],
  dynamicAnswers: {
    entities: {
      categorySlug: COMMERCIAL,
      subcategorySlug: SHOP_RENT,
    },
    dealType: 'rent_rahn_ejare',
  },
});

assert(labels.length >= 2, `expected >=2 labels, got ${labels.length}`);
assert(
  labels.some((l) => l.includes('\u0645\u063A\u0627\u0632\u0647')),
  `expected shop label, got ${labels.join(' | ')}`
);
assert(
  labels.some((l) => l.includes('\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647')),
  `expected deal label, got ${labels.join(' | ')}`
);
assert(!labels.some((l) => l.includes('property_search')), 'no raw intent slug');
assert(!labels.some((l) => l.includes('shop-rent')), 'no raw slug');

assert(formatDealTypeTag('rent_rahn_ejare') === '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647', 'deal type label');

console.log('format-need-brief-tags self-test OK');
