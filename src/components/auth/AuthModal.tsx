'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const tabVariants = {
  hidden: { opacity: 0, x: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -20, filter: 'blur(4px)' },
};

const tabTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.25,
};

export function AuthModal() {
  const authModalOpen = useAppStore((s) => s.authModalOpen);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const authModalTab = useAppStore((s) => s.authModalTab);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setAuthModalOpen(false);
      }
    },
    [setAuthModalOpen],
  );

  // Reset tab to login when modal opens
  useEffect(() => {
    if (authModalOpen) {
      setAuthModalTab('login');
    }
  }, [authModalOpen, setAuthModalTab]);

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-right text-xl font-bold">
            {authModalTab === 'login'
              ? 'ورود به حساب کاربری'
              : 'ثبت‌نام'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {authModalTab === 'login'
              ? 'برای دسترسی به تمام امکانات وارد شوید'
              : 'حساب کاربری جدید ایجاد کنید'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={authModalTab}
          onValueChange={(val) => setAuthModalTab(val as 'login' | 'register')}
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

          <AnimatePresence mode="wait">
            <motion.div
              key={authModalTab}
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={tabTransition}
            >
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
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
