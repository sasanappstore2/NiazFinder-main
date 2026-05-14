'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SpecialistAvailabilityBadgeProps {
  isOnline: boolean;
  responseTime?: string;
  completedToday?: number;
  size?: 'sm' | 'md' | 'lg';
}

type BadgeSize = 'sm' | 'md' | 'lg';

const sizeConfig: Record<
  BadgeSize,
  { dot: string; text: string; padding: string; gap: string }
> = {
  sm: {
    dot: 'size-2',
    text: 'text-xs',
    padding: 'px-2 py-0.5',
    gap: 'gap-1.5',
  },
  md: {
    dot: 'size-2.5',
    text: 'text-sm',
    padding: 'px-2.5 py-1',
    gap: 'gap-2',
  },
  lg: {
    dot: 'size-3',
    text: 'text-base',
    padding: 'px-4 py-2',
    gap: 'gap-2.5',
  },
};

export function SpecialistAvailabilityBadge({
  isOnline,
  responseTime,
  completedToday,
  size = 'md',
}: SpecialistAvailabilityBadgeProps) {
  const config = sizeConfig[size];

  const isLarge = size === 'lg';

  return (
    <div
      className="inline-flex"
      dir="rtl"
    >
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center font-medium transition-colors',
          config.padding,
          config.gap,
          isLarge && [
            'rounded-xl border-0 shadow-md',
            'bg-white/60 backdrop-blur-lg dark:bg-gray-900/60 dark:backdrop-blur-lg',
            isOnline
              ? 'border border-emerald-200/50 dark:border-emerald-800/50'
              : 'border border-gray-200/50 dark:border-gray-700/50',
          ],
          !isLarge && isOnline && 'border-emerald-200/60 dark:border-emerald-800/60',
          !isLarge && !isOnline && 'border-gray-200/60 dark:border-gray-700/60',
        )}
      >
        {/* Status Dot */}
        <span className="relative flex shrink-0">
          <span
            className={cn(
              'inline-block rounded-full',
              config.dot,
              isOnline
                ? 'bg-emerald-500 animate-pulse-online'
                : 'bg-gray-400 dark:bg-gray-500',
            )}
          />
          {/* Pulse ring for online */}
          {isOnline && isLarge && (
            <span
              className={cn(
                'absolute inset-0 rounded-full bg-emerald-500/30 animate-ping',
              )}
            />
          )}
        </span>

        {/* Status Text */}
        <span
          className={cn(
            config.text,
            'font-semibold',
            isOnline
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-gray-500 dark:text-gray-400',
          )}
        >
          {isOnline ? 'آنلاین' : 'آفلاین'}
        </span>

        {/* Response Time (md and lg) */}
        {isOnline && responseTime && (size === 'md' || size === 'lg') && (
          <span
            className={cn(
              config.text,
              'text-muted-foreground',
            )}
          >
            · {responseTime}
          </span>
        )}

        {/* Offline last activity */}
        {!isOnline && size === 'lg' && (
          <span className="text-sm text-muted-foreground">
            · آخرین فعالیت: اخیراً
          </span>
        )}

        {/* Completed today (lg only) */}
        {isOnline && isLarge && completedToday !== undefined && (
          <span className="mr-1 flex items-center gap-1 text-sm text-muted-foreground">
            · {completedToday} پروژه امروز
          </span>
        )}
      </Badge>
    </div>
  );
}
