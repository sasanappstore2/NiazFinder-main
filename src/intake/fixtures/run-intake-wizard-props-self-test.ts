/**
 * Wizard panel wiring ? buildIntakeWizardStepContentProps + map scope guards.
 * Run: npm run test:intake-wizard-props
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIntakeWizardStepContentProps } from '@/components/need-intake/wizard/build-intake-wizard-step-props';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  let checks = 0;

  const panelHook = read('src/hooks/use-need-intake-panel.ts');
  assert(panelHook.includes('buildIntakeWizardStepContentProps'), 'panel uses step props builder');
  assert(panelHook.includes('live: liveListingCopy'), 'panel unwraps listing copy stream');
  assert(panelHook.includes('previewSuggestion'), 'panel passes preview suggestion');
  checks += 3;

  const mapScope = read('src/components/map/mapbox/NiazMapViewportScope.tsx');
  assert(mapScope.includes('useNiazMapRef'), 'viewport scope uses map context ref');
  assert(mapScope.includes('viewportBounds'), 'viewport scope supports browse API');
  assert(mapScope.includes('cityBounds'), 'viewport scope supports cityBounds API');
  assert(!mapScope.includes('mapRef.current?.getMap'), 'viewport scope guards map ref');
  checks += 4;

  const copyCard = read('src/components/need-intake/wizard/steps/IntakeLiveListingCopyCard.tsx');
  assert(copyCard.includes("(copy.title ?? '').trim()"), 'copy card null-safe title');
  checks += 1;

  const form = {
    needText: '???????? ?? ????',
    setNeedText: () => {},
    detailsText: '',
    setDetailsText: () => {},
    selectedCategory: 'real-estate',
    setSelectedCategory: () => {},
    selectedSubcategory: 'apartment-rent',
    setSelectedSubcategory: () => {},
    selectedCity: '????',
    setSelectedCity: () => {},
    selectedNeighborhood: '',
    setSelectedNeighborhood: () => {},
    enabledSections: new Set<string>(['category', 'location']),
    setEnabledSections: () => {},
    selectedLeafCategorySlug: 'apartment-rent',
  };

  const noop = () => {};
  const asyncNoop = async () => {};

  for (const step of ['need', 'details', 'location', 'preview'] as const) {
    const props = buildIntakeWizardStepContentProps({
      step,
      error: null,
      isLoading: false,
      form,
      needDraft: null,
      listingPreview:
        step === 'preview'
          ? {
              title: '???????? ?? ???? ?? ????',
              description: '????? ???',
              budgetMin: null,
              budgetMax: null,
            }
          : null,
      liveListingCopy: step === 'details' ? { title: '??????? ????', description: '' } : null,
      goToDetails: noop,
      setSeedText: noop,
      setStep: noop,
      setListingPreview: noop,
      patchNeedDraftEntities: noop,
      analyze: {
        goToLocation: noop,
        aiShardStatus: {},
        aiEnriching: false,
        prefetchStatus: 'idle',
        prefetchHints: null,
      },
      location: {
        neighborhoods: [],
        neighborhoodsLoading: false,
        promptNeighborhoodPick: false,
        setPromptNeighborhoodPick: noop,
        myLocationLoading: false,
        applyMyLocation: asyncNoop,
        applyCityRecord: noop,
        applyCity: noop,
        applyNeighborhood: noop,
      },
      locationStep: {
        intakeDisplaySections: [],
        categorySuggestions: [],
        neighborhoodDisambiguationChips: [],
        locationSuggestionChips: [],
        suggestedCities: [],
        showField: () => true,
        isSectionFilled: () => false,
        showLowConfidenceCategoryChips: true,
        categoryConfidence: null,
      },
      category: {
        applyCategorySlug: noop,
        applyCategoryFromMegaMenu: noop,
        patchIntakeAnswer: noop,
      },
      preview: {
        goToPreview: noop,
        repolishPreview: asyncNoop,
        rewriteTitle: asyncNoop,
        isRepublishing: false,
        isRewritingTitle: false,
        titleEnriching: false,
        descEnriching: false,
      },
      publish: {
        publish: asyncNoop,
        canPublish: false,
      },
    });

    assert(props.step === step, `builder step ${step}`);
    assert(typeof props.needText === 'string', `${step}: needText string`);
    assert(props.location.selectedCity === '????', `${step}: city wired`);
    if (step === 'preview') {
      assert(Boolean(props.listingPreview?.title), 'preview step has listing');
    }
    checks += 4;
  }

  assert(checks >= 20, `expected >=20 checks got ${checks}`);
  console.log(JSON.stringify({ ok: true, checks }));
}

main();
