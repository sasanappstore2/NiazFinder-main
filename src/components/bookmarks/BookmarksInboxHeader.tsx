'use client';

import type { BookmarkInboxFilter } from '@/lib/bookmarks/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const FILTERS: { id: BookmarkInboxFilter; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'needs_follow_up', label: 'نیاز پیگیری' },
  { id: 'in_chat', label: 'در گفتگو' },
  { id: 'proposed', label: 'پیشنهاد داده‌شده' },
  { id: 'closed', label: 'بسته‌شده' },
];

interface BookmarksInboxHeaderProps {
  totalCount: number;
  followUpCount: number;
  isBusinessUser: boolean;
  filter: BookmarkInboxFilter;
  onFilterChange: (filter: BookmarkInboxFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function BookmarksInboxHeader({
  totalCount,
  followUpCount,
  isBusinessUser,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: BookmarksInboxHeaderProps) {
  return (
    <header className="space-y-4">
      <div>
        <h1 className="text-h2 font-bold">علاقه‌مندی‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isBusinessUser
            ? 'آگهی‌هایی که ذخیره کردید — اینجا پیگیری کنید'
            : 'آگهی‌های نیاز ذخیره‌شده'}
          {' · '}
          {totalCount.toLocaleString('fa-IR')} مورد
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جستجو در عنوان یا شهر..."
          className="pr-10"
          aria-label="جستجو در علاقه‌مندی‌ها"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="فیلتر علاقه‌مندی‌ها">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const showBadge = f.id === 'needs_follow_up' && followUpCount > 0;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {f.label}
              {showBadge && (
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-overline font-bold tabular-nums',
                    active ? 'bg-primary text-primary-foreground' : 'bg-amber-500/15 text-amber-700'
                  )}
                >
                  {followUpCount.toLocaleString('fa-IR')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
