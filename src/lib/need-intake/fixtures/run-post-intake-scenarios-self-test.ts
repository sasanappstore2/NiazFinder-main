/**
 * Regression scenarios for /post intake logic (rules-only, no MLX).
 */
import { composeIntakeSourceText } from '@/lib/need-intake/compose-source-text';
import {
  inferEntitiesFromCategorySlugs,
  projectNeedDraftFromForm,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import {
  aiDescriptionConflictsSource,
  pickListingTitleWithDealGuard,
} from '@/lib/need-intake/listing-copy-guards';
import { buildListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import {
  resolveLegacyDealType,
  resolveTransactionType,
  transactionTypeFromSourceText,
} from '@/lib/need-intake/resolve-transaction-type';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';

const SHOP_RAHN_TEXT =
  'میخواستم تا سقف سرامیک باشه یک میلیارد رهن دارم ۱۰۰ میلیون اجاره';

function assert(cond: boolean, msg: string): string | null {
  return cond ? null : msg;
}

function run(): { failed: string[] } {
  const failed: string[] = [];

  const tx = transactionTypeFromSourceText(SHOP_RAHN_TEXT);
  failed.push(assert(tx === 'DEPOSIT_AND_RENT', `tx: got ${tx}`) ?? '');

  const shopSaleEntities = inferEntitiesFromCategorySlugs('commercial-sale', 'shop-sale', {
    sourceText: SHOP_RAHN_TEXT,
  });
  failed.push(
    assert(
      shopSaleEntities.transactionType === 'DEPOSIT_AND_RENT',
      `category+text tx: ${shopSaleEntities.transactionType}`
    ) ?? ''
  );

  const draft = recomputeNeedDraft(
    projectNeedDraftFromForm(null, {
      needText: 'مغازه در خیابان سجاد مشهد',
      detailsText: 'تا سقف سرامیک باشه یک میلیارد رهن دارم ۱۰۰ میلیون اجاره',
      categorySlug: 'commercial-sale',
      subcategorySlug: 'shop-sale',
      city: 'مشهد',
      neighborhood: 'سجاد',
      neighborhoodSlug: null,
    })
  );

  const legacy = draftToLegacyPayload(draft);
  failed.push(
    assert(legacy.answers.dealType === 'rent_rahn_ejare', `dealType: ${legacy.answers.dealType}`) ??
      ''
  );
  failed.push(
    assert(Number(legacy.answers.rahnAmount) === 1_000_000_000, `rahn: ${legacy.answers.rahnAmount}`) ??
      ''
  );
  failed.push(
    assert(
      Number(legacy.answers.monthlyRent) === 100_000_000,
      `rent: ${legacy.answers.monthlyRent}`
    ) ?? ''
  );
  failed.push(assert(legacy.answers.budget == null, `budget should be empty: ${legacy.answers.budget}`) ?? '');

  const title = resolveDeterministicListingTitle(draft).title;
  failed.push(assert(/رهن/u.test(title), `title missing رهن: ${title}`) ?? '');
  failed.push(assert(!/^فروش/u.test(title), `title must not start with فروش: ${title}`) ?? '');

  const ctx = buildListingCopyContext(draft);
  failed.push(assert(ctx.dealTypeFa === 'رهن و اجاره', `dealTypeFa: ${ctx.dealTypeFa}`) ?? '');
  failed.push(
    assert(!ctx.categoryPathFa.includes('فروش'), `categoryPathFa still has فروش: ${ctx.categoryPathFa}`) ??
      ''
  );

  const baseline = title;
  const badAi = 'فروش مغازه در ابتدای خیابان سجاد، مشهد';
  failed.push(
    assert(
      pickListingTitleWithDealGuard(baseline, badAi, draft.sourceText) === baseline,
      'AI sale title should be rejected'
    ) ?? ''
  );

  failed.push(
    assert(
      aiDescriptionConflictsSource(
        'فروش مغازه در سجاد با شرایط عالی',
        draft.sourceText,
        ctx.dealTypeFa
      ),
      'AI sale description should conflict'
    ) ?? ''
  );

  const parsed = applyPropertySlotsToParsed(parseIntentFromText(SHOP_RAHN_TEXT));
  const answers = seedAnswersFromParsed(parsed);
  failed.push(
    assert(
      resolveLegacyDealType(parsed.entities?.dealType, resolveTransactionType({
        sourceText: SHOP_RAHN_TEXT,
        categorySlug: 'commercial-sale',
        subcategorySlug: 'shop-sale',
      })) === 'rent_rahn_ejare',
      'resolveLegacyDealType failed'
    ) ?? ''
  );
  failed.push(
    assert(
      composeIntakeSourceText('need', 'details').includes('\n'),
      'compose source multiline'
    ) ?? ''
  );

  return { failed: failed.filter(Boolean) };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-post-intake-scenarios-self-test'));

if (isDirectRun) {
  const { failed } = run();
  if (failed.length) {
    console.error('post-intake-scenarios FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log('post-intake-scenarios OK');
}

export { run as runPostIntakeScenariosSelfTest };
