'use client';

import { INTAKE_COPY } from './intake-copy';

export interface IntakeLiveSummaryAsideProps {
  summary: string;
}

export function IntakeLiveSummaryAside({ summary }: IntakeLiveSummaryAsideProps) {
  return (
    <aside className="layout-golden-aside hidden lg:block">
      <div className="intake-aside-card intake-aside-card--compact sticky-below-header">
        <h3 className="intake-aside-card__title">{INTAKE_COPY.liveSummaryTitle}</h3>
        <p className="intake-aside-card__body">
          {summary || INTAKE_COPY.liveSummaryEmpty}
        </p>
      </div>
    </aside>
  );
}
