'use client';

import { INTAKE_COPY } from './intake-copy';
import { IntakeLiveSummaryCard, type LiveSummaryCardData } from './IntakeLiveSummaryCard';

export interface IntakeLiveSummaryAsideProps {
  summary: LiveSummaryCardData;
}

export function IntakeLiveSummaryAside({ summary }: IntakeLiveSummaryAsideProps) {
  return (
    <aside className="layout-golden-aside hidden lg:block">
      <div className="intake-aside-card intake-aside-card--compact sticky-below-header">
        <h3 className="intake-aside-card__title">{INTAKE_COPY.liveSummaryTitle}</h3>
        <IntakeLiveSummaryCard data={summary} emptyHint={INTAKE_COPY.liveSummaryEmpty} />
      </div>
    </aside>
  );
}
