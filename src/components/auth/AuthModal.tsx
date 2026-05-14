'use client';

import { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthModal() {
  const authModalOpen = useAppStore((s) => s.authModalOpen);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const authModalTab = useAppStore((s) => s.authModalTab);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const [visibleTab, setVisibleTab] = useState<'login' | 'register'>('login');

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setAuthModalOpen(false);
      } else {
        // Reset to login when opening
        setAuthModalTab('login');
        setVisibleTab('login');
      }
    },
    [setAuthModalOpen, setAuthModalTab],
  );

  const handleTabChange = useCallback((val: string) => {
    const newTab = val as 'login' | 'register';
    setAuthModalTab(newTab);
    setVisibleTab(newTab);
  }, [setAuthModalTab]);

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-right text-xl font-bold">
            {visibleTab === 'login'
              ? 'ورود به حساب کاربری'
              : 'ثبت‌نام'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {visibleTab === 'login'
              ? 'برای دسترسی به تمام امکانات وارد شوید'
              : 'حساب کاربری جدید ایجاد کنید'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={authModalTab}
          onValueChange={handleTabChange}
          dir="rtl"
          className="w-full"
        >
          <div className="px-6 pt-4">
            <TabsList className="w-full h-11">
              <TabsTrigger
                value="login"
                className="flex-1 text-sm font-medium data-[state=active]:shadow-sm"
              >
                ورود
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 text-sm font-medium data-[state=active]:shadow-sm"
              >
                ثبت‌نام
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="login" className="mt-0">
            <div className="p-6 pt-4">
              <LoginForm />
            </div>
          </TabsContent>
          <TabsContent value="register" className="mt-0">
            <div className="p-6 pt-4">
              <RegisterForm />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <noscript>
        <div className="sr-only">
          <h1>ورود و ثبت‌نام - نیاز فایندر</h1>
          <p>فرم ورود و ثبت‌نام کاربران در پلتفرم نیاز فایندر برای دسترسی به تمام امکانات پلتفرم.</p>
        </div>
      </noscript>
    </Dialog>
  );
}
