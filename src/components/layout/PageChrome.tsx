'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeading } from '@/components/layout/PageHeading';
import { Separator } from '@/components/ui/separator';
import type { BreadcrumbCrumb } from '@/lib/browse/breadcrumb-crumbs';

export interface PageChromeProps {
  title: string;
  /** Optional subtitle below H1 */
  description?: string;
  /** Optional breadcrumb override */
  initialCrumbs?: BreadcrumbCrumb[];
  businessProfileLabel?: string;
  /** Right-side actions (buttons, links) */
  actions?: ReactNode;
  /** Hide breadcrumb trail */
  hideBreadcrumb?: boolean;
  /** Hide separator between breadcrumb and title */
  hideSeparator?: boolean;
  separatorClassName?: string;
  className?: string;
  headingClassName?: string;
}

/**
 * Standard page header: breadcrumb → separator → H1 → optional description/actions.
 */
export function PageChrome({
  title,
  description,
  initialCrumbs,
  businessProfileLabel,
  actions,
  hideBreadcrumb = false,
  hideSeparator = false,
  separatorClassName = 'my-4',
  className,
  headingClassName,
}: PageChromeProps) {
  const hasActions = Boolean(actions);
  const hasDescription = Boolean(description?.trim());

  return (
    <header className={cn('min-w-0 space-y-0', className)}>
      {!hideBreadcrumb ? (
        <Breadcrumb
          initialCrumbs={initialCrumbs}
          businessProfileLabel={businessProfileLabel}
        />
      ) : null}
      {!hideSeparator && !hideBreadcrumb ? (
        <Separator className={separatorClassName} />
      ) : null}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
          (hideBreadcrumb || hideSeparator) && 'pt-0'
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <PageHeading title={title} className={headingClassName} />
          {hasDescription ? (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {hasActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
