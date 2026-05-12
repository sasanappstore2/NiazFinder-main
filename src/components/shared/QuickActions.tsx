'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Search, MessageSquare, Gift } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';
import { cn } from '@/lib/utils';

// ============ Action Configuration ============
interface QuickAction {
  label: string;
  icon: typeof FileText;
  view: AppView;
  color: string;
  bgClass: string;
  shadowClass: string;
  ringClass: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'ثبت نیاز',
    icon: FileText,
    view: 'post-need',
    color: 'text-white',
    bgClass: 'bg-emerald-500 hover:bg-emerald-600',
    shadowClass: 'shadow-emerald-500/30',
    ringClass: 'ring-emerald-400/30',
  },
  {
    label: 'جستجوی متخصص',
    icon: Search,
    view: 'browse-specialists',
    color: 'text-white',
    bgClass: 'bg-amber-500 hover:bg-amber-600',
    shadowClass: 'shadow-amber-500/30',
    ringClass: 'ring-amber-400/30',
  },
  {
    label: 'پیام جدید',
    icon: MessageSquare,
    view: 'messages',
    color: 'text-white',
    bgClass: 'bg-cyan-500 hover:bg-cyan-600',
    shadowClass: 'shadow-cyan-500/30',
    ringClass: 'ring-cyan-400/30',
  },
  {
    label: 'دعوت دوست',
    icon: Gift,
    view: 'referral',
    color: 'text-white',
    bgClass: 'bg-rose-500 hover:bg-rose-600',
    shadowClass: 'shadow-rose-500/30',
    ringClass: 'ring-rose-400/30',
  },
];

// Arc positions for each action (fan out upward-left in RTL)
const ARC_POSITIONS = [
  { x: -12, y: -68 },   // 1st: slightly left, first tier up
  { x: -32, y: -128 },  // 2nd: more left, second tier up
  { x: -12, y: -188 },  // 3rd: slightly left, third tier up
  { x: -32, y: -248 },  // 4th: more left, fourth tier up
];

// ============ Pulse keyframes for idle FAB ============
const pulseVariants = {
  idle: {
    scale: [1, 1.08, 1],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  expanded: {
    scale: 1,
  },
};

// ============ Quick Actions FAB Component ============
export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Close on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleActionClick = (view: AppView) => {
    setIsOpen(false);
    navigateTo(view);
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 left-4 z-30 lg:bottom-6 lg:left-6"
      dir="rtl"
    >
      {/* Connector lines (visible when expanded) */}
      <AnimatePresence>
        {isOpen && (
          <svg
            className="pointer-events-none absolute bottom-[1.75rem] left-[1.75rem] z-0"
            width="80"
            height="260"
            viewBox="0 0 80 260"
            fill="none"
            style={{ transform: 'translate(-50%, -100%) scaleX(-1)' }}
          >
            <motion.line
              x1="40"
              y1="0"
              x2="40"
              y2="248"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-emerald-300/20 dark:text-emerald-500/15"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </AnimatePresence>

      {/* Radial action buttons */}
      <AnimatePresence>
        {isOpen &&
          ACTIONS.map((action, index) => {
            const Icon = action.icon;
            const pos = ARC_POSITIONS[index];
            return (
              <motion.button
                key={action.view}
                initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                exit={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.05,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                onClick={() => handleActionClick(action.view)}
                className={cn(
                  'group absolute bottom-[1.75rem] left-[1.75rem] z-10',
                  'flex size-11 items-center justify-center rounded-full',
                  'shadow-lg backdrop-blur-sm',
                  'transition-all duration-200',
                  'hover:scale-110 hover:shadow-xl active:scale-95',
                  'ring-2 ring-white/20 dark:ring-black/10',
                  action.bgClass,
                  action.shadowClass,
                )}
                aria-label={action.label}
                title={action.label}
              >
                <Icon className={cn('size-5', action.color)} strokeWidth={2} />

                {/* Tooltip with glass-morphism */}
                <motion.span
                  initial={{ opacity: 0, x: 8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 8, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.9 }}
                  transition={{ duration: 0.15, delay: index * 0.05 + 0.1 }}
                  className={cn(
                    'pointer-events-none absolute',
                    'right-full mr-2 whitespace-nowrap',
                    'rounded-lg px-3 py-1.5',
                    'text-xs font-medium text-foreground',
                    'bg-background/70 backdrop-blur-md',
                    'border border-border/40',
                    'shadow-md',
                    'opacity-0 group-hover:opacity-100',
                    'transition-opacity duration-150',
                  )}
                >
                  {action.label}
                  {/* Tooltip arrow */}
                  <span
                    className={cn(
                      'absolute top-1/2 -left-1 -translate-y-1/2',
                      'h-2 w-2 rotate-45',
                      'bg-background/70 border border-border/40',
                      'border-l-0 border-b-0',
                    )}
                  />
                </motion.span>
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={handleToggle}
        variants={pulseVariants}
        animate={isOpen ? 'expanded' : 'idle'}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative z-20 flex size-14 items-center justify-center rounded-full',
          'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600',
          'shadow-lg shadow-emerald-500/30',
          'ring-2 ring-white/20 dark:ring-black/10',
          'backdrop-blur-sm',
          'transition-shadow duration-200',
          'hover:shadow-xl hover:shadow-emerald-500/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
        )}
        aria-label={isOpen ? 'بستن منوی سریع' : 'منوی اقدامات سریع'}
        aria-expanded={isOpen}
      >
        {/* Glow ring when expanded */}
        <AnimatePresence>
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: 1, scale: 1.3 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md"
            />
          )}
        </AnimatePresence>

        {/* Plus / X icon */}
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Plus className="size-6 text-white drop-shadow-sm" strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      {/* Glass backdrop overlay when expanded */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[-1] bg-black/5 dark:bg-black/10 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
