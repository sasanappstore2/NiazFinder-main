'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { INTAKE_COPY } from './intake-copy';

export interface IntakeMobileSummarySheetProps {
  summary: string;
  /** Inline chip in panel header (not fixed FAB). */
  inline?: boolean;
  className?: string;
}

export function IntakeMobileSummarySheet({
  summary,
  inline = false,
  className,
}: IntakeMobileSummarySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={inline ? 'outline' : 'secondary'}
          size="sm"
          className={cn(
            'gap-1.5',
            inline ? 'h-7 px-2 text-xs' : 'gap-2 shadow-md',
            className
          )}
          aria-label={INTAKE_COPY.liveSummaryAria}
        >
          <FileText className={inline ? 'size-3.5' : 'size-4'} />
          {INTAKE_COPY.liveSummaryTitle}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader className="text-right">
          <SheetTitle>{INTAKE_COPY.liveSummaryTitle}</SheetTitle>
        </SheetHeader>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {summary || INTAKE_COPY.liveSummaryEmpty}
        </p>
      </SheetContent>
    </Sheet>
  );
}
