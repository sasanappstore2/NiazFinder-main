'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  FolderTree,
  Layers3,
  Loader2,
  Power,
  Search,
  Sparkles,
} from 'lucide-react';
import type { LaunchFlatItem, LaunchNode, StatusFilter } from '@/lib/admin/launch-control';
import {
  buildLaunchTree,
  collectBulkTargets,
  filterTreeBySearch,
  filterTreeByStatus,
  flatItemsFromNeedCategories,
} from '@/lib/admin/launch-control';
import { formatNumber } from '@/components/admin/modules/shared/formatters';
import { AdminBadge, AdminEmptyState } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OnOffToggle } from '@/components/ui/on-off-toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { OptionGroup } from '@/components/shared/OptionGroup';

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-(--color-coloredText) bg-(--color-coloredText)/10 text-(--color-coloredText)'
          : 'border-(--color-mainBorder) bg-(--color-primaryBg) text-(--color-secondaryText) hover:bg-(--color-navItemBgHover)'
      )}
    >
      {label}
    </button>
  );
}

export function LaunchControlDialog({
  open,
  onOpenChange,
  title,
  description,
  childCountLabel = 'زیردسته',
  items,
  togglingIds,
  bulkBusy,
  onToggle,
  onBulkSet,
  realEstatePreset,
  onApplyRealEstatePreset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  childCountLabel?: string;
  items: LaunchFlatItem[];
  togglingIds: Set<string>;
  bulkBusy: boolean;
  onToggle: (item: { id: string; name: string }, nextActive: boolean) => Promise<void>;
  onBulkSet: (targets: { id: string; name: string }[], nextActive: boolean) => Promise<void>;
  realEstatePreset?: {
    label: string;
    description: string;
  };
  onApplyRealEstatePreset?: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [confirmOffOpen, setConfirmOffOpen] = useState(false);
  const [confirmPresetOpen, setConfirmPresetOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setStatusFilter('all');
      setConfirmOffOpen(false);
      setConfirmPresetOpen(false);
    }
  }, [open]);

  const tree = useMemo(() => buildLaunchTree(items), [items]);
  const activeCount = items.filter((c) => c.isActive).length;
  const inactiveCount = items.length - activeCount;

  const visibleTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filterTreeByStatus(filterTreeBySearch(tree, q), statusFilter);
  }, [tree, search, statusFilter]);

  const bulkOnTargets = useMemo(
    () => collectBulkTargets(visibleTree, true),
    [visibleTree]
  );
  const bulkOffTargets = useMemo(
    () => collectBulkTargets(visibleTree, false),
    [visibleTree]
  );

  const allRootIds = useMemo(() => tree.map((n) => n.id), [tree]);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(allRootIds));

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const busy = bulkBusy || togglingIds.size > 0;

  const renderChildRow = (node: LaunchNode, depth: number) => {
    const toggling = togglingIds.has(node.id);
    return (
      <div key={node.id} className={cn(depth > 1 && 'ms-3 border-s border-(--color-mainBorder) ps-2')}>
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg border border-(--color-mainBorder) bg-(--color-primaryBg) px-3 py-2 transition-colors hover:border-(--color-coloredText)/25',
            !node.isActive && 'opacity-60'
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Layers3 className="size-3.5 shrink-0 text-(--color-secondaryText)" />
              <span className="truncate text-sm font-medium">{node.name}</span>
              <AdminBadge variant={node.isActive ? 'success' : 'neutral'}>
                {node.isActive ? 'فعال' : 'خاموش'}
              </AdminBadge>
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] text-(--color-secondaryText)" dir="ltr">
              /{node.slug}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {toggling ? <Loader2 className="size-3.5 animate-spin text-(--color-secondaryText)" /> : null}
            <OnOffToggle
              checked={node.isActive}
              disabled={busy}
              onCheckedChange={(v) => void onToggle(node, v)}
              aria-label={node.isActive ? `خاموش کردن ${node.name}` : `روشن کردن ${node.name}`}
            />
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {node.children.map((c) => renderChildRow(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderRoot = (node: LaunchNode) => {
    const isCollapsed = collapsed.has(node.id);
    const toggling = togglingIds.has(node.id);
    return (
      <article
        key={node.id}
        className={cn(
          'rounded-xl border border-(--color-mainBorder) bg-(--color-secondaryBg)/40 transition-colors',
          !node.isActive && 'opacity-70'
        )}
      >
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            {node.children.length > 0 ? (
              <button
                type="button"
                className="admin-icon-btn mt-0.5 size-7 shrink-0"
                aria-label={isCollapsed ? 'باز کردن' : 'جمع کردن'}
                onClick={() => toggleCollapsed(node.id)}
              >
                {isCollapsed ? (
                  <ChevronLeft className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="mt-0.5 size-7 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FolderTree className="size-4 shrink-0 text-(--color-coloredText)" />
                <h3 className="font-bold text-(--color-primaryText)">{node.name}</h3>
                <AdminBadge variant={node.isActive ? 'success' : 'neutral'}>
                  {node.isActive ? 'فعال' : 'خاموش'}
                </AdminBadge>
                {node.children.length > 0 ? (
                  <span className="text-[11px] text-(--color-secondaryText)">
                    {formatNumber(node.children.length)} {childCountLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-(--color-secondaryText)" dir="ltr">
                /{node.slug}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 ps-9 sm:ps-0">
            {toggling ? <Loader2 className="size-4 animate-spin text-(--color-secondaryText)" /> : null}
            <OnOffToggle
              checked={node.isActive}
              disabled={busy}
              onCheckedChange={(v) => void onToggle(node, v)}
              aria-label={node.isActive ? `خاموش کردن ${node.name}` : `روشن کردن ${node.name}`}
            />
          </div>
        </div>

        {!isCollapsed && node.children.length > 0 ? (
          <div className="border-t border-(--color-mainBorder) bg-(--color-primaryBg)/50 px-3 py-3">
            <div className="space-y-1.5">{node.children.map((c) => renderChildRow(c, 1))}</div>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="admin-content-zone flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-2 border-b border-(--color-mainBorder) px-5 py-4 pe-14 text-start">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Power className="size-5 text-(--color-coloredText)" />
              {title}
              <AdminBadge variant="success">{formatNumber(activeCount)} فعال</AdminBadge>
              <AdminBadge variant="warning">{formatNumber(inactiveCount)} خاموش</AdminBadge>
            </DialogTitle>
            <DialogDescription className="text-start">{description}</DialogDescription>
          </DialogHeader>

          <div className="shrink-0 space-y-3 border-b border-(--color-mainBorder) px-5 py-3">
            {realEstatePreset && onApplyRealEstatePreset ? (
              <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    {realEstatePreset.label}
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-900/80 dark:text-emerald-200/80">
                    {realEstatePreset.description}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="admin-btn-primary h-8 shrink-0 gap-1.5"
                  disabled={busy}
                  onClick={() => setConfirmPresetOpen(true)}
                >
                  <Sparkles className="size-3.5" />
                  اعمال پریست
                </Button>
              </div>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-(--color-secondaryText)" />
              <Input
                className="admin-input ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در درخت..."
              />
            </div>

            <OptionGroup layout="chips" label="فیلتر وضعیت">
              <FilterChip active={statusFilter === 'all'} label="همه" onClick={() => setStatusFilter('all')} />
              <FilterChip active={statusFilter === 'on'} label="فقط روشن" onClick={() => setStatusFilter('on')} />
              <FilterChip active={statusFilter === 'off'} label="فقط خاموش" onClick={() => setStatusFilter('off')} />
              <Button type="button" size="sm" variant="outline" className="admin-input h-9 text-xs" onClick={expandAll}>
                باز کردن همه
              </Button>
              <Button type="button" size="sm" variant="outline" className="admin-input h-9 text-xs" onClick={collapseAll}>
                جمع کردن همه
              </Button>
            </OptionGroup>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg) px-3 py-2">
              <span className="text-xs text-(--color-secondaryText)">اکشن دسته‌ای روی نتیجه فیلتر:</span>
              <Button
                type="button"
                size="sm"
                className="admin-btn-primary h-8"
                disabled={busy || bulkOnTargets.length === 0}
                onClick={() => void onBulkSet(bulkOnTargets, true)}
              >
                {bulkBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                روشن کردن ({formatNumber(bulkOnTargets.length)})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="admin-input h-8"
                disabled={busy || bulkOffTargets.length === 0}
                onClick={() => setConfirmOffOpen(true)}
              >
                خاموش کردن ({formatNumber(bulkOffTargets.length)})
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {visibleTree.length === 0 ? (
              <AdminEmptyState title="موردی یافت نشد" description="جستجو یا فیلتر وضعیت را تغییر دهید." />
            ) : (
              visibleTree.map((node) => renderRoot(node))
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-(--color-mainBorder) px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-(--color-secondaryText)">
              {formatNumber(inactiveCount)} خاموش از {formatNumber(items.length)}
              <span className="ms-2 opacity-70">· Esc بستن</span>
            </p>
            <Button variant="outline" className="admin-input" onClick={() => onOpenChange(false)}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOffOpen} onOpenChange={setConfirmOffOpen}>
        <AlertDialogContent className="admin-content-zone">
          <AlertDialogHeader>
            <AlertDialogTitle>خاموش کردن دسته‌ای</AlertDialogTitle>
            <AlertDialogDescription>
              {formatNumber(bulkOffTargets.length)} مورد از منوی عمومی مخفی می‌شوند. ادامه می‌دهید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy || bulkOffTargets.length === 0}
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  await onBulkSet(bulkOffTargets, false);
                  setConfirmOffOpen(false);
                })();
              }}
            >
              {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              خاموش کردن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {realEstatePreset && onApplyRealEstatePreset ? (
        <AlertDialog open={confirmPresetOpen} onOpenChange={setConfirmPresetOpen}>
          <AlertDialogContent className="admin-content-zone">
            <AlertDialogHeader>
              <AlertDialogTitle>{realEstatePreset.label}</AlertDialogTitle>
              <AlertDialogDescription>{realEstatePreset.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkBusy}>انصراف</AlertDialogCancel>
              <AlertDialogAction
                disabled={bulkBusy}
                onClick={(e) => {
                  e.preventDefault();
                  void (async () => {
                    await onApplyRealEstatePreset();
                    setConfirmPresetOpen(false);
                  })();
                }}
              >
                {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                اعمال
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

export function CategoryLaunchControlDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatCategories: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    isActive: boolean;
    order?: number;
  }>;
  togglingIds: Set<string>;
  bulkBusy: boolean;
  onToggle: (category: { id: string; name: string }, nextActive: boolean) => Promise<void>;
  onBulkSet: (targets: { id: string; name: string }[], nextActive: boolean) => Promise<void>;
  onApplyRealEstatePreset?: () => Promise<void>;
}) {
  const items = flatItemsFromNeedCategories(props.flatCategories);
  return (
    <LaunchControlDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="کنترل لانچ دسته‌های نیاز"
      description="خاموش کردن والد، زیردرخت را هم خاموش می‌کند؛ روشن کردن والد زیردسته‌ها را خودکار روشن نمی‌کند."
      items={items}
      togglingIds={props.togglingIds}
      bulkBusy={props.bulkBusy}
      onToggle={props.onToggle}
      onBulkSet={props.onBulkSet}
      realEstatePreset={{
        label: 'لانچ فقط املاک (نیازها)',
        description: 'فقط درخت «املاک» روشن می‌ماند؛ بقیه دسته‌های نیاز خاموش می‌شوند.',
      }}
      onApplyRealEstatePreset={props.onApplyRealEstatePreset}
    />
  );
}
