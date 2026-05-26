import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-(--color-coloredText)/15 text-(--color-coloredText) border-(--color-coloredText)/25',
  success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
  danger: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
  info: 'bg-sky-500/15 text-sky-500 border-sky-500/25',
  neutral: 'bg-(--color-navItemActiveBg) text-(--color-secondaryText) border-(--color-mainBorder)',
};

export function AdminBadge({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function AdminStatusBadge({ active }: { active: boolean }) {
  return active ? <AdminBadge variant="success">فعال</AdminBadge> : <AdminBadge variant="neutral">غیرفعال</AdminBadge>;
}
