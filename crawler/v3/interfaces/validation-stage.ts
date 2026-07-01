import type { Result } from '../../types/errors';
import type { NormalizedProperty } from '../domain/property';

export interface IValidationStage {
  readonly ruleSetId: string;
  validate(property: NormalizedProperty): Result<NormalizedProperty>;
}
