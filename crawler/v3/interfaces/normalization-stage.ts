import type { Result } from '../../types/errors';
import type { NormalizedProperty } from '../domain/property';
import type { ExtractedListing } from '../domain/property';

export interface INormalizationStage {
  readonly pipelineId: string;
  normalize(
    listing: ExtractedListing,
    ctx: { siteKey: string; jobId: string }
  ): Promise<Result<NormalizedProperty>>;
}
