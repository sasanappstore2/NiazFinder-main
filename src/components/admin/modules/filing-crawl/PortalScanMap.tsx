'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  HelpCircle,
  LayoutGrid,
  LogIn,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SiteIndex } from '@/lib/filing-scrapers/portal-families/types';
import {
  pageKindLabel,
  scanSummary,
  type ScanRegion,
} from '@/lib/filing-scrapers/portal-families/scan-regions';
import { cn } from '@/lib/utils';

function StatusIcon({ status }: { status: ScanRegion['status'] }) {
  if (status === 'found') return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />;
  if (status === 'uncertain') return <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />;
  return <HelpCircle className="size-3.5 shrink-0 text-red-500" />;
}

const PORTAL_FAMILY_LABELS: Record<string, string> = {
  showmelk: 'کارت تکراری کلاسیک',
  maskanyaban: 'کارت listing-item',
  generic_iran_filing: 'کشف خودکار عمومی',
};

function groupIcon(kind: ScanRegion['kind']) {
  if (kind === 'login') return <LogIn className="size-3.5" />;
  if (kind === 'list') return <LayoutGrid className="size-3.5" />;
  if (kind === 'pagination') return <Sparkles className="size-3.5" />;
  return <Tag className="size-3.5" />;
}

function regionRowClass(status: ScanRegion['status'], active: boolean): string {
  const base = 'w-full rounded-lg border px-2.5 py-2 text-right transition-colors';
  if (active) return cn(base, 'border-primary bg-primary/10 ring-1 ring-primary/30');
  if (status === 'found') return cn(base, 'border-emerald-400/40 bg-emerald-50/30 hover:bg-emerald-50/50 dark:bg-emerald-950/15');
  if (status === 'uncertain') return cn(base, 'border-amber-400/40 bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-950/15');
  return cn(base, 'border-red-400/40 bg-red-50/30 hover:bg-red-50/50 dark:bg-red-950/15');
}

function RegionGroup({
  title,
  regions,
  activeId,
  onSelect,
  onFix,
}: {
  title: string;
  regions: ScanRegion[];
  activeId: string | null;
  onSelect: (region: ScanRegion) => void;
  onFix: (region: ScanRegion) => void;
}) {
  if (!regions.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground">{title}</p>
      {regions.map((r) => (
        <div key={r.id} className="flex gap-1.5">
          <button
            type="button"
            className={regionRowClass(r.status, activeId === r.id)}
            onClick={() => onSelect(r)}
          >
            <div className="flex items-start gap-2">
              <StatusIcon status={r.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {groupIcon(r.kind)}
                  <span className="text-xs font-medium">{r.label}</span>
                  {r.confidence > 0 ? (
                    <Badge variant="outline" className="text-[9px]">
                      {Math.round(r.confidence * 100)}%
                    </Badge>
                  ) : null}
                </div>
                {r.value ? (
                  <p className="mt-0.5 truncate text-[11px] text-foreground/80">{r.value}</p>
                ) : r.hint ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{r.hint}</p>
                ) : null}
              </div>
            </div>
          </button>
          {(r.status !== 'found' || r.pickTarget) && r.pickTarget ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-auto shrink-0 px-2 text-[10px]"
              onClick={() => onFix(r)}
            >
              اصلاح
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function PortalScanMap({
  siteIndex,
  regions,
  activeRegionId,
  scanning,
  autoOnboarding = false,
  onScan,
  onAutoOnboard,
  onSelectRegion,
  onFixRegion,
}: {
  siteIndex: SiteIndex | null;
  regions: ScanRegion[];
  activeRegionId: string | null;
  scanning: boolean;
  autoOnboarding?: boolean;
  onScan: () => void;
  onAutoOnboard?: () => void;
  onSelectRegion: (region: ScanRegion) => void;
  onFixRegion: (region: ScanRegion) => void;
}) {
  const summary = scanSummary(regions);
  const loginRegions = regions.filter((r) => r.kind === 'login');
  const structureRegions = regions.filter((r) => r.kind === 'list' || r.kind === 'pagination');
  const fieldRegions = regions.filter((r) => r.kind === 'field');

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">اسکن هوشمند پورتال</h3>
            <p className="text-[11px] text-muted-foreground">
              بدون قالب ثابت — ساختار هر سایت از روی DOM کشف می‌شود
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {onAutoOnboard ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onAutoOnboard}
                disabled={scanning || autoOnboarding}
              >
                {autoOnboarding ? 'کشف خودکار…' : 'کشف خودکار کامل'}
              </Button>
            ) : null}
            <Button type="button" size="sm" className="admin-btn-primary" onClick={onScan} disabled={scanning || autoOnboarding}>
              {scanning ? 'در حال اسکن…' : 'اسکن این صفحه'}
            </Button>
          </div>
        </div>

        {siteIndex ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {pageKindLabel(siteIndex.pageKind)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {PORTAL_FAMILY_LABELS[siteIndex.portalFamily] ?? siteIndex.portalFamily}
            </Badge>
            {summary.total > 0 ? (
              <>
                <Badge className="bg-emerald-600/90 text-[10px]">{summary.found} فهمیده</Badge>
                <Badge className="bg-amber-500/90 text-[10px]">{summary.uncertain} مردد</Badge>
                <Badge variant="destructive" className="text-[10px]">
                  {summary.missing} نفهمیده
                </Badge>
              </>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            «شروع کشف هوشمند» را بزنید — ScrapeGraph با AI محلی لاگین و ساختار پورتال را کشف می‌کند.
          </p>
        )}
      </div>

      {!regions.length ? (
        <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          هنوز کشف نشده — دکمه «شروع کشف هوشمند» را بزنید
        </p>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Eye className="size-3.5" />
            خلاصه بخش‌هایی که AI از DOM پورتال فهمیده
          </p>
          <RegionGroup
            title="ورود به سایت"
            regions={loginRegions}
            activeId={activeRegionId}
            onSelect={onSelectRegion}
            onFix={onFixRegion}
          />
          <RegionGroup
            title="ساختار لیست"
            regions={structureRegions}
            activeId={activeRegionId}
            onSelect={onSelectRegion}
            onFix={onFixRegion}
          />
          <RegionGroup
            title="فیلدهای ملکی (استاندارد فایلینگ)"
            regions={fieldRegions}
            activeId={activeRegionId}
            onSelect={onSelectRegion}
            onFix={onFixRegion}
          />
        </div>
      )}
    </div>
  );
}
