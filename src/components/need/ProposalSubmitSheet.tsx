'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { PriceInput } from '@/components/need-intake/PriceInput';
import { toAsciiDigits } from '@/lib/format/digits';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  startConversation,
  syncConversationAfterStart,
  navigateToConversation,
} from '@/lib/contact/start-conversation';
import { trackAnalyticsEvent } from '@/lib/analytics/track';

interface ProposalSubmitSheetProps {
  requestId: string;
  requestTitle: string;
}

export function ProposalSubmitSheet({ requestId, requestTitle }: ProposalSubmitSheetProps) {
  const router = useRouter();
  const submitProposal = useAppStore((s) => s.submitProposal);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const currentUser = useAppStore((s) => s.currentUser);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const fetchRequestDetail = useAppStore((s) => s.fetchRequestDetail);

  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast.info('ابتدا وارد شوید');
      return;
    }
    const priceNum = Number(toAsciiDigits(price));
    const days = Number(toAsciiDigits(deliveryDays));
    if (message.trim().length < 50) {
      toast.error('توضیحات حداقل ۵۰ کاراکتر');
      return;
    }
    if (!priceNum || priceNum <= 0) {
      toast.error('مبلغ نامعتبر');
      return;
    }
    if (!days || days <= 0) {
      toast.error('زمان تحویل نامعتبر');
      return;
    }

    setLoading(true);
    const ok = await submitProposal({
      requestId,
      price: priceNum,
      deliveryTime: days,
      deliveryUnit: 'day',
      message: message.trim(),
    });
    setLoading(false);
    if (ok) {
      trackAnalyticsEvent('proposal_sent', { requestId }, { userId: currentUser?.id });
      toast.success('پیشنهاد شما ثبت شد');
      setMessage('');
      setPrice('');
      setDeliveryDays('');

      if (authToken && currentUser) {
        try {
          const detail = await fetchRequestDetail(requestId);
          const ownerId = detail?.user?.id;
          if (ownerId && ownerId !== currentUser.id) {
            const result = await startConversation(
              { otherUserId: ownerId, requestId },
              authToken
            );
            syncConversationAfterStart(result);
            toast.info('می‌خواهید به کارفرما پیام دهید؟', {
              action: {
                label: 'باز کردن چت',
                onClick: () => navigateToConversation(router, result.conversationId),
              },
            });
          }
        } catch {
          /* optional chat prompt */
        }
      }
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4 pb-6">
      <p className="text-body-sm text-muted-foreground">برای: {requestTitle}</p>
      <div>
        <Label htmlFor="prop-msg">توضیحات پیشنهاد</Label>
        <Textarea
          id="prop-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1.5"
          placeholder="حداقل ۵۰ کاراکتر…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="prop-price">مبلغ (تومان)</Label>
          <div className="mt-1.5">
            <PriceInput
              value={price ? Number(toAsciiDigits(price)) : ''}
              onChange={(v) => setPrice(v === '' ? '' : String(v))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="prop-days">تحویل (روز)</Label>
          <PersianDigitInput
            id="prop-days"
            dir="ltr"
            variant="plain"
            value={deliveryDays}
            onChange={setDeliveryDays}
            className="mt-1.5 text-left"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 ml-2" />}
        ارسال پیشنهاد
      </Button>
    </form>
  );
}
