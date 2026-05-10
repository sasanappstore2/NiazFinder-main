'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import {
  UserCheck,
  Check,
  Circle,
  Camera,
  Phone,
  MapPin,
  Sparkles,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  icon: React.ReactNode;
}

const completionItems: CompletionItem[] = [
  {
    id: 'avatar',
    label: 'آواتار پروفایل',
    completed: true,
    icon: <Camera className="size-4" />,
  },
  {
    id: 'name',
    label: 'نام و نام خانوادگی',
    completed: true,
    icon: <UserCheck className="size-4" />,
  },
  {
    id: 'phone',
    label: 'شماره تلفن',
    completed: true,
    icon: <Phone className="size-4" />,
  },
  {
    id: 'city',
    label: 'شهر محل سکونت',
    completed: false,
    icon: <MapPin className="size-4" />,
  },
  {
    id: 'skills',
    label: 'حداقل ۳ مهارت',
    completed: false,
    icon: <Sparkles className="size-4" />,
  },
  {
    id: 'portfolio',
    label: 'حداقل ۱ نمونه کار',
    completed: false,
    icon: <FileText className="size-4" />,
  },
  {
    id: 'bio',
    label: 'بیوگرافی',
    completed: false,
    icon: <UserCheck className="size-4" />,
  },
];

function toPersianDigits(num: number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

function CircularProgress({
  percentage,
}: {
  percentage: number;
}) {
  const radius = 52;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-emerald-100 dark:text-emerald-950/50"
        />
        {/* Animated progress circle */}
        <motion.circle
          strokeWidth={strokeWidth}
          stroke="url(#emeraldGradient)"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: 1.4,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.3,
          }}
        />
        <defs>
          <linearGradient
            id="emeraldGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
      </svg>
      {/* Percentage text in the center */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <span className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
          {toPersianDigits(percentage)}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
          درصد
        </span>
      </motion.div>
    </div>
  );
}

export function ProfileCompletionBar() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  const completedCount = useMemo(
    () => completionItems.filter((item) => item.completed).length,
    []
  );
  const percentage = Math.round((completedCount / completionItems.length) * 100);

  const handleNavigate = useCallback(() => {
    navigateTo('profile');
  }, [navigateTo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card
        className="
          relative overflow-hidden
          border-white/40 dark:border-white/10
          bg-white/70 dark:bg-card/70
          backdrop-blur-xl
          shadow-lg shadow-emerald-500/5
        "
      >
        {/* Subtle gradient accent at top */}
        <div
          className="
            pointer-events-none absolute inset-x-0 top-0 h-1
            bg-gradient-to-l from-emerald-400 via-emerald-500 to-teal-500
          "
        />

        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <UserCheck className="size-5 text-emerald-500" />
            تکمیل پروفایل
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          {/* Progress Circle + Summary */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <CircularProgress percentage={percentage} />

            <div className="flex flex-col gap-1 text-center sm:text-right">
              <p className="text-sm font-medium text-muted-foreground">
                <span className="font-bold text-foreground">
                  {toPersianDigits(completedCount)}
                </span>{' '}
                مورد از{' '}
                <span className="font-bold text-foreground">
                  {toPersianDigits(completionItems.length)}
                </span>{' '}
                مورد تکمیل شده
              </p>
              <p className="text-xs text-muted-foreground/80">
                {percentage < 50
                  ? 'پروفایل شما نیاز به تکمیل دارد'
                  : percentage < 100
                    ? 'تا تکمیل پروفایل چند قدم مانده است'
                    : 'پروفایل شما کامل است!'}
              </p>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <motion.div
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-500"
                initial={{ width: '0%' }}
                animate={{ width: `${percentage}%` }}
                transition={{
                  duration: 1.4,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.3,
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-l from-white/30 via-transparent to-white/10"
                  initial={{ x: '100%' }}
                  animate={{ x: '-200%' }}
                  transition={{
                    duration: 2,
                    ease: 'easeInOut',
                    delay: 1.8,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                />
              </motion.div>
            </div>
          </div>

          {/* Checklist */}
          <ul className="space-y-1">
            {completionItems.map((item, index) => (
              <motion.li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.5 + index * 0.07,
                  ease: 'easeOut',
                }}
              >
                <div className="flex items-center gap-2.5">
                  {item.completed ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    </span>
                  ) : (
                    <span className="flex size-5 items-center justify-center">
                      <Circle className="size-4 text-amber-400/70 dark:text-amber-500/60" />
                    </span>
                  )}
                  <span
                    className={`text-sm ${
                      item.completed
                        ? 'font-medium text-emerald-700 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                {!item.completed && (
                  <button
                    onClick={handleNavigate}
                    className="shrink-0 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                  >
                    تکمیل کنید
                  </button>
                )}
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.1 }}
          >
            <Button
              onClick={handleNavigate}
              className="w-full bg-gradient-to-l from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all"
              size="lg"
            >
              تکمیل پروفایل
              <ArrowLeft className="size-4" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
