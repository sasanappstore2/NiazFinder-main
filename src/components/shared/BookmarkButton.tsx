'use client';

import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type BookmarkType = 'request' | 'specialist';
type BookmarkSize = 'sm' | 'md' | 'lg';

interface BookmarkButtonProps {
  id: string;
  type: BookmarkType;
  size?: BookmarkSize;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 16, padding: 'p-1' },
  md: { icon: 20, padding: 'p-1.5' },
  lg: { icon: 24, padding: 'p-2' },
} as const;

export function BookmarkButton({
  id,
  type,
  size = 'md',
  className,
}: BookmarkButtonProps) {
  const toggleBookmarkRequest = useAppStore((s) => s.toggleBookmarkRequest);
  const toggleBookmarkSpecialist = useAppStore((s) => s.toggleBookmarkSpecialist);
  const isRequestBookmarked = useAppStore((s) => s.isRequestBookmarked);
  const isSpecialistBookmarked = useAppStore((s) => s.isSpecialistBookmarked);

  const [particles, setParticles] = useState<
    Array<{
      id: string;
      angle: number;
      distance: number;
      size: number;
    }>
  >([]);

  const isBookmarked =
    type === 'request' ? isRequestBookmarked(id) : isSpecialistBookmarked(id);

  const { icon, padding } = sizeConfig[size];

  const handleClick = useCallback(() => {
    if (type === 'request') {
      toggleBookmarkRequest(id);
    } else {
      toggleBookmarkSpecialist(id);
    }

    // Spawn burst particles only when bookmarking (was previously unbookmarked)
    if (!isBookmarked) {
      const count = Math.floor(Math.random() * 3) + 4;
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        angle: (360 / count) * i + (Math.random() * 30 - 15),
        distance: 18 + Math.random() * 14,
        size: 3 + Math.random() * 3,
      }));
      setParticles(newParticles);
      // Clean up particles after animation completes
      setTimeout(() => setParticles([]), 600);
      toast.success(type === 'request' ? 'به علاقه‌مندی‌ها اضافه شد' : 'کسب‌وکار به لیست ذخیره‌شده اضافه شد');
    } else {
      toast.info('از علاقه‌مندی‌ها حذف شد');
    }
  }, [type, id, isBookmarked, toggleBookmarkRequest, toggleBookmarkSpecialist]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isBookmarked ? 'حذف از نشان‌شده‌ها' : 'افزودن به نشان‌شده‌ها'}
      aria-pressed={isBookmarked}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full transition-all duration-150 ease active:scale-90',
        padding,
        isBookmarked
          ? 'text-rose-500 hover:text-rose-600'
          : 'text-muted-foreground hover:text-rose-400',
        className,
      )}
    >
      {/* Heart icon */}
      <span>
        <Heart
          size={icon}
          fill={isBookmarked ? 'currentColor' : 'none'}
          strokeWidth={isBookmarked ? 0 : 2}
        />
      </span>

      {/* Burst particles */}
      {particles.map((particle) => {
        const rad = (particle.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * particle.distance;
        const ty = Math.sin(rad) * particle.distance;

        return (
          <span
            key={particle.id}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 animate-[burstParticle_0.5s_ease-out_forwards]"
            style={{
              width: particle.size,
              height: particle.size,
              '--particle-tx': `${tx}px`,
              '--particle-ty': `${ty}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </button>
  );
}
