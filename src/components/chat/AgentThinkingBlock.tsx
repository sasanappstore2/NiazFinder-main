'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgentThinkingBlockProps {
  thinking: string;
  /** While the agent is still generating thinking / answer. */
  isLive?: boolean;
  className?: string;
}

export function AgentThinkingBlock({
  thinking,
  isLive = false,
  className,
}: AgentThinkingBlockProps) {
  const [open, setOpen] = useState(isLive);

  useEffect(() => {
    if (isLive) setOpen(true);
    else setOpen(false);
  }, [isLive]);

  if (!thinking.trim() && !isLive) return null;

  return (
    <div
      className={cn(
        'mb-2 overflow-hidden rounded-lg border border-border/60 bg-muted/40 text-start',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
        aria-expanded={open}
      >
        {isLive ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin opacity-80" aria-hidden />
        ) : (
          <Sparkles className="size-3.5 shrink-0 opacity-70" aria-hidden />
        )}
        <span className="flex-1 text-start font-medium">
          {isLive ? 'در حال فکر کردن…' : 'استدلال'}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 opacity-60 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="border-t border-border/50 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {thinking.trim() && thinking.trim() !== '…'
              ? thinking.trim()
              : isLive
                ? 'در حال آماده‌سازی پاسخ…'
                : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  check_user_account_status: 'بررسی وضعیت حساب…',
  search_needs_agent: 'جستجو در نیازها…',
  get_site_categories: 'دریافت دسته‌بندی‌ها…',
  search_site_categories: 'جستجوی دسته‌بندی…',
  search_site_cities: 'جستجوی شهر…',
  search_site_neighborhoods: 'جستجوی محله…',
  explain_need_fields: 'بررسی فیلدهای ثبت نیاز…',
  get_site_help: 'راهنمای سایت…',
  get_user_memory: 'خواندن حافظه…',
  update_user_memory: 'به‌روزرسانی حافظه…',
};

export function agentToolStatusLabel(toolName: string | undefined): string {
  if (!toolName) return 'در حال استفاده از ابزار…';
  return TOOL_LABELS[toolName] ?? 'در حال کار…';
}

export function AgentToolStatusChip({ toolName }: { toolName?: string }) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
      <Loader2 className="size-3 animate-spin opacity-80" aria-hidden />
      <span>{agentToolStatusLabel(toolName)}</span>
    </div>
  );
}

export function AgentStreamCursor() {
  return (
    <span
      className="ms-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.1em] animate-pulse bg-foreground/70 align-middle"
      aria-hidden
    />
  );
}

export function AgentTypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5" aria-label="در حال نوشتن">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:120ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:240ms]" />
    </span>
  );
}
