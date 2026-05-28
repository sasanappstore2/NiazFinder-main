'use client';

import type { ElementType, ReactNode } from 'react';
import { Loader2, Lock, RefreshCw } from 'lucide-react';
import { AdminPageShell } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function IntakeAccessDenied({ permission }: { permission: string }) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-(--color-danger)/10 text-(--color-danger)">
        <Lock className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-(--color-primaryText)">دسترسی کافی ندارید</h2>
      <p className="mt-2 text-sm text-(--color-secondaryText)">
        مجوز <code className="rounded bg-(--color-inputBg) px-1.5 py-0.5 text-xs">{permission}</code>{' '}
        برای این بخش لازم است.
      </p>
    </div>
  );
}

export function IntakeAuthLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-(--color-secondaryText)">
      <div className="admin-spinner size-8 animate-spin rounded-full border-2" />
      <p className="text-sm">در حال بررسی دسترسی...</p>
    </div>
  );
}

export function IntakeDataLoading() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center gap-2 text-(--color-secondaryText)">
      <Loader2 className="size-5 animate-spin text-(--color-mainColor)" />
      در حال بارگذاری داده‌ها...
    </div>
  );
}

export function IntakeErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-(--color-danger)/30 bg-(--color-danger)/10 px-4 py-3 text-sm text-(--color-danger)">
      {message}
    </p>
  );
}

export function IntakeDashboardFrame({
  title,
  description,
  loading,
  error,
  showData,
  onRefresh,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  showData: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <AdminPageShell
      section="system"
      layout="dashboard"
      title={title}
      description={description}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-(--color-cardBorder) bg-(--color-primaryBg) hover:bg-(--color-navItemBgHover)"
          onClick={() => void onRefresh()}
          disabled={loading}
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          تازه‌سازی
        </Button>
      }
    >
      {loading && !showData ? <IntakeDataLoading /> : null}
      {error ? <IntakeErrorBanner message={error} /> : null}
      {showData ? <div className="space-y-5">{children}</div> : null}
    </AdminPageShell>
  );
}

export function IntakeBlock({
  title,
  description,
  icon: Icon,
  highlight,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ElementType;
  highlight?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'admin-intake-block',
        highlight && 'admin-intake-block--highlight',
        className
      )}
    >
      <div className="admin-intake-block__head">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div className="admin-panel__icon">
              <Icon className="size-[1.125rem]" aria-hidden />
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="admin-intake-block__title">{title}</h3>
            {description ? <p className="admin-intake-block__desc">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="admin-intake-block__body">{children}</div>
    </section>
  );
}

export function IntakeMetricGrid({ children }: { children: ReactNode }) {
  return <div className="admin-intake-metric-grid">{children}</div>;
}

export function IntakeMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="admin-intake-metric">
      <p className={cn('admin-intake-metric__value', accent && 'admin-intake-metric__value--accent')}>
        {value}
      </p>
      <p className="admin-intake-metric__label">{label}</p>
    </div>
  );
}

export function IntakeTableWrap({ children }: { children: ReactNode }) {
  return <div className="admin-intake-table-wrap">{children}</div>;
}

export function IntakeNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-intake-note">
      <p className="admin-intake-note__title">{title}</p>
      <div className="admin-intake-note__body">{children}</div>
    </section>
  );
}
