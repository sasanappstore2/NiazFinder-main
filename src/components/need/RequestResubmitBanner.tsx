'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function RequestResubmitBanner({
  requestId,
  rejectionReason,
  onResubmitted,
}: {
  requestId: string;
  rejectionReason?: string | null;
  onResubmitted?: () => void;
}) {
  const authToken = useAppStore((s) => s.authToken);
  const [isLoading, setIsLoading] = useState(false);

  const resubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/resubmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success(data.message || 'برای بازبینی مجدد ارسال شد');
      onResubmitted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-900 dark:text-amber-100">آگهی رد موقت شد</p>
          {rejectionReason && (
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">{rejectionReason}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            پس از ویرایش، می‌توانید برای بازبینی مجدد ارسال کنید.
          </p>
          <Button className="mt-3 gap-2" size="sm" onClick={resubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            ارسال مجدد برای بازبینی
          </Button>
        </div>
      </div>
    </div>
  );
}
