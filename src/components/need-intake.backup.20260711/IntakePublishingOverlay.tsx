'use client';

import { Loader2 } from 'lucide-react';
import { INTAKE_COPY } from './intake-copy';

export function IntakePublishingOverlay() {
  return (
    <div
      className="intake-publishing-overlay"
      role="status"
      aria-live="polite"
      aria-label={INTAKE_COPY.publishingAria}
    >
      <div className="intake-publishing-overlay__card">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">{INTAKE_COPY.publishingTitle}</p>
        <p className="text-xs text-muted-foreground">{INTAKE_COPY.publishingSubtitle}</p>
      </div>
    </div>
  );
}
