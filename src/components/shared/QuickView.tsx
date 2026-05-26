'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Eye, Clock, MapPin, DollarSign, ChevronLeft, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { formatBudgetRange, getTimeAgo } from '@/lib/constants';
import { getCategoryAppearance } from '@/lib/category-appearance';
import type { ServiceRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';

// ============ Quick View Modal (Glassmorphism) ============
interface QuickViewProps {
  request: ServiceRequest;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

export function QuickViewPopover({ request, anchorRect, onClose }: QuickViewProps) {
  const { navigateTo } = useNavigate();
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
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position popover
  const style: React.CSSProperties = {};
  if (anchorRect) {
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceRight = window.innerWidth - anchorRect.left;
    if (spaceBelow < 400) {
      style.bottom = `${window.innerHeight - anchorRect.top + 8}px`;
    } else {
      style.top = `${anchorRect.bottom + 8}px`;
    }
    if (spaceRight < 420) {
      style.right = `${window.innerWidth - anchorRect.right}px`;
    } else {
      style.left = `${anchorRect.left}px`;
    }
  }

  const handleSendProposal = () => {
    navigateTo('submit-proposal', { requestId: request.id });
    onClose();
  };

  const handleViewDetails = () => {
    navigateTo('request-detail', { id: request.id });
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-[var(--z-dropdown,100)] w-[400px] rounded-2xl p-5',
        'animate-scale-in',
        // Glassmorphism
        'bg-white/80 dark:bg-card/80 backdrop-blur-xl',
        'border border-white/30 dark:border-white/10',
        'shadow-[0_24px_64px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.4)]',
        'ring-1 ring-emerald-500/10 dark:ring-emerald-400/10',
      )}
      style={style}
      dir="rtl"
      role="dialog"
      aria-label={`پیش‌نمایش: ${request.title}`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 end-3 flex size-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="بستن"
      >
        <X className="size-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${categoryColor}18, ${categoryColor}0A)`,
            border: `1.5px solid ${categoryColor}28`,
          }}
        >
          <CategoryIcon style={{ width: 22, height: 22, color: categoryColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] text-foreground leading-snug mb-1.5">
            {request.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-semibold"
              style={{
                backgroundColor: `${categoryColor}12`,
                color: categoryColor,
              }}
            >
              {request.categoryName}
            </span>
            {request.priority !== 'NORMAL' && (
              <span className={cn(
                'rounded-md px-2 py-0.5 text-caption font-semibold',
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
      <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-4 mb-4">
        {request.description}
      </p>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {request.budgetMin && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/80 px-2.5 py-1.5 text-caption font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-200/40 dark:ring-emerald-800/30">
            <DollarSign className="size-3" />
            {formatBudgetRange(request.budgetMin, request.budgetMax)}
          </span>
        )}
        {request.city && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-caption font-medium text-muted-foreground ring-1 ring-border/20">
            <MapPin className="size-3" />
            {request.city}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-caption font-medium text-muted-foreground ring-1 ring-border/20">
          <Clock className="size-3" />
          {getTimeAgo(request.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-caption font-medium text-muted-foreground ring-1 ring-border/20">
          <Eye className="size-3" />
          {request.viewCount?.toLocaleString('fa-IR') || '۰'} بازدید
        </span>
      </div>

      {/* User + Action */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
            {initials}
          </div>
          <div>
            <p className="text-[12px] font-medium text-foreground">{fullName}</p>
            <p className="text-caption text-muted-foreground">
              {request.proposalCount?.toLocaleString('fa-IR') || '۰'} پیشنهاد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-caption font-medium gap-1.5 px-3"
            onClick={handleSendProposal}
          >
            <Send className="size-3" />
            ارسال پیشنهاد
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg text-caption font-medium gap-1.5 px-3"
            onClick={handleViewDetails}
          >
            مشاهده
            <ChevronLeft className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
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
