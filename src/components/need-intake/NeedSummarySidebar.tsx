'use client';

import { Sparkles } from 'lucide-react';
import type { ParsedIntent } from '@/contracts/need-intake';

interface NeedSummarySidebarProps {
  summary: string;
  parsed?: ParsedIntent | null;
  visible?: boolean;
}

export function NeedSummarySidebar({
  summary,
  parsed,
  visible = true,
}: NeedSummarySidebarProps) {
  if (!visible || !summary.trim()) return null;

  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          پیش‌نمایش نیاز
        </div>
        {parsed?.title && (
          <p className="mb-2 text-sm font-semibold leading-snug">{parsed.title}</p>
        )}
        <p className="text-muted-foreground whitespace-pre-line text-xs leading-relaxed">
          {summary}
        </p>
      </div>
    </aside>
  );
}
