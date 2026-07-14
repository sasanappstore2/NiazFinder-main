'use client';

import { cn } from '@/lib/utils';
import {
  COLLABORATION_WIZARD_STEPS,
  type CollaborationWizardStepId,
} from '@/lib/business/workspace/collaboration-form';

export function CollaborationWizardProgress({ step }: { step: CollaborationWizardStepId }) {
  return (
    <div className="flex items-center gap-2" aria-label={`مرحله ${step} از ${COLLABORATION_WIZARD_STEPS.length}`}>
      {COLLABORATION_WIZARD_STEPS.map((s) => (
        <span
          key={s.id}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors',
            s.id <= step ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}
