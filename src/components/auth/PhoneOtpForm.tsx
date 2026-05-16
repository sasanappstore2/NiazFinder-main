'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Phone, Loader2, ShieldCheck, ArrowRight, PartyPopper } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ============ Constants ============

const IRANIAN_PHONE_REGEX = /^09[0-9]{9}$/;
const OTP_LENGTH = 4;
const COUNTDOWN_SECONDS = 120;
const DEMO_OTP = '1234';
const TOKEN_KEY = 'needfinder_auth_token';

// ============ Mock Notifications ============
const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-mock-1',
    type: 'new_proposal' as const,
    title: 'پیشنهاد جدید',
    message: 'کسب‌وکاری برای نیاز «طراحی سایت فروشگاهی» پیشنهادی ارسال کرده است.',
    isRead: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    data: { requestId: 'r1' },
  },
  {
    id: 'notif-mock-2',
    type: 'message' as const,
    title: 'پیام جدید',
    message: 'شما یک پیام جدید از «علی محمدی» دریافت کرده‌اید.',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    data: { conversationId: 'conv-1' },
  },
  {
    id: 'notif-mock-3',
    type: 'system' as const,
    title: 'خوش آمدید!',
    message: 'به نیاز فایندر خوش آمدید. پروفایل خود را تکمیل کنید تا بهترین کسب‌وکارها را پیدا کنید.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ============ Step Types ============

type Step = 'phone' | 'otp' | 'welcome';

// ============ Component ============

export function PhoneOtpForm() {
  const loginWithPhone = useAppStore((s) => s.loginWithPhone);
  const login = useAppStore((s) => s.login);
  const setNotifications = useAppStore((s) => s.setNotifications);

  // State
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [phoneError, setPhoneError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isNewUser, setIsNewUser] = useState(false);

  // Refs for OTP inputs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [step]);

  // Focus first OTP input when stepping to OTP
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // ============ Phone Validation ============

  const validatePhone = useCallback((value: string): string | null => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return 'شماره موبایل الزامی است';
    if (!IRANIAN_PHONE_REGEX.test(cleaned)) return 'شماره موبایل معتبر نیست (مثال: 09123456789)';
    return null;
  }, []);

  // ============ Send OTP ============

  const handleSendOtp = useCallback(async () => {
    const cleaned = phone.replace(/\D/g, '');
    const error = validatePhone(cleaned);
    if (error) {
      setPhoneError(error);
      return;
    }

    setPhoneError('');
    setIsSendingOtp(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPhoneError(data.error || 'خطا در ارسال کد تایید');
        return;
      }

      // Move to OTP step
      setPhone(cleaned);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(COUNTDOWN_SECONDS);
      setStep('otp');

      // In dev mode, show hint
      if (data.demoCode) {
        toast.info('کد تایید (محیط تست)', {
          description: `کد شما: ${data.demoCode}`,
          duration: 8000,
        });
      } else {
        toast.success('کد تایید ارسال شد', {
          description: `کد تایید به شماره ${cleaned.slice(0, 4)}****${cleaned.slice(-4)} ارسال شد`,
        });
      }
    } catch {
      setPhoneError('خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.');
    } finally {
      setIsSendingOtp(false);
    }
  }, [phone, validatePhone]);

  // ============ OTP Input Handlers ============

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, '');
      if (digit.length > 1) return;

      const newDigits = [...otpDigits];
      newDigits[index] = digit;
      setOtpDigits(newDigits);

      // Auto-focus next input
      if (digit && index < OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otpDigits],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
        // Focus previous input on backspace if current is empty
        otpRefs.current[index - 1]?.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
      if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otpDigits],
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
      if (pasted.length >= OTP_LENGTH) {
        const digits = pasted.slice(0, OTP_LENGTH).split('');
        setOtpDigits(digits);
        // Focus last input
        otpRefs.current[OTP_LENGTH - 1]?.focus();
      }
    },
    [],
  );

  // ============ Resend OTP ============

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0 || isSendingOtp) return;

    setIsSendingOtp(true);
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
      otpRefs.current[0]?.focus();

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
      setIsSendingOtp(false);
    }
  }, [phone, countdown, isSendingOtp]);

  // ============ Verify OTP ============

  const handleVerifyOtp = useCallback(async () => {
    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('کد تایید ناقص است', {
        description: 'لطفاً تمام ۴ رقم کد تایید را وارد کنید',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const result = await loginWithPhone(phone, code);

      if (result.success) {
        setIsNewUser(result.isNewUser);
        setNotifications(MOCK_NOTIFICATIONS);

        if (result.isNewUser) {
          // Show welcome step for new users
          setStep('welcome');
          toast.success('ثبت‌نام و ورود موفق!', {
            description: 'به نیاز فایندر خوش آمدید',
          });
        } else {
          toast.success('ورود موفقیت‌آمیز!', {
            description: 'خوش آمدید',
          });
        }
      } else {
        toast.error('خطا در تأیید کد', {
          description: result.error || 'کد تایید نامعتبر یا منقضی شده است',
        });
        // Clear OTP digits on error
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        otpRefs.current[0]?.focus();
      }
    } catch {
      toast.error('خطای نامشخص', {
        description: 'لطفاً دوباره تلاش کنید',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [otpDigits, phone, loginWithPhone, setNotifications, login]);

  // ============ Back to Phone Step ============

  const handleBackToPhone = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setStep('phone');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  // ============ Format Countdown ============

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ============ Format Phone for Display ============

  const formatPhoneDisplay = (p: string) => {
    if (p.length !== 11) return p;
    return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 9)} ${p.slice(9)}`;
  };

  // ============ Render ============

  return (
    <div className="space-y-5" dir="rtl">
      {/* ========== PHONE STEP ========== */}
      {step === 'phone' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Phone Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              شماره موبایل
            </label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="09123456789"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setPhone(val);
                  if (phoneError) setPhoneError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendOtp();
                }}
                className={cn(
                  'pr-10 pl-3 h-12 text-base',
                  'focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                  phoneError && 'border-destructive focus-visible:ring-destructive/20',
                )}
                dir="ltr"
                maxLength={11}
                autoFocus
                disabled={isSendingOtp}
              />
            </div>
            {phoneError && (
              <p className="text-sm text-destructive">{phoneError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              شماره موبایل ۱۱ رقمی ایرانی (با ۰۹ شروع شود)
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="button"
            onClick={handleSendOtp}
            className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            disabled={isSendingOtp}
          >
            {isSendingOtp ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ارسال کد...
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                دریافت کد تایید
              </>
            )}
          </Button>

          {/* Dev Mode Hint */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-xs text-amber-700">
                محیط تست — کد تایید: <span className="font-mono font-bold">{DEMO_OTP}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========== OTP STEP ========== */}
      {step === 'otp' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Info */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              کد تایید ارسال شده به شماره زیر را وارد کنید
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-semibold font-mono tracking-wider" dir="ltr">
                {formatPhoneDisplay(phone)}
              </span>
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
              >
                (تغییر شماره)
              </button>
            </div>
          </div>

          {/* OTP Digit Boxes */}
          <div className="flex justify-center gap-3" dir="ltr">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <Input
                key={index}
                ref={(el) => { otpRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otpDigits[index]}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                disabled={isVerifying}
                className={cn(
                  'w-[52px] h-[52px] text-center text-xl font-bold',
                  'border-2 transition-all duration-200',
                  'focus-visible:ring-0 focus-visible:ring-offset-0',
                  otpDigits[index]
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700'
                    : 'border-input hover:border-emerald-300',
                  'focus:border-emerald-500 focus:outline-none',
                )}
              />
            ))}
          </div>

          {/* Dev Mode OTP Hint */}
          {process.env.NODE_ENV !== 'production' && (
            <p className="text-center text-xs text-muted-foreground">
              کد تست: <span className="font-mono font-bold text-emerald-600">{DEMO_OTP}</span>
            </p>
          )}

          {/* Verify Button */}
          <Button
            type="button"
            onClick={handleVerifyOtp}
            className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            disabled={isVerifying || otpDigits.join('').length !== OTP_LENGTH}
          >
            {isVerifying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال بررسی...
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                تأیید و ورود
              </>
            )}
          </Button>

          {/* Timer / Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                ارسال مجدد کد تا{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatCountdown(countdown)}
                </span>{' '}
                دیگر
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSendingOtp}
                className={cn(
                  'text-sm font-medium text-emerald-600 hover:text-emerald-700',
                  'hover:underline transition-colors',
                  isSendingOtp && 'opacity-50 pointer-events-none',
                )}
              >
                {isSendingOtp ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    در حال ارسال...
                  </span>
                ) : (
                  'ارسال مجدد کد تایید'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========== WELCOME STEP (New User) ========== */}
      {step === 'welcome' && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 text-center py-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
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
