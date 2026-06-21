'use client';

import { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { PhoneOtpForm, type PhoneOtpStep } from './PhoneOtpForm';

const STEP_COPY: Record<
  PhoneOtpStep,
  { title: string; description?: string }
> = {
  phone: {
    title: 'ورود / ثبت‌نام',
    description: 'برای دسترسی به تمام امکانات شماره موبایل خود را وارد کنید',
  },
  password: {
    title: 'ورود',
    description: 'رمز عبور حساب کاربری خود را وارد کنید',
  },
  otp: {
    title: 'کد تایید',
    description: 'کد ارسال‌شده به موبایل خود را وارد کنید',
  },
  'set-password': {
    title: 'انتخاب رمز عبور',
    description: 'یک رمز عبور برای حساب کاربری خود انتخاب کنید',
  },
  welcome: {
    title: 'خوش آمدید',
  },
};

export function AuthModal() {
  const authModalOpen = useAppStore((s) => s.authModalOpen);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const [otpStep, setOtpStep] = useState<PhoneOtpStep>('phone');

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setAuthModalOpen(false);
        setOtpStep('phone');
      }
    },
    [setAuthModalOpen]
  );

  const handleStepChange = useCallback((step: PhoneOtpStep) => {
    setOtpStep(step);
  }, []);

  const { title, description } = STEP_COPY[otpStep];

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto sm:max-w-[440px] p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-right text-xl font-bold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-right">{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 pb-6 pt-2">
          <PhoneOtpForm onStepChange={handleStepChange} />
        </div>
      </DialogContent>
      <noscript>
        <div className="sr-only">
          <h1>ورود و ثبت‌نام - نیاز فایندر</h1>
          <p>ورود به پلتفرم نیاز فایندر با شماره موبایل و کد تایید.</p>
        </div>
      </noscript>
    </Dialog>
  );
}
