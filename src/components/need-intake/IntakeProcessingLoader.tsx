'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function IntakeProcessingLoader({
  label = 'در حال آماده‌سازی…',
  steps,
  intervalMs = 2200,
}: {
  label?: string;
  /** When set, cycles through labels while loading. */
  steps?: string[];
  intervalMs?: number;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!steps?.length || steps.length <= 1) {
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [steps, intervalMs]);

  const displayLabel = steps?.length ? steps[stepIndex] ?? label : label;

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
      <span>{displayLabel}</span>
    </div>
  );
}
