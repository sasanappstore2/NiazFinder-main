import { cn } from '@/lib/utils';

interface ChatPresenceDotProps {
  online?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

/** Avatar corner lamp: green when online, dim grey when offline. */
export function ChatPresenceDot({ online = false, className, size = 'sm' }: ChatPresenceDotProps) {
  return (
    <span
      className={cn(
        'rounded-full border-2 border-background',
        size === 'md' ? 'h-4 w-4' : 'h-3 w-3',
        online
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.55)]'
          : 'bg-muted-foreground/30 dark:bg-muted-foreground/45',
        className
      )}
      aria-hidden
    />
  );
}
