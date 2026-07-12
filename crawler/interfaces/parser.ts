import type { ExtractedListing, NormalizedProperty } from '../types/property';
import type { Result } from '../types/errors';

export interface PropertyParser {
  readonly id: string;
  readonly siteKeys: string[];

  parse(extraction: ExtractedListing, context: { siteKey: string }): Result<NormalizedProperty>;
}

export interface PropertyValidator {
  validate(property: NormalizedProperty): Result<NormalizedProperty>;
}

export interface PropertyNormalizer {
  normalize(
    extraction: ExtractedListing,
    context: { siteKey: string; jobId: string }
  ): Result<NormalizedProperty>;
}
