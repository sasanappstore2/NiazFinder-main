'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn, Eye, EyeOff, Github } from 'lucide-react';

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
import { cn } from '@/lib/utils';

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

// ============ Google SVG Icon ============
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  // Load remember me email from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nf_remember_email');
      if (saved) {
        form.setValue('email', saved);
        setRememberMe(true);
      }
    } catch {
      // Ignore
    }
  }, [form]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    // Save remember me
    try {
      if (rememberMe) {
        localStorage.setItem('nf_remember_email', data.email);
      } else {
        localStorage.removeItem('nf_remember_email');
      }
    } catch {
      // Ignore
    }

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

        login(user, token);
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

  const handleSocialLogin = (provider: string) => {
    toast.info('به زودی فعال می‌شود', {
      description: `ورود با ${provider} به زودی در دسترس خواهد بود`,
    });
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
                      type={showPassword ? 'text' : 'password'}
                      placeholder="رمز عبور خود را وارد کنید"
                      className="pr-10 pl-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Remember Me + Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-border accent-emerald-600"
              />
              <span className="text-sm text-muted-foreground">مرا به خاطر بسپار</span>
            </label>
            <button
              type="button"
              className="text-sm text-primary hover:underline font-medium"
              onClick={() => toast.info('به زودی فعال می‌شود', {
                description: 'بازیابی رمز عبور به زودی در دسترس خواهد بود',
              })}
            >
              فراموشی رمز عبور
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ورود...
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                ورود به حساب کاربری
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Social Login Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">یا ورود با</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 h-10"
          onClick={() => handleSocialLogin('Google')}
        >
          <GoogleIcon className="size-4" />
          <span className="text-sm">گوگل</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 h-10"
          onClick={() => handleSocialLogin('GitHub')}
        >
          <Github className="size-4" />
          <span className="text-sm">گیت‌هاب</span>
        </Button>
      </div>

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
