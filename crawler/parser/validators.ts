import type { NormalizedProperty } from '../types/property';
import { crawlError, err, ok, type Result } from '../types/errors';
import type { PropertyValidator } from '../interfaces/parser';

export class PropertyRecordValidator implements PropertyValidator {
  validate(property: NormalizedProperty): Result<NormalizedProperty> {
    if (!property.title?.trim() || property.title.length < 3) {
      return err(crawlError('validation', 'title too short', { retryable: false }));
    }
    if (!property.externalId?.trim()) {
      return err(crawlError('validation', 'missing externalId', { retryable: false }));
    }
    if (property.dealType === 'sell' && !property.price?.trim()) {
      return err(crawlError('validation', 'sale listing missing price', { retryable: false }));
    }
    return ok(property);
  }
}
