'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { followUpSubjectLabel, type WorkspaceFollowUpCandidate } from '@/lib/business/workspace/follow-up-source';

export function AddToFollowUpDialog({
  target,
  open,
  onOpenChange,
  onSubmit,
}: {
  target: WorkspaceFollowUpCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) setNote('');
  }, [open]);

  const handleSubmit = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onOpenChange(false);
  };

  const placeholder =
    target?.kind === 'collaboration'
      ? 'مثلاً: فردا با مشاور تماس بگیرم، برای هم‌بازدید هماهنگ شود...'
      : 'مثلاً: تماس فردا ساعت ۱۰، مشتری به آپارتمان ۱۳۰ متری علاقه‌مند است...';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن به پیگیری‌ها</DialogTitle>
          {target ? (
            <DialogDescription className="line-clamp-2 text-start">
              {followUpSubjectLabel(target)}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="follow-up-note" className="text-sm font-medium">
            یادداشت پیگیری
          </label>
          <Textarea
            id="follow-up-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-none text-sm"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={!note.trim()}>
            افزودن به پیگیری‌ها
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
