'use client';

import type { IntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import { INTAKE_COPY, intakeLiveSummaryEmpty } from './intake-copy';

export interface IntakeLiveSummaryAsideProps {
  summary: string;
  analysisMode?: IntakeAnalysisMode;
}

export function IntakeLiveSummaryAside({
  summary,
  analysisMode = 'rules',
}: IntakeLiveSummaryAsideProps) {
  return (
    <aside className="layout-golden-aside hidden lg:block">
      <div className="intake-aside-card intake-aside-card--compact sticky-below-header">
        <h3 className="intake-aside-card__title">{INTAKE_COPY.liveSummaryTitle}</h3>
        <p className="intake-aside-card__body">
          {summary || intakeLiveSummaryEmpty(analysisMode)}
        </p>
      </div>
    </aside>
  );
}
