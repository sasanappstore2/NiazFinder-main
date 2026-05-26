'use client';

import { Loader2 } from 'lucide-react';

export function IntakeProcessingLoader({
  label = 'در حال آماده‌سازی…',
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <Loader2 className="size-4 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}
