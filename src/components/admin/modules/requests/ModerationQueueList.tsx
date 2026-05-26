'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { ModerationQueueItem } from './useModerationQueue';

function userLabel(r: ModerationQueueItem) {
  const u = r.user;
  return u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.phone;
}

export function ModerationQueueList({
  items,
  selectedId,
  selectedIds,
  onSelect,
  onToggle,
}: {
  items: ModerationQueueItem[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-(--color-secondaryText)">
        صف بازبینی خالی است
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100vh-16rem)] divide-y divide-(--color-mainBorder) overflow-y-auto">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <div
            key={item.id}
            className={cn(
              'flex cursor-pointer items-start gap-2 px-3 py-2.5 transition-colors hover:bg-(--color-tableRowBgHover)',
              active && 'bg-(--color-navItemActiveBg)'
            )}
            onClick={() => onSelect(item.id)}
          >
            <Checkbox
              checked={selectedIds.has(item.id)}
              onCheckedChange={() => onToggle(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-(--color-secondaryText)">
                {item.category?.name ?? '—'} · {item.city ?? '—'} · {userLabel(item)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
