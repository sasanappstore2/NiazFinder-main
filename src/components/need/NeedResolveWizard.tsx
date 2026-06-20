'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type ActiveBusiness = {
  sessionId: string;
  businessProfileId: string;
  conversationId: string | null;
  status: string;
  business: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    trustScore: number;
  };
};

interface NeedResolveWizardProps {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

export function NeedResolveWizard({ requestId, open, onOpenChange, onResolved }: NeedResolveWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businesses, setBusinesses] = useState<ActiveBusiness[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: ActiveBusiness[] }>(`/api/needs/${requestId}/active-businesses`);
      setBusinesses(res.data ?? []);
    } catch {
      toast.error('بارگذاری کسب\u200cوکارها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedId(null);
      setRating(5);
      setComment('');
      void loadBusinesses();
    }
  }, [open, loadBusinesses]);

  const submit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/needs/${requestId}/resolve`, {
        method: 'POST',
        body: { businessProfileId: selectedId, rating, comment: comment.trim() || undefined },
      });
      toast.success('نیاز با موفقیت حل شد');
      onOpenChange(false);
      onResolved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ثبت نتیجه');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>نیازم رفع شد</DialogTitle>
          <DialogDescription>
            {step === 1 && 'کسب\u200cوکاری که کار را انجام داد انتخاب کنید'}
            {step === 2 && 'امتیاز ۱ تا ۵ بدهید'}
            {step === 3 && 'نظر خود را بنویسید (اختیاری)'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : step === 1 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">گفتگوی فعالی برای این نیاز یافت نشد</p>
            ) : (
              businesses.map((b) => (
                <button
                  key={b.businessProfileId}
                  type="button"
                  onClick={() => setSelectedId(b.businessProfileId)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border text-start transition-colors',
                    selectedId === b.businessProfileId ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border hover:bg-muted/40'
                  )}
                >
                  <Avatar className="size-10">
                    <AvatarImage src={b.business.logo ?? undefined} />
                    <AvatarFallback>{b.business.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{b.business.name}</p>
                    <p className="text-xs text-muted-foreground">امتیاز اعتماد: {b.business.trustScore.toFixed(1)}</p>
                  </div>
                </button>
              ))
            )}
            <Button className="w-full mt-2" disabled={!selectedId} onClick={() => setStep(2)}>ادامه</Button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
                  <Star className={cn('size-8', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>بازگشت</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>ادامه</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="تجربه خود را بنویسید..." rows={4} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>بازگشت</Button>
              <Button className="flex-1" disabled={submitting} onClick={() => void submit()}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : 'ثبت و پایان'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
