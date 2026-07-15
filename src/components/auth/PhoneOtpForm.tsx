'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Phone,
  Loader2,
  ShieldCheck,
  ArrowRight,
  PartyPopper,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import {
  AnimatedOtpInput,
  OTP_SUCCESS_ANIMATION_MS,
  type AnimatedOtpStatus,
} from '@/components/auth/AnimatedOtpInput';
import { cn } from '@/lib/utils';
import {
  formatIranMobileDisplay,
  normalizeIranMobile,
  toAsciiDigits,
  toPersianDigits,
} from '@/lib/format/digits';
import {
  AUTH_OTP_DEMO_CODE,
  AUTH_OTP_LENGTH,
  isAuthTestOtpModeClient,
} from '@/lib/auth/otp-client-config';

const OTP_LENGTH = AUTH_OTP_LENGTH;
const COUNTDOWN_SECONDS = 120;

const showTestOtpHint = isAuthTestOtpModeClient();

/** fetch() failed — usually dev server down, not missing internet. */
function authFetchErrorMessage(): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.';
  }
  return 'ارتباط با سرور برقرار نشد. اگر لوکال کار می‌کنید، در ترمینال `npm run dev` را اجرا کنید و صفحه را رفرش کنید.';
}

export type PhoneOtpStep = 'phone' | 'password' | 'otp' | 'set-password' | 'welcome';
type OtpMode = 'login' | 'register';

