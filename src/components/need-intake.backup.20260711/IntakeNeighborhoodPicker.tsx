'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import { matchManagedNeighborhood } from '@/lib/neighborhoods/match-managed-neighborhood';

interface IntakeNeighborhoodPickerProps {
  cityName: string;
  value: string;
  neighborhoods: ManagedNeighborhood[];
  isLoading?: boolean;
  disabled?: boolean;
  onChange: (name: string, neighborhoodId: string | null, opts?: { fromUser?: boolean }) => void;
  className?: string;
  /** Open picker when city is ready but neighborhood empty (after GPS). */
  autoOpenWhenEmpty?: boolean;
  onAutoOpenHandled?: () => void;
}

function matchesQuery(n: ManagedNeighborhood, q: string): boolean {
  if (!q) return true;
  const norm = q.trim().toLowerCase();
  if (n.name.toLowerCase().includes(norm)) return true;
  return n.areas?.some((a) => a.toLowerCase().includes(norm)) ?? false;
}

function compactLabel(text: string): string {
  return text.replace(/\u200c/g, '').replace(/\s+/g, '').trim().toLowerCase();
}

/** Prefer exact / prefix / token hits so «فردوسی» lists before «توس فردوسی». */
function rankNeighborhoodQuery(n: ManagedNeighborhood, q: string): number {
  if (!q.trim()) return 100;
  const cq = compactLabel(q);
  const cn = compactLabel(n.name);
  if (cn === cq) return 0;
  if (cn.startsWith(cq)) return 1;
  const tokens = n.name
    .replace(/\u200c/g, ' ')
    .split(/[\s،,.]+/)
    .map((t) => compactLabel(t))
    .filter(Boolean);
  if (tokens.includes(cq)) return 2;
  if ((n.areas ?? []).some((a) => compactLabel(a) === cq)) return 3;
  if (cn.includes(cq)) return 4;
  if ((n.areas ?? []).some((a) => compactLabel(a).includes(cq))) return 5;
  return 6;
}

export function IntakeNeighborhoodPicker({
  cityName,
  value,
  neighborhoods,
  isLoading = false,
  disabled = false,
  onChange,
  className,
  autoOpenWhenEmpty = false,
  onAutoOpenHandled,
}: IntakeNeighborhoodPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return (
      neighborhoods.find((n) => n.name === trimmed || n.id === trimmed) ??
      matchManagedNeighborhood(neighborhoods, trimmed, cityName)
    );
  }, [value, neighborhoods, cityName]);

  const filtered = useMemo(() => {
    const list = neighborhoods.filter((n) => matchesQuery(n, query));
    if (!query.trim()) return list;
    return [...list].sort((a, b) => {
      const ra = rankNeighborhoodQuery(a, query);
      const rb = rankNeighborhoodQuery(b, query);
      if (ra !== rb) return ra - rb;
      if (a.name.length !== b.name.length) return a.name.length - b.name.length;
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [neighborhoods, query]);

  const similarHits = useMemo(() => {
    const phrase = (query.trim() || value.trim()).trim();
    if (phrase.length < 2 || !neighborhoods.length) return [];
    return findManagedNeighborhoodAmbiguity(neighborhoods, phrase, cityName).slice(0, 6);
  }, [query, value, neighborhoods, cityName]);

  const displayLabel = selected?.name || 'انتخاب محله';

  const handleSelect = (n: ManagedNeighborhood) => {
    onChange(n.name, n.id, { fromUser: true });
    setOpen(false);
    setQuery('');
  };

  const hasCatalog = neighborhoods.length > 0;
  const canOpenList = Boolean(cityName.trim()) && !disabled && !isLoading && hasCatalog;

  useEffect(() => {
    if (!autoOpenWhenEmpty || !canOpenList || value.trim()) return;
    setOpen(true);
    onAutoOpenHandled?.();
  }, [autoOpenWhenEmpty, canOpenList, value, onAutoOpenHandled]);

  useEffect(() => {
    if (!selected || disabled || isLoading || !hasCatalog) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed === selected.name || trimmed === selected.id) return;
    if (findManagedNeighborhoodAmbiguity(neighborhoods, trimmed, cityName).length >= 2) return;
    onChange(selected.name, selected.id);
  }, [selected, value, disabled, isLoading, hasCatalog, neighborhoods, cityName, onChange]);

  if (!hasCatalog && cityName.trim() && !isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value, null)}
          placeholder="نام محله یا محدوده را بنویسید…"
          disabled={disabled}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          فهرست محله برای این شهر در سیستم نیست؛ محدوده را دستی وارد کنید.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-2 min-w-0', className)}>
        <button
          type="button"
          disabled={!canOpenList}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors',
            'hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40',
            (!canOpenList || disabled) && 'cursor-not-allowed opacity-60'
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn('truncate', !value.trim() && 'text-muted-foreground')}>
              {isLoading
                ? 'در حال بارگذاری محله‌ها...'
                : !cityName.trim()
                  ? 'ابتدا شهر را انتخاب کنید'
                  : displayLabel}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>

        {similarHits.length >= 2 && canOpenList ? (
          <div className="flex flex-wrap gap-1.5">
            {similarHits.map((h) => {
              const active = selected?.id === h.neighborhood.id;
              return (
                <button
                  key={h.neighborhood.id}
                  type="button"
                  onClick={() => handleSelect(h.neighborhood)}
                  className={cn(
                    'max-w-full truncate rounded-md border px-2.5 py-1 text-xs transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/80 bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted/50'
                  )}
                  title={h.neighborhood.name}
                >
                  {h.neighborhood.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {open && hasCatalog ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
            dir="rtl"
            aria-describedby={undefined}
          >
            <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3 space-y-0">
              <DialogTitle className="text-base font-bold">
                محله‌های {cityName}
              </DialogTitle>
            </DialogHeader>

            <div className="border-b px-4 py-3">
              <div className="relative">
                <Search className="absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی محله یا خیابان..."
                  className="ps-10"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {query.trim() && similarHits.length >= 2
                  ? `${similarHits.length} محلهٔ مشابه — دقیق‌ترین را انتخاب کنید`
                  : `${neighborhoods.length} محله — همان فهرست فیلترهای سایت`}
              </p>
              {query.trim() && similarHits.length >= 2 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {similarHits.map((h) => {
                    const active = selected?.id === h.neighborhood.id;
                    return (
                      <button
                        key={`dlg-${h.neighborhood.id}`}
                        type="button"
                        onClick={() => handleSelect(h.neighborhood)}
                        className={cn(
                          'max-w-full truncate rounded-md border px-2.5 py-1 text-xs transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/80 bg-background hover:border-primary/50'
                        )}
                      >
                        {h.neighborhood.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {filtered.map((n) => {
                const active = selected?.id === n.id || selected?.name === n.name;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full flex-col gap-1 border-b px-4 py-3 text-start hover:bg-muted/40',
                        active && 'bg-primary/5'
                      )}
                      onClick={() => handleSelect(n)}
                    >
                      <span className="font-semibold leading-snug">{n.name}</span>
                      {n.areas && n.areas.length > 0 ? (
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          {n.areas.slice(0, 4).join('، ')}
                          {n.areas.length > 4 ? '…' : ''}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                  محله‌ای یافت نشد
                </li>
              ) : null}
            </ul>

            <div className="border-t bg-background p-4">
              <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
                بستن
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
