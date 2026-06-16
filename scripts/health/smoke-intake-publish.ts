/**
 * Smoke: register user + publish a minimal valid need via /api/need-intake/publish
 * Run: npx tsx scripts/health/smoke-intake-publish.ts
 */
import {
  patchNeedDraftEntities,
  projectNeedDraftFromForm,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';

async function main(): Promise<void> {
  const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
  const email = `smoke-publish-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  const reg = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Smoke', lastName: 'Test' }),
  });
  const regData = (await reg.json()) as { token?: string; error?: string };
  if (!reg.ok || !regData.token) {
    console.error('register failed', reg.status, regData);
    process.exit(1);
  }

  const draft = recomputeNeedDraft(
    patchNeedDraftEntities(
      projectNeedDraftFromForm(null, {
        needText: '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628 \u0627\u062C\u0627\u0631\u0647 \u062F\u0631 \u0645\u0634\u0647\u062F',
        detailsText: '\u0628\u0648\u062F\u0698\u0647 \u062A\u0627 \uDBB0\uDC5F \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F',
        categorySlug: 'real-estate',
        subcategorySlug: 'apartment-rent',
        city: '\u0645\u0634\u0647\u062F',
        neighborhood: '\u0633\u062C\u0627\u062F',
        neighborhoodSlug: null,
      }),
      { lat: 36.2972, lng: 59.6067 }
    )
  );

  const validation = validateNeedDraftForPublish(draft);
  if (!validation.success) {
    console.error('validation failed', validation.errors);
    process.exit(1);
  }

  const composed = composeListingFromDraft(draft);
  const listingPreview = {
    title: resolveDeterministicListingTitle(draft).title,
    description: composed.description,
    titleSource: 'template' as const,
  };

  const pub = await fetch(`${baseUrl}/api/need-intake/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.token}`,
    },
    body: JSON.stringify({ draft, listingPreview }),
  });
  const pubData = (await pub.json()) as { id?: string; error?: string; code?: string };

  if (!pub.ok) {
    console.error('publish failed', pub.status, pubData);
    process.exit(1);
  }

  console.log('smoke-intake-publish OK:', pubData.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
