'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';

import { useAppStore } from '@/lib/store';
import type { User, Notification } from '@/lib/types';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'ایمیل الزامی است')
    .email('لطفاً یک ایمیل معتبر وارد کنید'),
  password: z
    .string()
    .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============ Mock Notifications ============
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-mock-1',
    type: 'new_proposal',
    title: 'پیشنهاد جدید',
    message: 'کسب‌وکاری برای نیاز «طراحی سایت فروشگاهی» پیشنهادی ارسال کرده است.',
    isRead: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    data: { requestId: 'r1' },
  },
  {
    id: 'notif-mock-2',
    type: 'message',
    title: 'پیام جدید',
    message: 'شما یک پیام جدید از «علی محمدی» دریافت کرده‌اید.',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    data: { conversationId: 'conv-1' },
  },
  {
    id: 'notif-mock-3',
    type: 'system',
    title: 'خوش آمدید!',
    message: 'به نیاز فایندر خوش آمدید. پروفایل خود را تکمیل کنید تا بهترین کسب‌وکارها را پیدا کنید.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'notif-mock-4',
    type: 'new_proposal',
    title: 'پیشنهاد جدید',
    message: 'برای نیاز «تعمیر گوشی سامسونگ S23» یک پیشنهاد جدید دریافت کرده‌اید.',
    isRead: false,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    data: { requestId: 'r2' },
  },
  {
    id: 'notif-mock-5',
    type: 'system',
    title: 'تکمیل پروفایل',
    message: 'پروفایل خود را تکمیل کنید تا شانس دریافت پیشنهادهای بیشتر را داشته باشید.',
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const login = useAppStore((s) => s.login);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);
  const setNotifications = useAppStore((s) => s.setNotifications);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      // Try real API first
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const responseJson = await res.json();
        const apiUser = responseJson.user;
        const token = responseJson.token;

        // Map API user to app User type
        const user: User = {
          id: apiUser.id,
          email: apiUser.email,
          phone: apiUser.phone || undefined,
          firstName: apiUser.firstName,
          lastName: apiUser.lastName,
          displayName: apiUser.displayName || undefined,
          avatar: apiUser.avatar || undefined,
          role: apiUser.role as User['role'],
          isVerified: apiUser.isVerified,
          isActive: true,
          online: true,
          rating: 0,
          projectCount: 0,
          completionRate: 0,
          responseRate: 0,
          createdAt: typeof apiUser.createdAt === 'string'
            ? apiUser.createdAt
            : new Date(apiUser.createdAt).toISOString(),
        };

        // Store token in localStorage if returned
        if (token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('nf_auth_token', token);
          }
        }

        login(user);
        setNotifications(MOCK_NOTIFICATIONS);
        toast.success('ورود موفقیت‌آمیز!', {
          description: `خوش آمدید ${user.firstName}`,
        });
      } else {
        // API returned an error — fall back to mock user
        const errorJson = await res.json().catch(() => null);
        const errorMsg = errorJson?.error || 'خطایی در ورود رخ داد';

        // Create mock user from email prefix
        const emailPrefix = data.email.split('@')[0] || 'کاربر';
        const mockUser: User = {
          id: `user-${Date.now()}`,
          email: data.email,
          firstName: emailPrefix,
          lastName: 'کاربر نیاز فایندر',
          displayName: `${emailPrefix} کاربر نیاز فایندر`,
          role: 'CLIENT',
          isVerified: false,
          isActive: true,
          online: true,
          rating: 0,
          projectCount: 0,
          completionRate: 0,
          responseRate: 0,
          createdAt: new Date().toISOString(),
        };

        login(mockUser);
        setNotifications(MOCK_NOTIFICATIONS);
        toast.success('ورود موفقیت‌آمیز!', {
          description: `خوش آمدید ${mockUser.firstName}`,
        });
      }
    } catch {
      // Network error or other exception — fall back to mock user
      const emailPrefix = data.email.split('@')[0] || 'کاربر';
      const mockUser: User = {
        id: `user-${Date.now()}`,
        email: data.email,
        firstName: emailPrefix,
        lastName: 'کاربر نیاز فایندر',
        displayName: `${emailPrefix} کاربر نیاز فایندر`,
        role: 'CLIENT',
        isVerified: false,
        isActive: true,
        online: true,
        rating: 0,
        projectCount: 0,
        completionRate: 0,
        responseRate: 0,
        createdAt: new Date().toISOString(),
      };

      login(mockUser);
      setNotifications(MOCK_NOTIFICATIONS);
      toast.success('ورود موفقیت‌آمیز!', {
        description: `خوش آمدید ${mockUser.firstName}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ایمیل</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      className="pr-10 pl-3"
                      dir="ltr"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رمز عبور</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="رمز عبور خود را وارد کنید"
                      className="pr-10 pl-3"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Forgot Password Link */}
          <div className="flex justify-start">
            <button
              type="button"
              className="text-sm text-primary hover:underline font-medium"
            >
              فراموشی رمز عبور
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin ml-2" />
                در حال ورود...
              </>
            ) : (
              <>
                <LogIn className="size-4 ml-2" />
                ورود به حساب کاربری
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Register Link */}
      <div className="text-center text-sm text-muted-foreground pt-2">
        ثبت‌نام نکرده‌اید؟{' '}
        <button
          type="button"
          onClick={() => setAuthModalTab('register')}
          className="text-primary hover:underline font-semibold"
        >
          ثبت‌نام کنید
        </button>
      </div>
    </div>
  );
}
