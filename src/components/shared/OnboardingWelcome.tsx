'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useAppStore } from '@/lib/store';

const ONBOARDING_STORAGE_KEY = 'needfinder-onboarding-seen';

// ──────────────────────────────────────────────
// Step 1 — Welcome
// ──────────────────────────────────────────────
function StepWelcome() {
  const cards = [
    { icon: FileText, label: 'ثبت نیاز', color: 'from-emerald-500 to-teal-500' },
    { icon: ArrowRightLeft, label: 'دریافت پیشنهاد', color: 'from-amber-500 to-orange-500' },
    { icon: CheckCircle, label: 'انتخاب متخصص', color: 'from-violet-500 to-purple-500' },
  ];

  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 text-center"
    >
      {/* Large Sparkle Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
      >
        <Sparkles className="size-10 text-white" />
      </motion.div>

      {/* Title */}
      <div className="space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-extrabold text-gradient sm:text-3xl"
        >
          به نیاز فایندر خوش آمدید!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-base font-semibold text-emerald-600 dark:text-emerald-400 sm:text-lg"
        >
          پلتفرم هوشمند اتصال نیاز به متخصص
        </motion.p>
      </div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mx-auto max-w-sm text-sm leading-7 text-muted-foreground sm:text-base"
      >
        با نیاز فایندر، به‌راحتی نیاز خود را ثبت کنید و از بین هزاران متخصص، بهترین را
        انتخاب نمایید.
      </motion.p>

      {/* Floating glass cards illustration */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.4 + i * 0.12 }}
            whileHover={{ y: -4, scale: 1.05 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-4 py-5 backdrop-blur-md sm:px-6"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} shadow-sm`}
            >
              <card.icon className="size-5 text-white" />
            </div>
            <span className="text-xs font-medium text-foreground">{card.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
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
      desc: 'متخصص‌ها به شما پیشنهاد می‌دهند',
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
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 text-center"
    >
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-2xl font-extrabold text-gradient sm:text-3xl"
      >
        چطور کار می‌کنه؟
      </motion.h2>

      {/* Steps */}
      <div className="space-y-4 pt-1">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.2 + i * 0.12 }}
            className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/50 p-4 text-right backdrop-blur-sm"
          >
            {/* Gradient numbered circle */}
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${step.color} text-lg font-bold text-white shadow-md`}
            >
              {step.num}
            </div>

            {/* Icon */}
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
              <step.icon className="size-4.5 text-muted-foreground" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-bold text-foreground">{step.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// Step 3 — Get Started
// ──────────────────────────────────────────────
function StepGetStarted({
  dontShowAgain,
  setDontShowAgain,
}: {
  dontShowAgain: boolean;
  setDontShowAgain: (v: boolean) => void;
}) {
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const handleRegister = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 text-center"
    >
      {/* Rocket icon */}
      <motion.div
        initial={{ scale: 0, rotate: 30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
      >
        <Rocket className="size-10 text-white" />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-extrabold text-gradient sm:text-3xl"
      >
        شروع کنید!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-auto max-w-xs text-sm leading-7 text-muted-foreground sm:text-base"
      >
        همین الان ثبت‌نام کنید و از خدمات هزاران متخصص بهره‌مند شوید.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-center"
      >
        <Button
          onClick={handleRegister}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          size="lg"
        >
          <Sparkles className="ml-2 size-4" />
          ثبت‌نام رایگان
        </Button>
        <Button variant="ghost" className="w-full sm:w-auto" size="lg">
          بعداً
        </Button>
      </motion.div>

      {/* Checkbox */}
      <motion.label
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex cursor-pointer items-center justify-center gap-2 pt-1"
      >
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="size-4 rounded border-border accent-emerald-600"
        />
        <span className="text-xs text-muted-foreground sm:text-sm">
          نمایش دوباره نشود
        </span>
      </motion.label>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// Dots indicator
// ──────────────────────────────────────────────
function DotsIndicator({ current, total, onDotClick }: { current: number; total: number; onDotClick: (i: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          aria-label={`مرحله ${i + 1}`}
          className="relative flex size-2.5 items-center justify-center"
        >
          {i === current && (
            <motion.span
              layoutId="onboarding-dot"
              className="absolute inset-0 rounded-full bg-emerald-500"
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            />
          )}
          <span
            className={`block size-2 rounded-full transition-colors ${
              i === current ? 'bg-transparent' : 'bg-muted-foreground/30'
            }`}
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

  const totalSteps = 3;

  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (seen === 'true') {
        return; // Already seen — do nothing, component stays null
      }
      // Show after a short delay so the page renders first
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

  const goNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {/* Full-screen backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        dir="rtl"
      >
        {/* Dark overlay + blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          aria-label="بستن"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="gradient-mesh-card relative z-10 w-full max-w-[520px] overflow-hidden rounded-2xl border border-border/40 bg-background/80 shadow-[0_16px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        >
          {/* Decorative gradient blurs */}
          <div className="pointer-events-none absolute -top-24 -left-24 size-48 rounded-full bg-emerald-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-48 rounded-full bg-teal-500/6 blur-3xl" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute left-3 top-3 z-20 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
            aria-label="بستن"
          >
            <X className="size-4" />
          </button>

          {/* Content area */}
          <div className="relative px-6 pb-4 pt-8 sm:px-8 sm:pt-10">
            <AnimatePresence mode="wait">
              {step === 0 && <StepWelcome />}
              {step === 1 && <StepHowItWorks />}
              {step === 2 && (
                <StepGetStarted
                  dontShowAgain={dontShowAgain}
                  setDontShowAgain={setDontShowAgain}
                />
              )}
            </AnimatePresence>
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
              <div className="w-16" /> // Spacer for alignment
            )}

            {/* Dots */}
            <DotsIndicator current={step} total={totalSteps} onDotClick={setStep} />

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
              <div className="w-16" /> // Spacer for alignment
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
