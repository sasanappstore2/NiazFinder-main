'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  formatJalaaliCompact,
  formatTimeFa,
  gregorianToJalaali,
} from '@/lib/format/jalali-calendar';
import { cn } from '@/lib/utils';

const WorkspaceJalaliCalendar = lazy(() =>
  import('./WorkspaceJalaliCalendar').then((m) => ({ default: m.WorkspaceJalaliCalendar }))
);

function CalendarFallback() {
  return (
    <div className="flex h-64 w-[min(100vw-1.5rem,20.5rem)] items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

export function WorkspaceDateClock({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, open ? 1000 : 30_000);
    return () => clearInterval(timer);
  }, [open]);

  const jalaali = useMemo(() => gregorianToJalaali(now), [now]);
  const dateLabel = formatJalaaliCompact(jalaali);
  const timeLabel = formatTimeFa(now);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-8 shrink-0 gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 text-xs font-medium hover:bg-muted/40',
            className
          )}
          aria-label="تقویم و ساعت"
        >
          <CalendarDays className="size-3.5 shrink-0 text-primary" />
          <span className="hidden min-w-0 flex-col items-end leading-none sm:flex">
            <span className="truncate text-[11px] font-semibold tabular-nums">{timeLabel}</span>
            <span className="mt-0.5 truncate text-[10px] text-muted-foreground">{dateLabel}</span>
          </span>
          <span className="tabular-nums sm:hidden">{timeLabel}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto border-border/60 p-0 shadow-lg"
      >
        {open ? (
          <Suspense fallback={<CalendarFallback />}>
            <WorkspaceJalaliCalendar now={now} onClose={() => setOpen(false)} />
          </Suspense>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
