'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showValue?: boolean;
  reviewCount?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  className?: string;
}

const SIZE_MAP = {
  xs: { star: 'size-3', gap: 'gap-px', text: 'text-caption' },
  sm: { star: 'size-3.5', gap: 'gap-0.5', text: 'text-caption' },
  md: { star: 'size-4', gap: 'gap-1', text: 'text-xs' },
  lg: { star: 'size-5', gap: 'gap-1.5', text: 'text-sm' },
};

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = true,
  reviewCount,
  interactive = false,
  onRate,
  className,
  ...rest
}: StarRatingProps & React.HTMLAttributes<HTMLDivElement>) {
  const sizeConfig = SIZE_MAP[size];
  const clampedRating = Math.min(Math.max(rating, 0), maxRating);

  const handleClick = interactive && onRate
    ? (starIndex: number) => () => onRate(starIndex + 1)
    : undefined;

  return (
    <div className={cn('flex items-center gap-1.5', className)} dir="ltr" {...rest}>
      {/* Stars */}
      <div className={cn('flex items-center', sizeConfig.gap)}>
        {Array.from({ length: maxRating }, (_, i) => {
          const fillLevel = clampedRating - i;
          let fillType: 'full' | 'half' | 'empty' = 'empty';
          if (fillLevel >= 1) fillType = 'full';
          else if (fillLevel >= 0.5) fillType = 'half';

          return (
            <button
              key={i}
              type="button"
              onClick={handleClick?.(i)}
              disabled={!interactive}
              className={cn(
                'relative transition-transform duration-150',
                interactive
                  ? 'cursor-pointer hover:scale-125 active:scale-110'
                  : 'cursor-default',
                interactive && i <= Math.floor(clampedRating) && 'text-amber-400'
              )}
              aria-label={interactive ? `امتیاز ${i + 1} از ${maxRating}` : undefined}
            >
              {/* Empty star (background) */}
              <Star
                className={cn(
                  sizeConfig.star,
                  'text-gray-200 dark:text-gray-700'
                )}
                fill="currentColor"
              />
              {/* Full star (foreground) */}
              {fillType === 'full' && (
                <Star
                  className={cn(
                    sizeConfig.star,
                    'absolute inset-0 text-amber-400',
                    'drop-shadow-[0_1px_2px_rgba(251,191,36,0.3)]'
                  )}
                  fill="currentColor"
                />
              )}
              {/* Half star */}
              {fillType === 'half' && (
                <div className="absolute inset-0 overflow-hidden w-1/2 start-0">
                  <Star
                    className={cn(
                      sizeConfig.star,
                      'text-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.3)]'
                    )}
                    fill="currentColor"
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Numeric value */}
      {showValue && (
        <span className={cn('font-bold tabular-nums text-foreground/80', sizeConfig.text)}>
          {clampedRating.toFixed(1)}
        </span>
      )}

      {/* Review count */}
      {reviewCount !== undefined && (
        <span className={cn('text-muted-foreground/60', sizeConfig.text)}>
          ({reviewCount.toLocaleString('fa-IR')})
        </span>
      )}
    </div>
  );
}
