import type { Variants } from 'framer-motion';

/** Cast motion config objects for framer-motion strict Variants typing. */
export function mv(variants: Record<string, unknown>): Variants {
  return variants as Variants;
}
