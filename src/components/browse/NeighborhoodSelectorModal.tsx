'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { searchAreaLabels } from '@/lib/neighborhoods/area-labels';

const ROW_HEIGHT = 52;

function Checkable({ checked }: { checked: boolean }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-colors',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-muted-foreground/40 bg-background hover:border-muted-foreground'
      )}
    >
      {checked && (
        <svg viewBox="0 0 12 10" className="size-3" aria-hidden>
          <path
            d="M1 5l3 3 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

const NeighborhoodRow = memo(function NeighborhoodRow({
  neighborhood,
  checked,
  onToggle,
}: {
  neighborhood: ManagedNeighborhood;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 border-b px-4 text-start hover:bg-muted/40"
      style={{ height: ROW_HEIGHT }}
      onClick={() => onToggle(neighborhood.id)}
    >
      <Checkable checked={checked} />
      <p className="min-w-0 flex-1 truncate font-semibold leading-snug">{neighborhood.name}</p>
    </button>
  );
});

function buildSearchIndex(neighborhoods: ManagedNeighborhood[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of neighborhoods) {
    const haystack = [n.name, ...searchAreaLabels(n.areas, n.name)].join(' ').toLowerCase();
    map.set(n.id, haystack);
  }
  return map;
}

interface NeighborhoodSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  neighborhoods: ManagedNeighborhood[];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
}

export function NeighborhoodSelectorModal({
  open,
  onOpenChange,
  neighborhoods,
  selectedIds,
  onApply,
}: NeighborhoodSelectorModalProps) {
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const searchIndex = useMemo(() => buildSearchIndex(neighborhoods), [neighborhoods]);

  const draftSet = useMemo(() => new Set(draft), [draft]);

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase();
    if (!norm) return neighborhoods;
    return neighborhoods.filter((n) => searchIndex.get(n.id)?.includes(norm));
  }, [neighborhoods, query, searchIndex]);

  const selectedItems = useMemo(
    () => neighborhoods.filter((n) => draftSet.has(n.id)),
    [neighborhoods, draftSet]
  );

  const virtualizer = useVirtualizer({
    count: open ? filtered.length : 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (!open) return;
    setDraft(selectedIds);
    setQuery('');
  }, [open, selectedIds]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      virtualizer.measure();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasure when list opens/resizes
  }, [open, filtered.length]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return [...next];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        dir="rtl"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3 space-y-0">
          <DialogTitle className="text-base font-bold">انتخاب محله</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </Button>
        </DialogHeader>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در نام محله یا کوچه"
              className="ps-10"
            />
          </div>
          {selectedItems.length > 0 && (
            <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
              {selectedItems.map((n) => (
                <Badge
                  key={n.id}
                  variant="secondary"
                  className="cursor-pointer gap-1 font-normal"
                  onClick={() => toggle(n.id)}
                >
                  {n.name}
                  <X className="size-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">محله‌ای یافت نشد</p>
          ) : (
            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((row) => {
                const n = filtered[row.index]!;
                return (
                  <div
                    key={n.id}
                    className="absolute start-0 top-0 w-full"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <NeighborhoodRow
                      neighborhood={n}
                      checked={draftSet.has(n.id)}
                      onToggle={toggle}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t bg-background p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            انصراف
          </Button>
          <Button type="button" className="flex-2" onClick={() => onApply(draft)}>
            اعمال فیلتر
            {draft.length > 0 ? ` (${draft.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
