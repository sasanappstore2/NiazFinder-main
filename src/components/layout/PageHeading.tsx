import { cn } from '@/lib/utils';

/** Visible page H1 for SEO and accessibility. */
export function PageHeading({
  title,
  className,
  visuallyHidden = false,
}: {
  title: string;
  className?: string;
  visuallyHidden?: boolean;
}) {
  if (!title.trim()) return null;
  return (
    <h1
      className={cn(
        visuallyHidden
          ? 'sr-only'
          : 'text-2xl font-extrabold tracking-tight sm:text-3xl',
        className
      )}
    >
      {title}
    </h1>
  );
}
