'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Lock,
  Phone,
  Loader2,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';

import { useAppStore } from '@/lib/store';
import type { User as UserType } from '@/lib/types';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const iranianPhoneRegex = /^09[0-9]{9}$/;

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'نام الزامی است')
      .min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
    lastName: z
      .string()
      .min(1, 'نام خانوادگی الزامی است')
      .min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد'),
    email: z
      .string()
      .min(1, 'ایمیل الزامی است')
      .email('لطفاً یک ایمیل معتبر وارد کنید'),
    phone: z
      .string()
      .min(1, 'شماره موبایل الزامی است')
      .regex(iranianPhoneRegex, 'شماره موبایل معتبر نیست (مثال: 09123456789)'),
    password: z
      .string()
      .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
    confirmPassword: z.string().min(1, 'تأیید رمز عبور الزامی است'),
    role: z.enum(['CLIENT', 'SPECIALIST'], {
      required_error: 'لطفاً نقش خود را انتخاب کنید',
    }),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'پذیرش قوانین و مقررات الزامی است' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'رمز عبور و تأیید آن مطابقت ندارند',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const login = useAppStore((s) => s.login);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'CLIENT',
      acceptTerms: undefined,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Mock user creation
    const mockUser: UserType = {
      id: `user-${Date.now()}`,
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      role: data.role,
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
    toast.success('ثبت‌نام موفقیت‌آمیز!', {
      description: `خوش آمدید ${mockUser.firstName} ${mockUser.lastName}`,
    });
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* First Name */}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="نام خود را وارد کنید"
                        className="pr-10 pl-3"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Last Name */}
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام خانوادگی</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="نام خانوادگی خود را وارد کنید"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
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

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>شماره موبایل</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      placeholder="09123456789"
                      className="pr-10 pl-3"
                      dir="ltr"
                      maxLength={11}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  شماره موبایل ۱۱ رقمی ایرانی (با ۰۹ شروع شود)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
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
                        placeholder="حداقل ۸ کاراکتر"
                        className="pr-10 pl-3"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تأیید رمز عبور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="password"
                        placeholder="رمز عبور را مجدداً وارد کنید"
                        className="pr-10 pl-3"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Role Select */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نقش</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  dir="rtl"
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="نقش خود را انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CLIENT">کاربر عادی</SelectItem>
                    <SelectItem value="SPECIALIST">متخصص</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {field.value === 'SPECIALIST'
                    ? 'به عنوان متخصص می‌توانید پروژه دریافت کنید'
                    : 'به عنوان کاربر عادی می‌توانید نیاز ثبت کنید'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Accept Terms */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    <span className="text-muted-foreground">
                      با{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                      >
                        قوانین و مقررات
                      </button>{' '}
                      و{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                      >
                        حریم خصوصی
                      </button>{' '}
                      موافقم
                    </span>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin ml-2" />
                در حال ثبت‌نام...
              </>
            ) : (
              <>
                <UserPlus className="size-4 ml-2" />
                ثبت‌نام
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Login Link */}
      <div className="text-center text-sm text-muted-foreground pt-2">
        قبلاً ثبت‌نام کرده‌اید؟{' '}
        <button
          type="button"
          onClick={() => setAuthModalTab('login')}
          className="text-primary hover:underline font-semibold"
        >
          وارد شوید
        </button>
      </div>
    </div>
  );
}
