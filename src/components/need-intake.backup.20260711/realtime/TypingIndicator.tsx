'use client';

import { Loader2 } from 'lucide-react';
import type { TypingAnalysisStatus } from '@/contracts/typing-analysis';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  status: TypingAnalysisStatus;
  className?: string;
}

export function TypingIndicator({ status, className }: TypingIndicatorProps) {
  if (status !== 'analyzing') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
      aria-live="polite"
    >
      <Loader2 className="size-3 animate-spin" />
      در حال تحلیل…
    </span>
  );
}
