'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IranCalendarDayInfo, IranCalendarEventItem } from '@/lib/calendar/iran-holidays';
import {
  formatGregorianFromParts,
  formatJalaaliFromParts,
  formatJalaaliMonthYear,
  formatJalaaliWeekday,
  formatJalaaliYearLabel,
  formatTimeFa,
  getJalaaliMonthGrid,
  gregorianToJalaali,
  isJalaaliFriday,
  isSameJalaaliDay,
  JALALI_FRIDAY_COLUMN,
  JALALI_WEEKDAYS_SHORT,
  shiftJalaaliMonth,
  type JalaaliParts,
} from '@/lib/format/jalali-calendar';
import { toPersianDigits } from '@/lib/format/digits';
import { useIranCalendarMonth } from './hooks/useIranCalendarMonth';

function sortEvents(events: IranCalendarEventItem[]) {
  return [...events].sort((a, b) => Number(b.isHoliday) - Number(a.isHoliday));
}

function DayEventsPanel({
  parts,
  info,
  loading,
  error,
  source,
  fallbackGregorian,
}: {
  parts: JalaaliParts;
  info: IranCalendarDayInfo;
  loading: boolean;
  error: string | null;
  source: string | null;
  fallbackGregorian: string;
}) {
  const events = sortEvents(info.events);
  const holidayEvents = events.filter((e) => e.isHoliday);
  const gregorian = info.gregorianLabel ?? fallbackGregorian;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-muted-foreground">مناسبت‌ها و تعطیلات رسمی</p>
        {source === 'time.ir' ? (
          <span className="text-[9px] text-muted-foreground/80">منبع: time.ir</span>
        ) : null}
      </div>

      <p className="mt-1 text-xs font-semibold leading-relaxed">{formatJalaaliFromParts(parts)}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">میلادی: {gregorian}</p>

      {loading ? (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          در حال دریافت تعطیلات رسمی...
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
          {error} — فقط جمعه‌ها به‌عنوان تعطیل هفتگی نمایش داده می‌شوند.
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="mt-2 space-y-1.5">
          {holidayEvents.length > 0 ? (
            <p className="text-[10px] font-medium text-destructive">
              {info.isHoliday || holidayEvents.length > 0 ? 'تعطیل رسمی' : null}
            </p>
          ) : null}

          {events.length === 0 ? (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              مناسبت ثبت‌شده‌ای برای این روز در تقویم رسمی نیست.
            </p>
          ) : (
            <ul className="max-h-28 space-y-1 overflow-y-auto pe-0.5">
              {events.map((event, i) => (
                <li
                  key={`${i}-${event.text}`}
                  className={cn(
                    'text-[10px] leading-relaxed',
                    event.isHoliday
                      ? 'font-medium text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  <span className="me-1 opacity-70">{event.isHoliday ? '◆' : '○'}</span>
                  {event.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceJalaliCalendar({
  now,
  onClose,
}: {
  now: Date;
  onClose?: () => void;
}) {
  const today = useMemo(() => gregorianToJalaali(now), [now]);
  const [view, setView] = useState(() => ({ jy: today.jy, jm: today.jm }));
  const [selected, setSelected] = useState<JalaaliParts>(today);
  const [liveNow, setLiveNow] = useState(now);

  const { dayInfo, loading, error, source } = useIranCalendarMonth(view.jy, view.jm);
  const todayMonth = useIranCalendarMonth(today.jy, today.jm);

  useEffect(() => {
    setLiveNow(now);
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [now]);

  const cells = useMemo(() => getJalaaliMonthGrid(view.jy, view.jm), [view.jy, view.jm]);
  const selectedInfo = dayInfo(selected.jd);
  const todayInfo = todayMonth.dayInfo(today.jd);
  const todayHoliday = todayInfo.events.find((e) => e.isHoliday);

  const goToday = () => {
    const t = gregorianToJalaali(new Date());
    setView({ jy: t.jy, jm: t.jm });
    setSelected(t);
  };

  return (
    <div className="w-[min(100vw-1.5rem,20.5rem)] overflow-hidden rounded-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-muted/40 px-4 pb-4 pt-3">
        <div
          className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-primary/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -right-6 size-28 rounded-full bg-sky-500/10 blur-2xl"
          aria-hidden
        />

        <p className="text-[11px] font-medium text-muted-foreground">امروز</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug">{formatJalaaliWeekday(liveNow)}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
          {formatTimeFa(liveNow, true)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {formatJalaaliFromParts(gregorianToJalaali(liveNow))}
        </p>
        {todayHoliday ? (
          <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-destructive">
            {todayHoliday.text}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="ماه قبل"
            onClick={() => setView((v) => shiftJalaaliMonth(v.jy, v.jm, -1))}
          >
            <ChevronRight className="size-4" />
          </Button>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold">{formatJalaaliMonthYear(view.jy, view.jm)}</p>
            <p className="text-[10px] text-muted-foreground">{formatJalaaliYearLabel(view.jy)}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="ماه بعد"
            onClick={() => setView((v) => shiftJalaaliMonth(v.jy, v.jm, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {JALALI_WEEKDAYS_SHORT.map((label, col) => (
            <div
              key={label}
              className={cn(
                'flex size-8 items-center justify-center text-[10px] font-medium',
                col === JALALI_FRIDAY_COLUMN
                  ? 'font-semibold text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {label}
            </div>
          ))}

          {cells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="size-8" />;
            }

            const isToday = isSameJalaaliDay(cell, today);
            const isSelected = isSameJalaaliDay(cell, selected);
            const isFriday = isJalaaliFriday(cell);
            const info = dayInfo(cell.jd);
            const isOfficialHoliday = info.isHoliday;
            const isRedDay = isFriday || isOfficialHoliday;

            return (
              <button
                key={`${cell.jy}-${cell.jm}-${cell.jd}`}
                type="button"
                onClick={() => {
                  setSelected(cell);
                  setView({ jy: cell.jy, jm: cell.jm });
                }}
                className={cn(
                  'relative flex size-8 flex-col items-center justify-center rounded-lg text-xs font-medium tabular-nums transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  isSelected &&
                    isRedDay &&
                    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
                  isSelected &&
                    !isRedDay &&
                    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                  !isSelected &&
                    isToday &&
                    isOfficialHoliday &&
                    'bg-destructive/25 font-semibold text-destructive ring-2 ring-destructive/45',
                  !isSelected &&
                    isToday &&
                    !isOfficialHoliday &&
                    isFriday &&
                    'bg-destructive/12 text-destructive ring-1 ring-destructive/30',
                  !isSelected &&
                    isToday &&
                    !isRedDay &&
                    'bg-primary/12 text-primary ring-1 ring-primary/25',
                  !isSelected &&
                    !isToday &&
                    isOfficialHoliday &&
                    'bg-destructive/20 font-semibold text-destructive hover:bg-destructive/30',
                  !isSelected &&
                    !isToday &&
                    !isOfficialHoliday &&
                    isFriday &&
                    'text-destructive hover:bg-destructive/10',
                  !isSelected && !isToday && !isRedDay && 'text-foreground hover:bg-muted/80'
                )}
              >
                {toPersianDigits(cell.jd)}
              </button>
            );
          })}
        </div>

        <DayEventsPanel
          parts={selected}
          info={selectedInfo}
          loading={loading}
          error={error}
          source={source}
          fallbackGregorian={formatGregorianFromParts(selected)}
        />

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={goToday}>
            برو به امروز
          </Button>
          {onClose ? (
            <Button type="button" size="sm" className="h-8 flex-1 text-xs" onClick={onClose}>
              بستن
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
