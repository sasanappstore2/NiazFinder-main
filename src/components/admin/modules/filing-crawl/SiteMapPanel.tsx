'use client';

import { ExternalLink, Lock, Map, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PortalSiteMap } from '@/lib/filing-scrapers/portal-families/types';
import { cn } from '@/lib/utils';

const DEAL_COLORS: Record<string, string> = {
  sale: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  rent_mortgage: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
  rent: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  mortgage: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  presale: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  other: 'bg-muted text-muted-foreground',
};

function formatFieldList(items: unknown[]): string {
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const row = item as { key?: string; label?: string; msg?: string; message?: string };
        return row.key ?? row.label ?? row.msg ?? row.message ?? '';
      }
      return '';
    })
    .filter(Boolean)
    .join('، ');
}

export function SiteMapPanel({
  siteMap,
  className,
  onSelectListPage,
}: {
  siteMap: PortalSiteMap | null;
  className?: string;
  onSelectListPage?: (url: string) => void;
}) {
  if (!siteMap) return null;

  const hidden = siteMap.fieldVisibility?.hiddenUntilLogin ?? [];
  const visible = siteMap.fieldVisibility?.visible ?? [];

  return (
    <div className={cn('space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Map className="size-4 text-primary" />
        <h3 className="text-sm font-bold">نقشه پورتال</h3>
        <Badge variant="secondary" className="text-[10px]">
          {siteMap.pagesVisited} صفحه بررسی شد
        </Badge>
        {siteMap.loginRequired ? (
          <Badge variant="outline" className="gap-1 text-[10px] text-amber-700 dark:text-amber-300">
            <Lock className="size-3" />
            برخی فیلدها بعد از ورود
          </Badge>
        ) : null}
      </div>

      {siteMap.notes ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{siteMap.notes}</p>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground">دسته‌بندی معاملات / لیست‌ها</p>
        {siteMap.navigationTree?.length ? (
          <ul className="space-y-2">
            {siteMap.navigationTree.map((group) => (
              <li key={group.dealType} className="rounded-lg border border-border/50 bg-background/60 p-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Tag className="size-3.5 text-primary" />
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-medium',
                      DEAL_COLORS[group.dealType] ?? DEAL_COLORS.other
                    )}
                  >
                    {group.dealTypeLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{group.listPages.length} صفحه</span>
                </div>
                <ul className="space-y-1">
                  {group.listPages.map((p) => (
                    <li key={p.url} className="flex items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-right hover:text-primary"
                        onClick={() => onSelectListPage?.(p.url)}
                      >
                        {p.label || p.url}
                      </button>
                      <span className="shrink-0 text-muted-foreground">
                        {p.cardCount ? `${p.cardCount} کارت` : ''}
                        {p.score != null ? ` · ${p.score}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">هنوز صفحه لیستی پیدا نشد.</p>
        )}
      </div>

      {siteMap.listPages?.length ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">بهترین صفحات لیست</p>
          {siteMap.listPages.slice(0, 5).map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border/40 px-2 py-1.5 text-[11px] hover:bg-muted/40"
              dir="ltr"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{p.url}</span>
              {p.dealTypeLabel ? (
                <Badge variant="outline" className="shrink-0 text-[9px]">
                  {p.dealTypeLabel}
                </Badge>
              ) : null}
            </a>
          ))}
        </div>
      ) : null}

      {(visible.length > 0 || hidden.length > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/20 p-2 dark:bg-emerald-950/10">
            <p className="mb-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">قابل مشاهده بدون ورود</p>
            <p className="text-[10px] text-muted-foreground">{formatFieldList(visible) || '—'}</p>
          </div>
          <div className="rounded-lg border border-amber-400/30 bg-amber-50/20 p-2 dark:bg-amber-950/10">
            <p className="mb-1 text-[10px] font-semibold text-amber-800 dark:text-amber-200">بعد از ورود (احتمالی)</p>
            <p className="text-[10px] text-muted-foreground">
              {hidden.length ? formatFieldList(hidden) : 'مشخص نشد'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
