'use client';

import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

export interface IntakeStepShellProps {
  stepNumber: number;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  header?: ReactNode;
  className?: string;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

export function IntakeStepShell({
  stepNumber,
  title,
  description,
  children,
  actions,
  header,
  className,
  titleRef,
}: IntakeStepShellProps) {
  return (
    <section className={cn('intake-panel-card', className)}>
      {header ? <div className="intake-panel-card__chrome">{header}</div> : null}
      <div className="intake-panel-card__body">
        <div className="intake-form-card__head">
          <h2
            ref={titleRef}
            className="intake-form-card__title"
            tabIndex={-1}
            id={`intake-step-${stepNumber}-title`}
          >
            {title}
          </h2>
          {description ? <p className="intake-form-card__desc">{description}</p> : null}
        </div>
        <div className="intake-panel-card__content">{children}</div>
        {actions ? (
          <div className="intake-sticky-actions intake-actions flex flex-col gap-2 sm:flex-row">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
