/**
 * Fibonacci spacing + golden-ratio layout for browse need cards.
 * Scale: 8 → 13 → 21 → 34 → 55 (aligned with ai-lead-tokens / globals.css).
 */
export const needCardFib = {
  xs: 8,
  sm: 13,
  md: 21,
  lg: 34,
  xl: 55,
} as const;

/** Golden ratio column split for desktop card body */
export const NEED_CARD_GRID_DESKTOP =
  'sm:grid sm:grid-cols-[minmax(0,1.618fr)_minmax(0,1fr)] sm:gap-[21px] sm:items-center';

/** List container — φ-friendly max width (~34rem × 1.618 × 1.5) */
export const NEED_LIST_CLASS =
  'mx-auto flex w-full max-w-208 flex-col gap-[21px]';

export const needCardSurfaceClass =
  'group relative w-full cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-emerald-300/60 hover:shadow-md hover:shadow-emerald-500/6 dark:hover:border-emerald-700/60 motion-reduce:transition-none';

/** Shared budget pill for browse cards and need detail hero */
export const needBudgetPillClass =
  'inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-label font-semibold text-emerald-800 persian-nums dark:text-emerald-300';

export function priorityAccentClass(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return 'border-r-4 border-r-destructive';
    case 'HIGH':
      return 'border-r-4 border-r-amber-500';
    default:
      return 'border-r-4 border-r-transparent';
  }
}
