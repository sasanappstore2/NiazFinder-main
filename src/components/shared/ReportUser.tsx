'use client';

import { useState } from 'react';
import { AlertTriangle, Flag, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============ Report Reasons ============
const REPORT_REASONS = [
  { id: 'inappropriate', label: 'محتوای نامناسب یا توهین‌آمیز' },
  { id: 'misleading', label: 'اطلاعات نادرست یا گمراه‌کننده' },
  { id: 'spam', label: 'هرزنامه یا تبلیغات' },
  { id: 'copyright', label: 'نقض قوانین کپی‌رایت' },
  { id: 'fraud', label: 'کلاهبرداری یا فعالیت مشکوک' },
  { id: 'other', label: 'سایر موارد' },
];

const MAX_DESCRIPTION_LENGTH = 500;

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: 'کاربر',
  request: 'نیاز',
  comment: 'دیدگاه',
};

// ============ Props ============
interface ReportUserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  targetType: 'user' | 'request' | 'comment';
}

// ============ Report User Dialog ============
export function ReportUser({ open, onOpenChange, targetName, targetType }: ReportUserProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeLabel = TARGET_TYPE_LABELS[targetType] || 'مورد';

  const canSubmit = selectedReason !== '' && description.length <= MAX_DESCRIPTION_LENGTH;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsSubmitting(false);
    toast.success('گزارش شما با موفقیت ارسال شد.', {
      description: 'تیم پشتیبانی آن را بررسی خواهد کرد.',
    });

    // Close dialog after 1.5s
    setTimeout(() => {
      handleReset();
      onOpenChange(false);
    }, 1500);
  };

  const handleReset = () => {
    setSelectedReason('');
    setDescription('');
    setIsAnonymous(true);
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md sm:max-w-lg"
        dir="rtl"
      >
        <div>
          {/* Header */}
          <DialogHeader className="gap-3 text-right">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
                <Flag className="size-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold leading-relaxed">
                  گزارش تخلف یا نقض قوانین
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed">
                  گزارش‌های شما به صورت محرمانه بررسی می‌شوند
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Target Info */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              شما در حال گزارش{' '}
              <Badge variant="secondary" className="mx-1 font-semibold">
                {targetName}
              </Badge>{' '}
              ({typeLabel}) هستید
            </p>
          </div>

          {/* Report Reasons */}
          <div className="mt-5 space-y-3">
            <Label className="text-sm font-semibold">دلیل گزارش</Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="grid gap-2"
              dir="rtl"
            >
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  htmlFor={`report-reason-${reason.id}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-all',
                    selectedReason === reason.id
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-border/40 text-muted-foreground hover:border-border hover:bg-muted/40'
                  )}
                >
                  <RadioGroupItem
                    value={reason.id}
                    id={`report-reason-${reason.id}`}
                    className="shrink-0"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Description */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="report-description" className="text-sm font-semibold">
              توضیحات تکمیلی <span className="text-muted-foreground font-normal">(اختیاری)</span>
            </Label>
            <Textarea
              id="report-description"
              placeholder="لطفاً جزئیات بیشتری درباره گزارش خود بنویسید..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              className="min-h-[80px] resize-none text-sm leading-7"
              dir="rtl"
            />
            <div className="flex justify-start">
              <span
                className={cn(
                  'text-xs',
                  description.length > MAX_DESCRIPTION_LENGTH * 0.9
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {description.length} / {MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>

          {/* Anonymous Checkbox */}
          <div className="mt-3 flex items-center gap-3">
            <Checkbox
              id="report-anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              className="shrink-0"
            />
            <Label
              htmlFor="report-anonymous"
              className="cursor-pointer text-sm text-muted-foreground"
            >
              می‌خواهم ناشناس بمانم
            </Label>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="mt-5 gap-2 sm:justify-start">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ms-2 size-4 animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                <>
                  <Send className="ms-2 size-4" />
                  ارسال گزارش
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
