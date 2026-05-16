'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { PhoneOtpForm } from './PhoneOtpForm';

export function AuthModal() {
  const authModalOpen = useAppStore((s) => s.authModalOpen);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setAuthModalOpen(false);
      }
    },
    [setAuthModalOpen],
  );

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-right text-xl font-bold">
            ورود / ثبت‌نام
          </DialogTitle>
          <DialogDescription className="text-right">
            برای دسترسی به تمام امکانات شماره موبایل خود را وارد کنید
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-2">
          <PhoneOtpForm />
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
