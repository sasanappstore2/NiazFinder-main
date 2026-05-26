'use client';

import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { cn } from '@/lib/utils';

export interface IntakeChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function IntakeChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'توضیح بیشتر، بودجه، زمان، جزئیات…',
}: IntakeChatComposerProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 44,
    maxHeight: 120,
  });

  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 backdrop-blur-xs">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          adjustHeight();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[44px] flex-1 resize-none border-0 bg-transparent py-2.5 shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
      />
      <Button
        type="button"
        size="icon"
        className={cn(
          'size-10 shrink-0 rounded-full',
          canSend
            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
            : 'bg-muted text-muted-foreground'
        )}
        disabled={!canSend}
        onClick={onSubmit}
        aria-label="ارسال پیام"
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}
