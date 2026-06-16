import type { IntakeStepLocationProps } from '@/lib/need-intake/intake-step-location-props';
import {
  draftHasInferredCity,
  draftHasInferredNeighborhood,
} from '@/lib/need-intake/sync-intake-location-form';

export type RefineSubStep = 'category' | 'city' | 'neighborhood' | 'extras';

export function refineHasSelectedCity(props: IntakeStepLocationProps): boolean {
  if (props.selectedCity.trim()) return true;
  return draftHasInferredCity(props.needDraft);
}

export function refineHasSelectedNeighborhood(props: IntakeStepLocationProps): boolean {
  if (props.selectedNeighborhood.trim()) return true;
  return draftHasInferredNeighborhood(props.needDraft);
}

export function refineNeedsCategory(props: IntakeStepLocationProps): boolean {
  return props.showField('category') && !props.selectedLeafCategorySlug;
}

export function refineNeedsCity(props: IntakeStepLocationProps): boolean {
  if (!props.showField('city')) return false;
  return !refineHasSelectedCity(props);
}

export function refineNeedsNeighborhood(props: IntakeStepLocationProps): boolean {
  if (!props.showField('neighborhood')) return false;
  if (props.promptNeighborhoodPick) return true;
  return !refineHasSelectedNeighborhood(props);
}

export function resolveRefineSubStep(props: IntakeStepLocationProps): RefineSubStep {
  if (refineNeedsCategory(props)) return 'category';
  if (refineNeedsCity(props)) return 'city';
  if (refineNeedsNeighborhood(props)) return 'neighborhood';
  return 'extras';
}

export function refineCoreStepsComplete(props: IntakeStepLocationProps): boolean {
  return (
    !refineNeedsCategory(props) &&
    !refineNeedsCity(props) &&
    !refineNeedsNeighborhood(props)
  );
}

/** Jump to the next unresolved sub-step after the user (or AI) fills the current one. */
export function resolveRefineSubStepAfterAdvance(
  props: IntakeStepLocationProps,
  current: RefineSubStep
): RefineSubStep | 'preview' {
  const unresolved = resolveRefineSubStep(props);
  const order: RefineSubStep[] = ['category', 'city', 'neighborhood', 'extras'];
  const currentIdx = order.indexOf(current);
  const unresolvedIdx = order.indexOf(unresolved);

  if (refineCoreStepsComplete(props)) {
    return current === 'extras' ? 'preview' : 'extras';
  }

  if (unresolvedIdx > currentIdx) {
    return unresolved;
  }

  if (currentIdx < order.length - 1) {
    return order[currentIdx + 1]!;
  }

  return 'extras';
}
