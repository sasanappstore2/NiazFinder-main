'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============
type StarRatingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type StarColor = 'amber' | 'emerald' | 'rose';

interface StarRatingProps {
  /** Rating value (0-5, supports half steps like 3.5) */
  rating: number;
  /** Visual size of the stars */
  size?: StarRatingSize;
  /** Show numeric value next to stars */
  showValue?: boolean;
  /** Show total review count */
  reviewCount?: number;
  /** Interactive mode — user can click to set rating */
  interactive?: boolean;
  /** Callback when user selects a rating (interactive mode only) */
  onChange?: (rating: number) => void;
  /** Star color theme */
  color?: StarColor;
  /** Additional CSS class */
  className?: string;
  /** Schema.org microdata */
  itemProp?: string;
}

// ============ Config ============
const SIZE_CONFIG: Record<StarRatingSize, { icon: number; gap: string; textSize: string; valueSize: string }> = {
  xs: { icon: 12, gap: 'gap-0.5', textSize: 'text-[10px]', valueSize: 'text-[10px]' },
  sm: { icon: 14, gap: 'gap-0.5', textSize: 'text-[11px]', valueSize: 'text-xs' },
  md: { icon: 18, gap: 'gap-1', textSize: 'text-xs', valueSize: 'text-sm' },
  lg: { icon: 22, gap: 'gap-1.5', textSize: 'text-sm', valueSize: 'text-base' },
  xl: { icon: 28, gap: 'gap-2', textSize: 'text-base', valueSize: 'text-lg' },
};

const COLOR_CONFIG: Record<StarColor, {
  filled: string;
  half: string;
  empty: string;
  hover: string;
  glow: string;
  value: string;
}> = {
  amber: {
    filled: 'fill-amber-400 text-amber-400',
    half: 'fill-amber-200 text-amber-400 dark:fill-amber-600/60',
    empty: 'fill-muted/30 text-muted/40',
    hover: 'fill-amber-300 text-amber-300',
    glow: 'drop-shadow-[0_0_4px_oklch(0.82_0.17_75/0.4)]',
    value: 'text-amber-600 dark:text-amber-400',
  },
  emerald: {
    filled: 'fill-emerald-500 text-emerald-500',
    half: 'fill-emerald-200 text-emerald-500 dark:fill-emerald-700/60',
    empty: 'fill-muted/30 text-muted/40',
    hover: 'fill-emerald-400 text-emerald-400',
    glow: 'drop-shadow-[0_0_4px_oklch(0.72_0.19_155/0.4)]',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  rose: {
    filled: 'fill-rose-500 text-rose-500',
    half: 'fill-rose-200 text-rose-500 dark:fill-rose-700/60',
    empty: 'fill-muted/30 text-muted/40',
    hover: 'fill-rose-400 text-rose-400',
    glow: 'drop-shadow-[0_0_4px_oklch(0.65_0.22_15/0.4)]',
    value: 'text-rose-600 dark:text-rose-400',
  },
};

// ============ Individual Star ============
function RatingStar({
  index,
  rating,
  hoverRating,
  isInteractive,
  size,
  color,
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  index: number;
  rating: number;
  hoverRating: number;
  isInteractive: boolean;
  size: StarRatingSize;
  color: StarColor;
  onHoverStart: (i: number) => void;
  onHoverEnd: () => void;
  onClick?: (i: number) => void;
}) {
  const { icon } = SIZE_CONFIG[size];
  const colors = COLOR_CONFIG[color];
  const effectiveRating = isInteractive ? hoverRating : rating;

  const isFilled = index < Math.floor(effectiveRating);
  const isHalf = !isFilled && index < effectiveRating;
  const isEmpty = !isFilled && !isHalf;
  const isHovered = isInteractive && hoverRating > 0;

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center transition-transform duration-150 ease-out',
        isInteractive && 'cursor-pointer',
        isInteractive && isHovered && index < hoverRating && 'scale-110',
        isInteractive && 'active:scale-90',
      )}
      onMouseEnter={() => onHoverStart(index + 1)}
      onMouseLeave={onHoverEnd}
      onClick={() => onClick?.(index + 1)}
      role={isInteractive ? 'button' : undefined}
      aria-label={isInteractive ? `${index + 1} از ۵ ستاره` : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {/* Empty star (background) */}
      <Star
        size={icon}
        className={cn(
          'transition-all duration-150',
          isEmpty ? colors.empty : 'opacity-0 absolute',
          isInteractive && 'hover:scale-110',
        )}
        aria-hidden="true"
      />
      {/* Filled star */}
      {(isFilled || isHalf) && (
        <Star
          size={icon}
          className={cn(
            'absolute transition-all duration-150',
            isFilled ? colors.filled : colors.half,
            isInteractive && isHovered && 'drop-shadow-sm',
          )}
          aria-hidden="true"
        />
      )}
      {/* Hover glow effect (interactive only) */}
      {isInteractive && isHovered && index < hoverRating && (
        <Star
          size={icon}
          className={cn(
            'absolute transition-all duration-150',
            colors.hover,
            colors.glow,
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

// ============ Main Component ============
export function StarRating({
  rating,
  size = 'md',
  showValue = false,
  reviewCount,
  interactive = false,
  onChange,
  color = 'amber',
  className,
  itemProp,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const { gap, valueSize, textSize } = SIZE_CONFIG[size];
  const colors = COLOR_CONFIG[color];

  const clampedRating = Math.max(0, Math.min(5, rating));

  const handleHoverStart = useCallback((i: number) => {
    if (interactive) setHoverRating(i);
  }, [interactive]);

  const handleHoverEnd = useCallback(() => {
    if (interactive) setHoverRating(0);
  }, [interactive]);

  const handleClick = useCallback((i: number) => {
    onChange?.(i);
  }, [onChange]);

  return (
    <div
      className={cn('inline-flex items-center', gap, className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={
        interactive
          ? 'انتخاب امتیاز'
          : `امتیاز ${clampedRating.toLocaleString('fa-IR')} از ۵`
      }
      itemProp={itemProp}
    >
      {/* Stars */}
      <div className="inline-flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <RatingStar
            key={i}
            index={i}
            rating={clampedRating}
            hoverRating={hoverRating}
            isInteractive={interactive}
            size={size}
            color={color}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
            onClick={handleClick}
          />
        ))}
      </div>

      {/* Numeric value */}
      {showValue && (
        <span className={cn('font-bold tabular-nums', valueSize, colors.value)}>
          {clampedRating.toLocaleString('fa-IR')}
        </span>
      )}

      {/* Review count */}
      {reviewCount !== undefined && (
        <span className={cn('text-muted-foreground tabular-nums', textSize)}>
          ({reviewCount.toLocaleString('fa-IR')}
          {interactive ? '' : ' نظر'})
        </span>
      )}
    </div>
  );
}

// ============ Compact variant (for cards, lists) ============
export function CompactRating({
  rating,
  size = 'sm',
  showValue = true,
  color = 'amber',
  className,
}: {
  rating: number;
  size?: StarRatingSize;
  showValue?: boolean;
  color?: StarColor;
  className?: string;
}) {
  return (
    <StarRating
      rating={rating}
      size={size}
      showValue={showValue}
      color={color}
      className={className}
    />
  );
}