export function PhoneOtpForm({
  onStepChange,
}: {
  onStepChange?: (step: PhoneOtpStep) => void;
} = {}) {
  const loginWithPhone = useAppStore((s) => s.loginWithPhone);
  const loginWithPhonePassword = useAppStore((s) => s.loginWithPhonePassword);
  const registerWithPhonePassword = useAppStore((s) => s.registerWithPhonePassword);

  const [step, setStep] = useState<PhoneOtpStep>('phone');
  const [phone, setPhone] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [otpMode, setOtpMode] = useState<OtpMode>('register');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpStatus, setOtpStatus] = useState<AnimatedOtpStatus>('idle');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyTriggeredRef = useRef(false);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (step !== 'otp') return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [step]);

  const validatePhone = useCallback((value: string): string | null => {
    if (!toAsciiDigits(value)) return 'شماره موبایل الزامی است';
    if (!normalizeIranMobile(value)) {
      return `شماره موبایل معتبر نیست (مثال: ${toPersianDigits('09123456789')})`;
    }
    return null;
  }, []);

  const sendOtp = useCallback(
    async (phoneNumber: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneNumber }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setPhoneError(data.error || 'خطا در ارسال کد تایید');
          return false;
        }

        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setOtpStatus('idle');
        verifyTriggeredRef.current = false;
        setCountdown(COUNTDOWN_SECONDS);
        setStep('otp');

        if (data.demoCode) {
          toast.info('کد تایید (محیط تست)', {
            description: `کد شما: ${data.demoCode}`,
            duration: 8000,
          });
        } else {
          toast.success('کد تایید ارسال شد', {
            description: `کد تایید به شماره ${toPersianDigits(`${phoneNumber.slice(0, 4)}****${phoneNumber.slice(-4)}`)} ارسال شد`,
          });
        }
        return true;
      } catch {
        setPhoneError(authFetchErrorMessage());
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleContinuePhone = useCallback(async () => {
    const cleaned = normalizeIranMobile(phone);
    if (!cleaned) {
      setPhoneError(validatePhone(phone) ?? 'شماره موبایل معتبر نیست');
      return;
    }
    const error = validatePhone(cleaned);
    if (error) {
      setPhoneError(error);
      return;
    }

    setPhoneError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPhoneError(data.error || 'خطا در بررسی شماره موبایل');
        return;
      }

      setPhone(cleaned);
      setOtpMode('login');

      if (!data.exists) {
        setOtpMode('register');
        await sendOtp(cleaned);
        return;
      }

      setHasPassword(Boolean(data.hasPassword));
      setPassword('');
      setPasswordError('');
      setStep('password');
    } catch {
      setPhoneError(authFetchErrorMessage());
    } finally {
      setIsLoading(false);
    }
  }, [phone, validatePhone, sendOtp]);

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error('خطا در ارسال مجدد کد', {
          description: data.error || 'لطفاً کمی صبر کنید و دوباره تلاش کنید',
        });
        return;
      }

      setCountdown(COUNTDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpStatus('idle');
      verifyTriggeredRef.current = false;

      if (data.demoCode) {
        toast.info('کد تایید جدید (محیط تست)', {
          description: `کد شما: ${data.demoCode}`,
          duration: 8000,
        });
      } else {
        toast.success('کد جدید ارسال شد');
      }
    } catch {
      toast.error('خطای شبکه', {
        description: 'لطفاً اتصال اینترنت خود را بررسی کنید',
      });
    } finally {
      setIsLoading(false);
    }
  }, [phone, countdown, isLoading]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH || otpStatus !== 'idle') return;

    setOtpStatus('verifying');

    try {
      const result = await loginWithPhone(phone, code, otpMode);

      if (result.needsPassword) {
        setOtpStatus('success');
        await new Promise((resolve) => setTimeout(resolve, OTP_SUCCESS_ANIMATION_MS));
        setOtpStatus('idle');
        verifyTriggeredRef.current = false;
        setStep('set-password');
        return;
      }

      if (result.success) {
        setOtpStatus('success');

        await new Promise((resolve) => setTimeout(resolve, OTP_SUCCESS_ANIMATION_MS));

        if (result.isNewUser) {
          trackAnalyticsEvent('signup_completed', { phone });
          setStep('welcome');
          toast.success('ثبت‌نام و ورود موفق!', {
            description: 'به نیاز فایندر خوش آمدید',
          });
        } else {
          toast.success('ورود موفقیت‌آمیز!', { description: 'خوش آمدید' });
          useAppStore.getState().setAuthModalOpen(false);
        }
        setOtpStatus('idle');
        verifyTriggeredRef.current = false;
        return;
      }

      toast.error('خطا در تأیید کد', {
        description: result.error || 'کد تایید نامعتبر یا منقضی شده است',
      });
      setOtpStatus('idle');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      verifyTriggeredRef.current = false;
    } catch {
      toast.error('خطای نامشخص', { description: 'لطفاً دوباره تلاش کنید' });
      setOtpStatus('idle');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      verifyTriggeredRef.current = false;
    }
  }, [otpDigits, phone, loginWithPhone, otpMode, otpStatus]);

  useEffect(() => {
    if (step !== 'otp' || otpStatus !== 'idle') return;
    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH) {
      verifyTriggeredRef.current = false;
      return;
    }
    if (verifyTriggeredRef.current) return;
    verifyTriggeredRef.current = true;
    void handleVerifyOtp();
  }, [step, otpDigits, otpStatus, handleVerifyOtp]);

  const handlePasswordLogin = useCallback(async () => {
    if (!password) {
      setPasswordError('رمز عبور الزامی است');
      return;
    }

    setPasswordError('');
    setIsLoading(true);

    try {
      const result = await loginWithPhonePassword(phone, password);
      if (result.success) {
        toast.success('ورود موفقیت‌آمیز!', { description: 'خوش آمدید' });
        return;
      }
      setPasswordError(result.error || 'رمز عبور اشتباه است');
    } catch {
      setPasswordError('خطای شبکه. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  }, [phone, password, loginWithPhonePassword]);

  const handleSmsLogin = useCallback(async () => {
    setPasswordError('');
    setOtpMode('login');
    await sendOtp(phone);
  }, [phone, sendOtp]);

  const handleSetPassword = useCallback(async () => {
    if (password.length < 6) {
      setPasswordError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('رمز عبور و تکرار آن یکسان نیست');
      return;
    }

    setPasswordError('');
    setIsLoading(true);

    try {
      const code = otpDigits.join('');
      const result = await registerWithPhonePassword(phone, password, code);
      if (result.success) {
        trackAnalyticsEvent('signup_completed', { phone });
        setStep('welcome');
        toast.success('ثبت‌نام و ورود موفق!', {
          description: 'به نیاز فایندر خوش آمدید',
        });
        return;
      }
      setPasswordError(result.error || 'خطا در ثبت‌نام');
    } catch {
      setPasswordError('خطای شبکه. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  }, [
    phone,
    password,
    confirmPassword,
    otpDigits,
    registerWithPhonePassword,
  ]);

  const handleBackToPhone = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setStep('phone');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpStatus('idle');
    verifyTriggeredRef.current = false;
    setCountdown(COUNTDOWN_SECONDS);
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
  }, []);

  const handleBackFromPassword = useCallback(() => {
    setStep('phone');
    setPassword('');
    setPasswordError('');
  }, []);

  return (
    <div className="space-y-5" dir="rtl">
      {step === 'phone' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">شماره موبایل</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <PersianDigitInput
                variant="phone"
                value={phone}
                onChange={(val) => {
                  setPhone(val);
                  if (phoneError) setPhoneError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleContinuePhone();
                }}
                className={cn(
                  'pr-10 pl-3 h-12 text-base',
                  'focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                  phoneError && 'border-destructive focus-visible:ring-destructive/20'
                )}
                autoFocus
                disabled={isLoading}
              />
            </div>
            {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
            <p className="text-xs text-muted-foreground">
              شماره موبایل ۱۱ رقمی ایرانی (با ۰۹ شروع شود)
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void handleContinuePhone()}
            className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال بررسی...
              </>
            ) : (
              <>
                <ArrowLeft className="size-4" />
                ادامه
              </>
            )}
          </Button>

          {showTestOtpHint && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center dark:bg-amber-950/30 dark:border-amber-900">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                محیط تست — کد تایید:{' '}
                <span className="font-bold tabular-nums">{toPersianDigits(AUTH_OTP_DEMO_CODE ?? '')}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {step === 'password' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <p className="text-sm text-muted-foreground text-center">
            ورود با شماره {toPersianDigits(formatIranMobileDisplay(phone))}
          </p>

          {hasPassword ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">رمز عبور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handlePasswordLogin();
                    }}
                    placeholder="رمز عبور خود را وارد کنید"
                    className={cn(
                      'pr-10 h-12 text-base',
                      'focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                      passwordError && 'border-destructive focus-visible:ring-destructive/20'
                    )}
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              </div>

              <Button
                type="button"
                onClick={() => void handlePasswordLogin()}
                className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  'ورود'
                )}
              </Button>
            </>
          ) : (
            <div className="rounded-lg bg-muted/50 border p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                برای این حساب رمز عبور تنظیم نشده است.
              </p>
              <p className="text-sm font-medium">لطفاً با پیامک وارد شوید.</p>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => void handleSmsLogin()}
              disabled={isLoading}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50"
            >
              {isLoading ? 'در حال ارسال کد...' : 'ورود با پیامک'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleBackFromPassword}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            تغییر شماره موبایل
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <AnimatedOtpInput
            phoneMasked={formatIranMobileDisplay(phone)}
            digits={otpDigits}
            onDigitsChange={setOtpDigits}
            status={otpStatus}
            disabled={otpStatus === 'verifying' || otpStatus === 'success'}
            countdown={countdown}
            onResend={() => void handleResendOtp()}
            onChangePhone={handleBackToPhone}
            isResending={isLoading}
            devHint={
              showTestOtpHint && AUTH_OTP_DEMO_CODE
                ? `کد تست: ${toPersianDigits(AUTH_OTP_DEMO_CODE)}`
                : undefined
            }
          />
        </div>
      )}

      {step === 'set-password' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <p className="text-sm text-muted-foreground text-center">
            رمز عبور برای حساب {toPersianDigits(formatIranMobileDisplay(phone))} انتخاب کنید
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">رمز عبور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="حداقل ۶ کاراکتر"
                className={cn(
                  'pr-10 h-12 text-base',
                  'focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                  passwordError && 'border-destructive focus-visible:ring-destructive/20'
                )}
                autoFocus
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">تکرار رمز عبور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSetPassword();
                }}
                placeholder="رمز عبور را دوباره وارد کنید"
                className={cn(
                  'pr-10 h-12 text-base',
                  'focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                  passwordError && 'border-destructive focus-visible:ring-destructive/20'
                )}
                disabled={isLoading}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>

          <Button
            type="button"
            onClick={() => void handleSetPassword()}
            className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ثبت‌نام...
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                ثبت‌نام
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'welcome' && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 text-center py-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-950">
            <PartyPopper className="size-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">به نیاز فایندر خوش آمدید!</h3>
            <p className="text-sm text-muted-foreground">
              حساب کاربری شما با موفقیت ایجاد شد. اکنون می‌توانید نیازهای خود را ثبت کنید
              و از خدمات پلتفرم استفاده کنید.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              useAppStore.getState().setAuthModalOpen(false);
            }}
            className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <ArrowRight className="size-4" />
            شروع کنید
          </Button>
        </div>
      )}
    </div>
  );
}
