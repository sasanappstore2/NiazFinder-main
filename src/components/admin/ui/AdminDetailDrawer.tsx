'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AdminDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AdminDetailDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: AdminDetailDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="بستن"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative flex h-full w-full max-w-lg flex-col border-l border-(--color-mainBorder) bg-(--color-primaryBg) shadow-xl',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-(--color-mainBorder) p-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-(--color-primaryText)">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-(--color-secondaryText)">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="border-t border-(--color-mainBorder) p-4">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}
