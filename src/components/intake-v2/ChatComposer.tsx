'use client';

import { useCallback, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { cn } from '@/lib/utils';
import { isValidIranMobile } from '@/lib/lead-draft';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  phone?: string;
  onPhoneChange?: (value: string) => void;
  showPhone?: boolean;
  className?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = 'نیاز ملکی خود را بنویسید…',
  phone = '',
  onPhoneChange,
  showPhone = false,
  className,
}: ChatComposerProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 44,
    maxHeight: 160,
  });

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const canSend = value.trim().length > 0 && !isLoading && !disabled;
  const phoneOk = !showPhone || isValidIranMobile(phone);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSend && phoneOk) onSubmit();
      }
    },
    [canSend, phoneOk, onSubmit]
  );

  return (
    <div className={cn('border-t bg-background/95 p-3 backdrop-blur-sm', className)}>
      {showPhone && onPhoneChange ? (
        <div className="mb-2">
          <PersianDigitInput
            value={phone}
            onChange={onPhoneChange}
            placeholder="شماره موبایل (۰۹…)"
            className="h-9 text-sm"
            dir="ltr"
          />
          {phone.trim() && !phoneOk ? (
            <p className="mt-1 text-xs text-destructive">شماره موبایل معتبر نیست</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-end gap-2 rounded-2xl border bg-muted/30 p-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
          rows={1}
        />
        <Button
          type="button"
          size="icon"
          className="size-9 shrink-0 rounded-xl"
          disabled={!canSend || !phoneOk}
          onClick={onSubmit}
          aria-label="ارسال"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
