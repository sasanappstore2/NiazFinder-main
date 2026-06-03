'use client';

import { useState } from 'react';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AnalyticsFilters } from '@/components/admin/analytics/useAnalyticsHub';
import type { AnalyticsDatePreset, AnalyticsMarketFilter } from '@/components/admin/analytics/types';

const PRESETS: { id: AnalyticsDatePreset; label: string }[] = [
  { id: 'today', label: 'امروز' },
  { id: '7d', label: '۷ روز' },
  { id: '28d', label: '۲۸ روز' },
  { id: '90d', label: '۹۰ روز' },
];

const MARKETS: { id: AnalyticsMarketFilter; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'need', label: 'نیاز' },
  { id: 'business', label: 'کسب‌وکار' },
];

function formatJalaliDate(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export function AnalyticsFilterBar({
  filters,
  onChange,
  onRefresh,
  lastUpdated,
}: {
  filters: AnalyticsFilters;
  onChange: (patch: Partial<AnalyticsFilters>) => void;
  onRefresh: () => void;
  lastUpdated: Date | null;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (filters.customFrom && filters.customTo) {
      return { from: new Date(filters.customFrom), to: new Date(filters.customTo) };
    }
    return undefined;
  });

  const applyCustomRange = (r: DateRange | undefined) => {
    setRange(r);
    if (r?.from && r?.to) {
      onChange({
        preset: 'custom',
        customFrom: r.from.toISOString().slice(0, 10),
        customTo: r.to.toISOString().slice(0, 10),
      });
      setCalendarOpen(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 rounded-xl border border-(--color-mainBorder) bg-(--color-primaryBg)/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={filters.preset === p.id ? 'default' : 'outline'}
            onClick={() => onChange({ preset: p.id })}
          >
            {p.label}
          </Button>
        ))}

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={filters.preset === 'custom' ? 'default' : 'outline'}
              className="gap-1.5"
            >
              <CalendarIcon className="size-4" />
              {filters.preset === 'custom' && filters.customFrom && filters.customTo
                ? `${formatJalaliDate(new Date(filters.customFrom))} – ${formatJalaliDate(new Date(filters.customTo))}`
                : 'بازه دلخواه'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={applyCustomRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>

        <div className="mx-1 hidden h-6 w-px bg-(--color-mainBorder) sm:block" />

        <Button
          size="sm"
          variant={filters.compare ? 'default' : 'outline'}
          onClick={() => onChange({ compare: !filters.compare })}
        >
          مقایسه با دوره قبل
        </Button>

        <div className="flex rounded-lg border border-(--color-mainBorder) p-0.5">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ market: m.id })}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                filters.market === m.id
                  ? 'bg-(--color-mainColor) text-white'
                  : 'text-(--color-secondaryText) hover:bg-(--color-navItemBgHover)'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Button size="sm" variant="ghost" onClick={onRefresh} aria-label="بروزرسانی">
          <RefreshCw className="size-4" />
        </Button>

        {lastUpdated && (
          <span className="mr-auto text-[11px] text-(--color-tertiaryText)">
            آخرین بروزرسانی:{' '}
            {lastUpdated.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
