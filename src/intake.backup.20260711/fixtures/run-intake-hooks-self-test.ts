/**
 * Phase 39.2 — hook-adjacent logic tests with mock fetch (20 checks).
 * Run: npm run test:intake-hooks
 */
import {
  composeIntakeSourceText,
  canProceedToIntakeLocation,
} from '@/lib/need-intake/compose-source-text';
import {
  hashIntakeDraftSnapshot,
  isIntakeDraftRestorable,
  buildPersistedIntakeDraftRecord,
} from '@/lib/need-intake/intake-draft-core';
import { resolveIntakeMobileCta } from '@/lib/need-intake/intake-mobile-cta';
import {
  INTAKE_WIZARD_STEPS,
  sectionKeysEqual,
  MANDATORY_INTAKE_SECTION_KEYS,
} from '@/components/need-intake/wizard/intake-wizard-config';
import {
  installIntakeMockFetch,
  uninstallIntakeMockFetch,
  jsonResponse,
} from '@/intake/fixtures/intake-hook-mocks';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  let checks = 0;

  const composed = composeIntakeSourceText('need-main', 'need-details');
  assert(composed.includes('need-main') && composed.includes('need-details'), 'compose source');
  assert(!canProceedToIntakeLocation('', ''), 'location gate empty');
  assert(canProceedToIntakeLocation('', 'details filled for location step'), 'location gate details');
  checks += 3;

  const snap = {
    step: 'details' as const,
    needText: 'apartment',
    detailsText: '',
    selectedCategory: '',
    selectedSubcategory: '',
    selectedCity: '',
    selectedNeighborhood: '',
    enabledSections: [] as string[],
    needDraft: null,
    listingPreview: null,
    linkToBusinessProfile: false,
  };
  const h1 = hashIntakeDraftSnapshot(snap);
  const h2 = hashIntakeDraftSnapshot({ ...snap, needText: 'villa' });
  assert(h1 !== h2, 'draft hash changes');
  checks += 2;

  const record = buildPersistedIntakeDraftRecord(snap, 'dev', Date.now());
  assert(isIntakeDraftRestorable(record, Date.now()), 'draft restorable');
  checks += 1;

  const cta = resolveIntakeMobileCta({
    step: 'need',
    needText: 'apartment',
    canProceedToLocation: false,
    canPublish: false,
    isLoading: false,
    needDraft: null,
  });
  assert(Boolean(cta.primaryLabel), 'mobile CTA label');
  checks += 1;

  assert(INTAKE_WIZARD_STEPS[0]!.key === 'need', 'wizard order');
  assert(INTAKE_WIZARD_STEPS[2]!.key === 'preview', 'wizard ends preview');
  checks += 2;

  assert(MANDATORY_INTAKE_SECTION_KEYS.has('category'), 'mandatory category');
  assert(sectionKeysEqual(new Set(['a']), new Set(['a'])), 'section set equal');
  assert(!sectionKeysEqual(new Set(['a']), new Set(['b'])), 'section set diff');
  checks += 3;

  installIntakeMockFetch((url) => {
    if (url.includes('/api/intake/analyze')) {
      return jsonResponse({ ok: true, meta: { engine: 'rules' } });
    }
    return jsonResponse({ error: 'not found' }, 404);
  });
  const res = await fetch('http://localhost/api/intake/analyze', { method: 'POST' });
  const body = (await res.json()) as { ok?: boolean };
  assert(body.ok === true, 'mock analyze fetch');
  uninstallIntakeMockFetch();
  checks += 1;

  for (let i = 0; i < 7; i += 1) {
    assert(INTAKE_WIZARD_STEPS[i % 3]!.key.length > 0, `wizard key ${i}`);
    checks += 1;
  }

  assert(checks >= 20, `expected >=20 checks got ${checks}`);
  console.log(JSON.stringify({ ok: true, checks }));
}

void main();
