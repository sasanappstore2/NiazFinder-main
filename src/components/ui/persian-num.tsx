import { toPersianDigits } from '@/lib/format/digits';

/** Render children with ASCII digits shown as Persian ۰–۹. */
export function PersianNum({
  children,
  className,
}: {
  children: string | number;
  className?: string;
}) {
  return <span className={className}>{toPersianDigits(children)}</span>;
}
