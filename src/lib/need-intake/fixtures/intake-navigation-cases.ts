import type { NeedDraft } from '@/contracts/need-intake';
import { NEED_DRAFT_SCHEMA_VERSION } from '@/contracts/need-intake';
import type { IntakeWizardGuardContext } from '@/lib/need-intake/intake-wizard-guards';

export interface IntakeNavigationCase {
  id: string;
  target: 'need' | 'location' | 'preview';
  ctx: IntakeWizardGuardContext;
  expectOk: boolean;
}

const baseDraft = {
  schemaVersion: NEED_DRAFT_SCHEMA_VERSION,
  templateId: 'residential-rent',
  templateVersion: 1,
  vertical: 'real-estate',
  sourceText: 'آپارتمان دو خوابه در احمدآباد مشهد',
  entities: {
    categorySlug: 'residential-rent',
    subcategorySlug: 'apartment-rent',
    city: 'مشهد',
    neighborhood: 'احمدآباد',
    transactionType: 'RENT',
    lat: 36.2972,
    lng: 59.6067,
  },
  parsedIntent: {
    rawText: 'آپارتمان دو خوابه در احمدآباد مشهد',
    intentType: 'property_search',
    categorySlug: 'apartment-rent',
    subcategorySlug: 'apartment-rent',
    city: 'مشهد',
    confidence: 0.9,
    entities: {},
  },
  answers: {},
  completionScore: 100,
  completionState: 'READY_TO_PUBLISH',
} as unknown as NeedDraft;

export const INTAKE_NAVIGATION_CASES: IntakeNavigationCase[] = [
  {
    id: 'back-to-need',
    target: 'need',
    ctx: {
      currentStep: 'location',
      needText: 'آپارتمان',
      detailsText: 'دو خواب',
      needDraft: baseDraft,
      selectedCategory: 'real-estate',
      selectedSubcategory: 'apartment-rent',
      selectedCity: 'مشهد',
    },
    expectOk: true,
  },
  {
    id: 'forward-need-no-text',
    target: 'need',
    ctx: {
      currentStep: 'need',
      needText: '',
      detailsText: '',
      needDraft: null,
      selectedCategory: '',
      selectedSubcategory: '',
      selectedCity: '',
    },
    expectOk: false,
  },
  {
    id: 'forward-location-short-text',
    target: 'location',
    ctx: {
      currentStep: 'need',
      needText: 'کوتاه',
      detailsText: '',
      needDraft: null,
      selectedCategory: '',
      selectedSubcategory: '',
      selectedCity: '',
    },
    expectOk: false,
  },
  {
    id: 'forward-preview-no-city',
    target: 'preview',
    ctx: {
      currentStep: 'location',
      needText: 'آپارتمان اجاره در مشهد',
      detailsText: 'دو خواب نوساز',
      needDraft: {
        ...baseDraft,
        entities: {
          ...baseDraft.entities,
          city: '',
          neighborhood: '',
        },
      },
      selectedCategory: 'real-estate',
      selectedSubcategory: 'apartment-rent',
      selectedCity: '',
    },
    expectOk: false,
  },
  {
    id: 'forward-preview-valid',
    target: 'preview',
    ctx: {
      currentStep: 'location',
      needText: 'آپارتمان اجاره در مشهد',
      detailsText: 'دو خواب نوساز',
      needDraft: baseDraft,
      selectedCategory: 'real-estate',
      selectedSubcategory: 'apartment-rent',
      selectedCity: 'مشهد',
    },
    expectOk: true,
  },
];
