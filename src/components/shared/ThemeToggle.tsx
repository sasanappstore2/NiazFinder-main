'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';

type ThemeChoice = 'light' | 'dark' | 'system';

const themeOptions: {
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'روشن', icon: Sun },
  { value: 'dark', label: 'تاریک', icon: Moon },
  { value: 'system', label: 'سیستم', icon: Monitor },
];

function useThemeMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeModeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useThemeMounted();

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-1.5" aria-hidden>
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="h-[52px] rounded-lg bg-muted/40"
          />
        ))}
      </div>
    );
  }

  const mode: ThemeChoice =
    theme === 'light' || theme === 'dark' || theme === 'system'
      ? theme
      : 'system';
  const effectiveTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const followingSystem = mode === 'system';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-0.5">
        تم نمایش
      </p>
      <div
        className="grid grid-cols-3 gap-1.5"
        role="radiogroup"
        aria-label="انتخاب تم نمایش"
      >
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isManualChoice = mode === option.value;
          const isSystemEffective =
            followingSystem &&
            (option.value === 'light' || option.value === 'dark') &&
            option.value === effectiveTheme;

          let state: 'inactive' | 'manual' | 'system-tab' | 'system-effective' =
            'inactive';
          if (isManualChoice && option.value === 'system') {
            state = 'system-tab';
          } else if (isManualChoice) {
            state = 'manual';
          } else if (isSystemEffective) {
            state = 'system-effective';
          }

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={state !== 'inactive'}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                'outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                state === 'inactive' &&
                  'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                state === 'manual' &&
                  'bg-primary text-primary-foreground shadow-xs',
                state === 'system-tab' &&
                  'bg-muted/60 text-primary ring-1 ring-primary/50',
                state === 'system-effective' &&
                  'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {followingSystem && (
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          تم سیستم: {effectiveTheme === 'dark' ? 'تاریک' : 'روشن'}
        </p>
      )}
    </div>
  );
}

/** Compact icon toggle for toolbars (legacy). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useThemeMounted();

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    return <span className="inline-block size-9" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label={isDark ? 'حالت روشن' : 'حالت تاریک'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
