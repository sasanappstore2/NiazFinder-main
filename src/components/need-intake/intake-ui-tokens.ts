import { cn } from '@/lib/utils';

export { fib, COMPOSER_MAX_WIDTH } from '@/components/home/ai-lead/ai-lead-tokens';

/** Shared surface for need/details composer ? aligned with NeedLeadPromptBox */
export const intakeComposerSurface = cn(
  'overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-1.5',
  'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl',
  'transition-all duration-300 focus-within:border-primary/35',
  'dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]',
  'sm:rounded-3xl sm:p-2'
);

export const intakeComposerTextarea = cn(
  'min-h-[5.5rem] resize-none border-0 bg-transparent px-3 py-3',
  'text-[15px] leading-relaxed shadow-none sm:text-base sm:leading-[1.618]',
  'focus-visible:ring-0 focus-visible:ring-offset-0',
  'placeholder:text-muted-foreground/80 scrollbar-thin overflow-y-auto'
);

export const intakeHintSurface = cn(
  'rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground'
);

export const intakePrimaryCta = cn(
  'bg-emerald-600 hover:bg-emerald-700 text-white'
);

export const INTAKE_DETAILS_MIN_CHARS = 40;
