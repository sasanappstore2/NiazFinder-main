export { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';
export { runHybridIntakePipeline } from '@/intake/intelligence-engine/hybrid/hybrid-pipeline';
export { runIntentSlice, runIntentSliceWithMeta } from '@/intake/intelligence-engine/hybrid/intent-slice';
export type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
export { runScopedFieldFill } from '@/intake/intelligence-engine/hybrid/scoped-field-fill';
export {
  runCategoryIntentEngine,
  categoryCandidatesForUi,
} from '@/intake/intelligence-engine/category/category-intent-engine';
export type {
  CategoryIntentEngineResult,
  CategoryIntentMethod,
} from '@/intake/intelligence-engine/category/category-intent-engine';
