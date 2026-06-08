/**
 * Layout tokens for browse need cards.
 */
export const NEED_LIST_CLASS =
  'mx-auto flex w-full max-w-3xl flex-col gap-2.5 sm:gap-3';

export const needCardSurfaceClass =
  'group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:border-emerald-300/55 hover:shadow-md hover:shadow-emerald-500/5 active:scale-[0.995] dark:hover:border-emerald-700/45 motion-reduce:transition-none motion-reduce:active:scale-100';

/** Shared budget pill for browse cards and need detail hero */
export const needBudgetPillClass =
  'inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-800 persian-nums dark:text-emerald-300';

export function priorityAccentClass(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return 'border-destructive/25 bg-destructive/[0.02]';
    case 'HIGH':
      return 'border-amber-500/30 bg-amber-500/[0.03]';
    default:
      return '';
  }
}
