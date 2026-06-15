'use client';

import { useMemo, useState } from 'react';
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
import { displayAreaLabels } from '@/lib/neighborhoods/area-labels';

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

function neighborhoodAreas(n: ManagedNeighborhood): string[] {
  return displayAreaLabels(n.areas, n.name);
}

function matchesQuery(n: ManagedNeighborhood, q: string): boolean {
  if (!q) return true;
  const norm = q.trim().toLowerCase();
  if (n.name.toLowerCase().includes(norm)) return true;
  return neighborhoodAreas(n).some((a) => a.toLowerCase().includes(norm));
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

  const syncFromProps = (ids: string[]) => {
    setDraft(ids);
    setQuery('');
  };

  const filtered = useMemo(
    () => neighborhoods.filter((n) => matchesQuery(n, query)),
    [neighborhoods, query]
  );

  const toggle = (id: string) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedItems = useMemo(
    () => neighborhoods.filter((n) => draft.includes(n.id)),
    [neighborhoods, draft]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) syncFromProps(selectedIds);
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        dir="rtl"
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
              placeholder="جستجو"
              className="ps-10"
            />
          </div>
          {selectedItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
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

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((n) => {
            const checked = draft.includes(n.id);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-start hover:bg-muted/40"
                  onClick={() => toggle(n.id)}
                >
                  <Checkable checked={checked} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{n.name}</p>
                    {neighborhoodAreas(n).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {neighborhoodAreas(n).map((area) => (
                          <span
                            key={area}
                            className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              محله‌ای یافت نشد
            </li>
          )}
        </ul>

        <div className="flex gap-2 border-t bg-background p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            انصراف
          </Button>
          <Button
            type="button"
            className="flex-2"
            onClick={() => onApply(draft)}
          >
            اعمال فیلتر
            {draft.length > 0 ? ` (${draft.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
