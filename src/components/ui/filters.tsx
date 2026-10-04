'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimateChangeInHeightProps {
  children: ReactNode;
  className?: string;
}

export function AnimateChangeInHeight({ children, className }: AnimateChangeInHeightProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver((entries) => {
      setHeight(entries[0]?.contentRect.height ?? 'auto');
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <motion.div
      className={cn(className, 'overflow-hidden')}
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.1, ease: 'easeIn' }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
}

type ActiveFilterChipProps = {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  onClear: () => void;
  className?: string;
};

export function ActiveFilterChip({
  icon,
  label,
  value,
  onClear,
  className,
}: ActiveFilterChipProps) {
  return (
    <div className={cn('filing-active-filter-chip', className)}>
      <span className="filing-active-filter-chip__type">
        {icon}
        {label}
      </span>
      <span className="filing-active-filter-chip__value">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="filing-active-filter-chip__clear"
        aria-label="حذف فیلتر"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
