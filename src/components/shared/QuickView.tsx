'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Clock, MapPin, DollarSign, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { formatBudgetRange, getTimeAgo } from '@/lib/constants';
import { getCategoryAppearance } from '@/lib/category-appearance';
import type { ServiceRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';

// ============ Quick View Popover ============
interface QuickViewProps {
  request: ServiceRequest;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

export function QuickViewPopover({ request, anchorRect, onClose }: QuickViewProps) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const popoverRef = useRef<HTMLDivElement>(null);

  const catAppearance = getCategoryAppearance(request.categoryName);
  const CategoryIcon = catAppearance.icon;
  const categoryColor = catAppearance.color;
  const fullName = `${request.user.firstName} ${request.user.lastName}`;
  const initials = `${request.user.firstName.charAt(0)}${request.user.lastName.charAt(0)}`;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Position popover
  const style: React.CSSProperties = {};
  if (anchorRect) {
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceRight = window.innerWidth - anchorRect.left;
    if (spaceBelow < 300) {
      style.bottom = `${window.innerHeight - anchorRect.top + 8}px`;
    } else {
      style.top = `${anchorRect.bottom + 8}px`;
    }
    if (spaceRight < 380) {
      style.right = `${window.innerWidth - anchorRect.right}px`;
    } else {
      style.left = `${anchorRect.left}px`;
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed z-[var(--z-dropdown,100)] w-[360px] rounded-2xl border border-border/60 bg-background/95 p-5 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        style={style}
        dir="rtl"
        role="dialog"
        aria-label={`پیش‌نمایش: ${request.title}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}18, ${categoryColor}0A)`,
              border: `1.5px solid ${categoryColor}28`,
            }}
          >
            <CategoryIcon style={{ width: 20, height: 20, color: categoryColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[15px] text-foreground leading-snug truncate">
              {request.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${categoryColor}12`,
                  color: categoryColor,
                }}
              >
                {request.categoryName}
              </span>
              {request.priority !== 'NORMAL' && (
                <span className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                  request.priority === 'URGENT'
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : request.priority === 'HIGH'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {request.priority === 'URGENT' ? 'فوری' : request.priority === 'HIGH' ? 'زیاد' : 'کم'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3 mb-4">
          {request.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-4">
          {request.budgetMin && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-200/40 dark:ring-emerald-800/30">
              <DollarSign className="size-3" />
              {formatBudgetRange(request.budgetMin, request.budgetMax)}
            </span>
          )}
          {request.city && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/20">
              <MapPin className="size-3" />
              {request.city}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/20">
            <Clock className="size-3" />
            {getTimeAgo(request.createdAt)}
          </span>
        </div>

        {/* User + Action */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-[12px] font-medium text-foreground">{fullName}</p>
              <p className="text-[10px] text-muted-foreground">
                {request.proposalCount} پیشنهاد
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 rounded-lg text-[12px] font-medium gap-1.5 px-3"
            onClick={() => {
              navigateTo('request-detail', { id: request.id });
              onClose();
            }}
          >
            مشاهده جزئیات
            <ChevronLeft className="size-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============ Quick View Hook ============
export function useQuickView() {
  const [quickView, setQuickView] = useState<{
    request: ServiceRequest;
    anchorRect: DOMRect | null;
  } | null>(null);

  const showQuickView = useCallback((request: ServiceRequest, e: React.MouseEvent) => {
    // Only show on desktop with Ctrl/Cmd or long press
    if (window.innerWidth < 768) return;
    if (!e.metaKey && !e.ctrlKey) return;

    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setQuickView({ request, anchorRect: rect });
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickView(null);
  }, []);

  return { quickView, showQuickView, closeQuickView };
}
