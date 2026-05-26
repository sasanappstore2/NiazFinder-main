import type { ReactNode } from 'react';

export function AdminCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`admin-card ${className}`}>{children}</div>;
}

export function AdminMetricCard({
  title,
  value,
  caption,
  icon,
  tone = 'green',
}: {
  title: string;
  value?: string | number;
  caption: ReactNode;
  icon: ReactNode;
  tone?: 'green' | 'blue' | 'amber' | 'violet';
}) {
  const toneClasses = {
    green: 'text-(--color-coloredText) bg-(--color-coloredText)/10',
    blue: 'text-sky-400 bg-sky-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    violet: 'text-violet-400 bg-violet-400/10',
  }[tone];

  return (
    <AdminCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-(--color-secondaryText)">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal">{value ?? '—'}</p>
          <p className="mt-2 text-xs leading-6 text-(--color-secondaryText)">{caption}</p>
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
          {icon}
        </div>
      </div>
    </AdminCard>
  );
}

export function AdminPanel({
  title,
  description,
  icon,
  children,
  actions,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard className={`overflow-hidden ${className}`}>
      <div className="flex flex-col gap-2 border-b border-(--color-mainBorder) p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--color-sideMenuButtonBg) text-(--color-coloredText)">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold">{title}</h2>
            {description && (
              <p className="mt-1 text-xs leading-6 text-(--color-secondaryText)">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </AdminCard>
  );
}

export function AdminTable({
  headers,
  rows,
  emptyMessage = 'داده‌ای یافت نشد',
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-(--color-mainBorder) py-12 text-center text-sm text-(--color-secondaryText)">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-(--color-mainBorder)">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-(--color-tableHeaderBg)">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-right text-xs font-bold text-(--color-navSectionTitle)"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr
              key={i}
              className="border-t border-(--color-mainBorder) transition-colors hover:bg-(--color-tableRowBgHover)"
            >
              {cells.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-(--color-tableCellText)">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
