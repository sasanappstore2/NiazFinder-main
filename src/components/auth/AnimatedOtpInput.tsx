'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toAsciiDigits, toPersianDigits } from '@/lib/format/digits';
import { cn } from '@/lib/utils';
import '@/styles/auth/animated-otp.css';

export type AnimatedOtpStatus = 'idle' | 'verifying' | 'success' | 'error';

/** Wait before closing modal / welcome — keep in sync with CSS success timeline */
export const OTP_SUCCESS_ANIMATION_MS = 3400;

const OTP_LENGTH = 4;

export interface AnimatedOtpInputProps {
  phoneMasked: string;
  digits: string[];
  onDigitsChange: (digits: string[]) => void;
  status: AnimatedOtpStatus;
  disabled?: boolean;
  countdown: number;
  onResend: () => void;
  onChangePhone: () => void;
  isResending?: boolean;
  devHint?: string;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return toPersianDigits(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
}

export function AnimatedOtpInput({
  phoneMasked,
  digits,
  onDigitsChange,
  status,
  disabled = false,
  countdown,
  onResend,
  onChangePhone,
  isResending = false,
  devHint,
}: AnimatedOtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showVerifiedText, setShowVerifiedText] = useState(false);
  const inputsLocked = status !== 'idle' || disabled;

  useEffect(() => {
    if (status === 'success') {
      inputRefs.current.forEach((el) => el?.blur());
      const textTimer = setTimeout(() => setShowVerifiedText(true), 2400);
      return () => clearTimeout(textTimer);
    }
    setShowVerifiedText(false);
  }, [status]);

  useEffect(() => {
    if (status === 'idle' && !disabled) {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [status, disabled]);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      if (inputsLocked) return;
      const ascii = toAsciiDigits(raw).slice(-1);
      if (ascii && !/^\d$/.test(ascii)) return;

      const next = [...digits];
      next[index] = ascii;
      onDigitsChange(next);

      if (ascii && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, inputsLocked, onDigitsChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (inputsLocked) return;
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = '';
        onDigitsChange(next);
      }
    },
    [digits, inputsLocked, onDigitsChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (inputsLocked) return;
      e.preventDefault();
      const pasted = toAsciiDigits(e.clipboardData.getData('text')).slice(0, OTP_LENGTH);
      if (!pasted || !/^\d+$/.test(pasted)) return;

      const next = [...digits];
      pasted.split('').forEach((char, index) => {
        next[index] = char;
      });
      onDigitsChange(next);

      const focusIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
      inputRefs.current[focusIndex]?.focus();
    },
    [digits, inputsLocked, onDigitsChange]
  );

  return (
    <div
      className={cn(
        'nf-animated-otp',
        status === 'verifying' && 'is-verifying'
      )}
      dir="rtl"
    >
      <div
        className={cn(
          'otp-container',
          status === 'success' && 'is-complete'
        )}
      >
        <div className="otp-header">
          <AnimatePresence mode="wait">
            <motion.div
              key={showVerifiedText ? 'verified' : 'unverified'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <h2>
                {showVerifiedText
                  ? 'با موفقیت تأیید شد'
                  : status === 'verifying'
                    ? 'در حال بررسی کد…'
                    : 'کد تأیید را وارد کنید'}
              </h2>
              <p>
                {showVerifiedText
                  ? 'شماره موبایل شما تأیید شد.'
                  : status === 'verifying'
                    ? 'لطفاً چند لحظه صبر کنید.'
                    : 'کد ۴ رقمی ارسال‌شده را وارد کنید.\nبا تکمیل ارقام، خودکار بررسی می‌شود.'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="otp-phone-row">
          <span dir="ltr">{phoneMasked}</span>
          <button type="button" onClick={onChangePhone} disabled={inputsLocked}>
            (تغییر شماره)
          </button>
        </div>

        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <div key={index} className="input-wrapper">
              <input
                type="text"
                inputMode="numeric"
                maxLength={1}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={digit ? toPersianDigits(digit) : ''}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                readOnly={inputsLocked}
                disabled={disabled}
                aria-label={`رقم ${toPersianDigits(String(index + 1))} کد تأیید`}
              />

              {index === 0 && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="final-tick"
                  aria-hidden
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        <div className="otp-footer">
          {status === 'verifying' ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              در حال بررسی…
            </span>
          ) : countdown > 0 ? (
            <>
              ارسال مجدد تا{' '}
              <span className="font-semibold tabular-nums text-foreground">
                {formatCountdown(countdown)}
              </span>{' '}
              دیگر
            </>
          ) : (
            <>
              کد را دریافت نکردید؟
              <button type="button" onClick={onResend} disabled={isResending || disabled}>
                {isResending ? 'در حال ارسال…' : 'ارسال مجدد'}
              </button>
            </>
          )}
        </div>

        {devHint && <p className="otp-dev-hint">{devHint}</p>}
      </div>
    </div>
  );
}
