'use client';

import { Home, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUBJECT_KIND_LABELS } from '@/lib/business/workspace/collaboration-posts';
import type { CollaborationSubjectKind } from '@prisma/client';

const SUBJECT_OPTIONS: Array<{
  value: CollaborationSubjectKind;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    value: 'CLIENT',
    label: SUBJECT_KIND_LABELS.CLIENT,
    description: 'مشتری آماده دارم — به همکار منطقه‌ای ارجاع می‌دهم',
    icon: Users,
  },
  {
    value: 'PROPERTY',
    label: SUBJECT_KIND_LABELS.PROPERTY,
    description: 'فایل ملکی دارم — دنبال همکار برای بستن معامله',
    icon: Home,
  },
];

export function StepIntent({
  value,
  onChange,
}: {
  value: CollaborationSubjectKind;
  onChange: (value: CollaborationSubjectKind) => void;
}) {
  return (
    <div className="grid gap-2">
      {SUBJECT_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-start transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border/70 hover:bg-muted/40'
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {opt.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
