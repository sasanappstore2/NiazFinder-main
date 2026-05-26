'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, FileText, Search, MessageSquare, Gift } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { legacyViewToPath } from '@/config/routes';

// ============ Action Configuration ============
interface QuickAction {
  label: string;
  ariaLabel: string;
  icon: typeof FileText;
  view: AppView;
  color: string;
  bgClass: string;
  shadowClass: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'ثبت نیاز',
    ariaLabel: 'ثبت نیاز جدید - درخواست خدمات',
    icon: FileText,
    view: 'post-need',
    color: 'text-white',
    bgClass: 'bg-emerald-500 hover:bg-emerald-600',
    shadowClass: 'shadow-emerald-500/30',
  },
  {
    label: 'جستجوی کسب‌وکار',
    ariaLabel: 'جستجوی کسب‌وکار - مرور پروفایل کسب‌وکارها',
    icon: Search,
    view: 'browse-specialists',
    color: 'text-white',
    bgClass: 'bg-amber-500 hover:bg-amber-600',
    shadowClass: 'shadow-amber-500/30',
  },
  {
    label: 'پیام جدید',
    ariaLabel: 'پیام جدید - مکاتبات و گفتگو',
    icon: MessageSquare,
    view: 'messages',
    color: 'text-white',
    bgClass: 'bg-cyan-500 hover:bg-cyan-600',
    shadowClass: 'shadow-cyan-500/30',
  },
  {
    label: 'دعوت دوست',
    ariaLabel: 'دعوت از دوستان - کسب پاداش دعوت',
    icon: Gift,
    view: 'referral',
    color: 'text-white',
    bgClass: 'bg-rose-500 hover:bg-rose-600',
    shadowClass: 'shadow-rose-500/30',
  },
];

// Arc positions for each action (fan out upward-left in RTL)
const ARC_POSITIONS = [
  { x: -12, y: -68 },   // 1st: slightly left, first tier up
  { x: -32, y: -128 },  // 2nd: more left, second tier up
  { x: -12, y: -188 },  // 3rd: slightly left, third tier up
  { x: -32, y: -248 },  // 4th: more left, fourth tier up
];

// ============ Quick Actions FAB Component ============
export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { navigateTo } = useNavigate();

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

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
      className="fixed bottom-24 left-4 z-(--z-overlay) lg:bottom-6 lg:left-6"
      dir="rtl"
    >
      {/* Radial action buttons */}
      {ACTIONS.map((action, index) => {
        const Icon = action.icon;
        const pos = ARC_POSITIONS[index];
        return (
          <button
            key={action.view}
            onClick={() => handleActionClick(action.view)}
            data-href={legacyViewToPath(action.view)}
            aria-label={action.ariaLabel}
            title={action.label}
            style={{
              bottom: '1.75rem',
              left: '1.75rem',
              transform: isOpen ? `translate(${pos.x}px, ${pos.y}px)` : 'translate(0, 0)',
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
              transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
            }}
            className={cn(
              'absolute z-10',
              'flex h-11 w-11 items-center justify-center rounded-full',
              'shadow-lg backdrop-blur-xs',
              'transition-all duration-150 ease-in-out',
              'hover:shadow-xl active:scale-95',
              'ring-2 ring-white/20 dark:ring-black/10',
              action.bgClass,
              action.shadowClass,
            )}
          >
            <Icon className={cn('size-5', action.color)} strokeWidth={2} />

            {/* Tooltip */}
            <span
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
              <span
                className={cn(
                  'absolute top-1/2 -left-1 -translate-y-1/2',
                  'h-2 w-2 rotate-45',
                  'bg-background/70 border border-border/40',
                  'border-l-0 border-b-0',
                )}
              />
            </span>
          </button>
        );
      })}

      {/* Main FAB button */}
      <button
        onClick={handleToggle}
        aria-label={isOpen ? 'بستن منوی سریع' : 'منوی اقدامات سریع'}
        aria-expanded={isOpen}
        aria-controls="quick-actions-menu"
        title={isOpen ? 'بستن منوی اقدامات سریع' : 'منوی اقدامات سریع - ثبت نیاز، جستجوی کسب‌وکار، پیام و دعوت دوست'}
        className={cn(
          'relative z-20 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-linear-to-br from-emerald-400 via-emerald-500 to-emerald-600',
          'shadow-lg shadow-emerald-500/30',
          'ring-2 ring-white/20 dark:ring-black/10',
          'backdrop-blur-xs',
          'transition-shadow duration-150',
          'hover:shadow-xl hover:shadow-emerald-500/40',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
        )}
      >
        {/* Plus / X icon with CSS rotation */}
        <span
          className="flex items-center justify-center transition-transform duration-150 ease-in-out"
          style={{ transform: isOpen ? 'rotate(135deg)' : 'rotate(0deg)' }}
        >
          <Plus className="size-6 text-white drop-shadow-xs" strokeWidth={2.5} />
        </span>
      </button>

      {/* Glass backdrop overlay when expanded */}
      {isOpen && (
        <div
          className="pointer-events-none fixed inset-0 z-[-1] bg-black/5 backdrop-blur-[1px] transition-opacity duration-150 ease-in-out dark:bg-black/10"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
