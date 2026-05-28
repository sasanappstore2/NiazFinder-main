'use client';

import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminPanel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = '',
  variant = 'default',
}: {
  title: string;
  description?: string;
  icon: ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'form' | 'stats';
}) {
  return (
    <section
      className={cn(
        'admin-panel overflow-hidden',
        variant === 'form' && 'admin-panel--form',
        variant === 'stats' && 'admin-panel--stats',
        className
      )}
    >
      <header className="admin-panel__header">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="admin-panel__icon">
            <Icon className="size-[1.125rem]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="admin-panel__title">{title}</h2>
            {description && <p className="admin-panel__desc">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="admin-panel__body">{children}</div>
    </section>
  );
}

export function AdminFormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="admin-form-field">
      <label className="admin-form-field__label">{label}</label>
      <div className="admin-form-field__control">{children}</div>
      {hint && <p className="admin-form-field__hint">{hint}</p>}
    </div>
  );
}

export function AdminStatTile({
  label,
  value,
  icon: Icon,
  tone = 'indigo',
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  tone?: 'indigo' | 'sky' | 'amber' | 'violet' | 'emerald';
}) {
  return (
    <div className={cn('admin-stat-tile', `admin-stat-tile--${tone}`)}>
      <div className="admin-stat-tile__top">
        <span className="admin-stat-tile__label">{label}</span>
        <span className="admin-stat-tile__icon-wrap">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="admin-stat-tile__value">{value}</p>
    </div>
  );
}

export function AdminToggleRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-toggle-row">
      <span className="admin-toggle-row__label">{label}</span>
      {children}
    </div>
  );
}

export function AdminListCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('admin-list-card', className)}>{children}</div>;
}

export function AdminPanelActions({ children }: { children: ReactNode }) {
  return <div className="admin-panel__actions">{children}</div>;
}
