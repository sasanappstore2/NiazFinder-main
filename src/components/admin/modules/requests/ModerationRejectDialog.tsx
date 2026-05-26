'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ModerationAction } from './useModerationQueue';

export function ModerationRejectDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (action: 'reject_soft' | 'reject_final', reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (action: 'reject_soft' | 'reject_final') => {
    setIsSubmitting(true);
    try {
      await onConfirm(action, reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-content-zone sm:max-w-md">
        <DialogHeader>
          <DialogTitle>رد آگهی</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>دلیل (اختیاری)</Label>
            <Textarea
              className="admin-input min-h-[80px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="دلیل رد برای کاربر..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={() => submit('reject_soft')}
          >
            رد موقت (ویرایش مجدد)
          </Button>
          <Button
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => submit('reject_final')}
          >
            رد نهایی
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
