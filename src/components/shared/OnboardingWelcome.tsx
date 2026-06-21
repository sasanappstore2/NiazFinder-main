'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Users,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const ONBOARDING_STORAGE_KEY = 'needfinder-onboarding-seen';

// ──────────────────────────────────────────────
// Step 1 — Welcome
// ──────────────────────────────────────────────
function StepWelcome() {
  const cards = [
    { icon: FileText, label: 'ثبت نیاز', color: 'from-emerald-500 to-teal-500' },
    { icon: ArrowRightLeft, label: 'دریافت پیشنهاد', color: 'from-amber-500 to-orange-500' },
    { icon: CheckCircle, label: 'انتخاب کسب‌وکار', color: 'from-violet-500 to-purple-500' },
  ];

  return (
    <div className="space-y-6 text-center">
      {/* Large Sparkle Icon */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
        <Sparkles className="size-10 text-white" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2 id="onboarding-step-title-0" className="text-2xl font-extrabold text-gradient sm:text-3xl">
          به نیاز فایندر خوش آمدید!
        </h2>
        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 sm:text-lg">
          پلتفرم هوشمند اتصال نیاز به کسب‌وکار
        </p>
      </div>

      {/* Description */}
      <p className="mx-auto max-w-sm text-sm leading-7 text-muted-foreground sm:text-base">
        با نیاز فایندر، به‌راحتی نیاز خود را ثبت کنید و از بین هزاران کسب‌وکار، بهترین را
        انتخاب نمایید.
      </p>

      {/* Glass cards illustration */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-4 py-5 backdrop-blur-md transition-transform duration-150 ease-in-out hover:-translate-y-1 sm:px-6"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br ${card.color} shadow-sm`}
            >
              <card.icon className="size-5 text-white" />
            </div>
            <span className="text-xs font-medium text-foreground">{card.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Step 2 — How it works
// ──────────────────────────────────────────────
function StepHowItWorks() {
  const steps = [
    {
      num: 1,
      icon: FileText,
      title: 'نیاز خود را ثبت کنید',
      desc: 'نیاز خود را با جزئیات توضیح دهید',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      num: 2,
      icon: Users,
      title: 'پیشنهادها را مقایسه کنید',
      desc: 'کسب‌وکارها به شما پیشنهاد می‌دهند',
      color: 'from-amber-500 to-orange-500',
    },
    {
      num: 3,
      icon: CheckCircle,
      title: 'بهترین را انتخاب کنید',
      desc: 'با بررسی پروفایل‌ها، انتخاب کنید',
      color: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <div className="space-y-6 text-center">
      {/* Title */}
      <h2 id="onboarding-step-title-1" className="text-2xl font-extrabold text-gradient sm:text-3xl">
        چطور کار می‌کنه؟
      </h2>

      {/* Steps */}
      <div className="space-y-4 pt-1">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/50 p-4 text-right backdrop-blur-xs"
          >
            {/* Gradient numbered circle */}
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${step.color} text-lg font-bold text-white shadow-md`}
            >
              {step.num}
            </div>

            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
              <step.icon className="size-[18px] text-muted-foreground" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-bold text-foreground">{step.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Step 3 — Get Started
// ──────────────────────────────────────────────
function StepGetStarted({
  dontShowAgain,
  setDontShowAgain,
  onRegister,
  onLater,
}: {
  dontShowAgain: boolean;
  setDontShowAgain: (v: boolean) => void;
  onRegister: () => void;
  onLater: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      {/* Rocket icon */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
        <Rocket className="size-10 text-white" />
      </div>

      {/* Title */}
      <h2 id="onboarding-step-title-2" className="text-2xl font-extrabold text-gradient sm:text-3xl">
        شروع کنید!
      </h2>

      <p className="mx-auto max-w-xs text-sm leading-7 text-muted-foreground sm:text-base">
        همین الان ثبت‌نام کنید و از خدمات هزاران کسب‌وکار بهره‌مند شوید.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-center">
        <Button
          onClick={onRegister}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          size="lg"
        >
          <Sparkles className="ml-2 size-4" />
          ثبت‌نام رایگان
        </Button>
        <Button variant="ghost" className="w-full sm:w-auto" size="lg" onClick={onLater}>
          بعداً
        </Button>
      </div>

      {/* Checkbox */}
      <label className="flex cursor-pointer items-center justify-center gap-2 pt-1">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="size-4 rounded border-border accent-emerald-600"
        />
        <span className="text-xs text-muted-foreground sm:text-sm">
          نمایش دوباره نشود
        </span>
      </label>
    </div>
  );
}

// ──────────────────────────────────────────────
// Dots indicator
// ──────────────────────────────────────────────
function DotsIndicator({ current, total, onDotClick }: { current: number; total: number; onDotClick: (i: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2" role="tablist" aria-label="مراحل راهنمای شروع">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          role="tab"
          aria-selected={i === current}
          aria-label={`مرحله ${i + 1}`}
          className={cn(
            'relative flex h-[10px] w-[10px] items-center justify-center rounded-full transition-all duration-150 ease-in-out',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1',
            i === current
              ? 'bg-emerald-500 scale-125'
              : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
          )}
        >
          <span
            className={cn(
              'block h-2 w-2 rounded-full transition-colors duration-150',
              i === current ? 'bg-transparent' : 'bg-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export function OnboardingWelcome() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevStepRef = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const totalSteps = 3;

  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (seen === 'true') {
        return; // Already seen — do nothing
      }
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } catch {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } catch {
        // Silently fail
      }
    }
    setIsVisible(false);
  }, [dontShowAgain]);

  const handleRegister = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Silently fail
    }
    setIsVisible(false);
    setAuthModalTab('register');
    setAuthModalOpen(true);
  }, [setAuthModalOpen, setAuthModalTab]);

  const goNext = useCallback(() => {
    if (step < totalSteps - 1 && !isTransitioning) {
      prevStepRef.current = step;
      setIsTransitioning(true);
      // Small delay for fade-out before changing step
      setTimeout(() => {
        setStep((s) => s + 1);
        setIsTransitioning(false);
      }, 100);
    }
  }, [step, isTransitioning]);

  const goPrev = useCallback(() => {
    if (step > 0 && !isTransitioning) {
      prevStepRef.current = step;
      setIsTransitioning(true);
      setTimeout(() => {
        setStep((s) => s - 1);
        setIsTransitioning(false);
      }, 100);
    }
  }, [step, isTransitioning]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        goNext();
      } else if (e.key === 'ArrowRight') {
        goPrev();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose, goNext, goPrev]);

  // Focus trap when modal is open
  useEffect(() => {
    if (!isVisible || !modalRef.current) return;
    const root = modalRef.current;
    const getFocusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    const focusables = getFocusables();
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [isVisible, step]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-(--z-onboarding) flex items-center justify-center p-4 transition-opacity duration-150 ease-in-out"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`onboarding-step-title-${step}`}
    >
      {/* Dark overlay + blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        ref={modalRef}
        className="gradient-mesh-card relative z-10 w-full max-w-[520px] max-h-[min(92dvh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-border/40 bg-background/80 shadow-[0_16px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      >
        {/* Decorative gradient blurs */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-48 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-48 rounded-full bg-teal-500/6 blur-3xl" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute left-3 top-3 z-20 flex size-11 items-center justify-center rounded-full text-muted-foreground/60 transition-colors duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary touch-target-min"
          aria-label="بستن"
        >
          <X className="size-4" />
        </button>

        {/* Content area with CSS fade transition */}
        <div
          className="relative px-6 pb-4 pt-8 sm:px-8 sm:pt-10"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 100ms ease-in-out',
          }}
        >
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepHowItWorks />}
          {step === 2 && (
            <StepGetStarted
              dontShowAgain={dontShowAgain}
              setDontShowAgain={setDontShowAgain}
              onRegister={handleRegister}
              onLater={handleClose}
            />
          )}
        </div>

        {/* Bottom navigation: prev / dots / next */}
        <div className="flex items-center justify-between border-t border-border/30 px-6 py-4 sm:px-8">
          {/* Prev button */}
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              className="gap-1 text-muted-foreground"
            >
              <ChevronRight className="size-4" />
              قبلی
            </Button>
          ) : (
            <div className="w-16" />
          )}

          {/* Dots */}
          <DotsIndicator current={step} total={totalSteps} onDotClick={(i) => {
            if (i !== step && !isTransitioning) {
              prevStepRef.current = step;
              setIsTransitioning(true);
              setTimeout(() => {
                setStep(i);
                setIsTransitioning(false);
              }, 100);
            }
          }} />

          {/* Next button */}
          {step < totalSteps - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={goNext}
              className="gap-1 text-muted-foreground"
            >
              بعدی
              <ChevronLeft className="size-4" />
            </Button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>
    </div>
  );
}
