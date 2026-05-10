'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';

import { useAppStore } from '@/lib/store';
import type { User } from '@/lib/types';

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

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const login = useAppStore((s) => s.login);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock user creation
    const mockUser: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      firstName: 'کاربر',
      lastName: 'نیاز فایندر',
      displayName: 'کاربر نیاز فایندر',
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
    setIsLoading(false);
    toast.success('ورود موفقیت‌آمیز!', {
      description: `خوش آمدید ${mockUser.firstName}`,
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
