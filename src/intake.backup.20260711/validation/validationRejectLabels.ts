import type { PublishValidationError } from '@/contracts/need-intake';
import { trackAnalyticsEvent } from '@/lib/analytics/track';

export function trackPublishValidationRejectClient(
  errors: PublishValidationError[],
  source: string
): void {
  if (!errors.length) return;
  trackAnalyticsEvent('intake_publish_validation_reject', {
    source,
    field: errors[0]?.field,
    count: errors.length,
  });
}
