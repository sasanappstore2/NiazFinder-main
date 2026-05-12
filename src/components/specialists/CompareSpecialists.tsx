'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Star,
  MessageSquare,
  Eye,
  Trash2,
  ArrowLeft,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { MOCK_SPECIALISTS, formatPrice } from '@/lib/constants';

// ─── Avatar color generator ───────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Rating stars ─────────────────────────────────────
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="mr-1 text-sm font-semibold">
        {rating.toLocaleString('fa-IR')}
      </span>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────
function RateBar({ value, highlight }: { value: number; highlight: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted sm:w-28">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' as const }}
        />
      </div>
      <span
        className={`text-sm font-semibold ${
          highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
        }`}
      >
        {value.toLocaleString('fa-IR')}٪
      </span>
    </div>
  );
}

// ─── Animation variants ───────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// ─── Main Component ───────────────────────────────────
export function CompareSpecialists() {
  const compareSpecialistIds = useAppStore((s) => s.compareSpecialistIds);
  const clearCompareList = useAppStore((s) => s.clearCompareList);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const specialists = useMemo(
    () =>
      compareSpecialistIds
        .map((id) => MOCK_SPECIALISTS.find((s) => s.id === id))
        .filter(Boolean) as typeof MOCK_SPECIALISTS,
    [compareSpecialistIds]
  );

  const count = specialists.length;

  // ─── Best value helpers ─────────────────────
  const best = useMemo(() => {
    if (count < 2) return {};
    return {
      rating: Math.max(...specialists.map((s) => s.rating)),
      projectCount: Math.max(...specialists.map((s) => s.projectCount)),
      completionRate: Math.max(...specialists.map((s) => s.completionRate)),
      responseRate: Math.max(...specialists.map((s) => s.responseRate)),
      hourlyRate: Math.min(...specialists.map((s) => s.hourlyRate || Infinity)),
      minProjectPrice: Math.min(
        ...specialists.map((s) => s.minProjectPrice || Infinity)
      ),
      skillCount: Math.max(...specialists.map((s) => s.skills.length)),
    };
  }, [specialists, count]);

  const isBest = (field: keyof typeof best, value: number) =>
    best[field] === value && count >= 2;

  // ─── Insufficient specialists ───────────────
  if (count < 2) {
    return (
      <div className="min-h-screen bg-muted/20" dir="rtl">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={fadeInUp.hidden}
            animate={fadeInUp.visible}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-gradient-to-l from-foreground to-foreground/80 bg-clip-text">
                مقایسه متخصص‌ها
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {count > 0
                  ? `${count} متخصص انتخاب شده — حداقل ۲ متخصص برای مقایسه لازم است`
                  : 'لیست مقایسه خالی است'}
              </p>
            </div>
            {count > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompareList}
                className="gap-2 self-start sm:self-auto"
              >
                <Trash2 className="size-4" />
                پاک کردن لیست
              </Button>
            )}
          </motion.div>

          {/* Empty state */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-card py-20 text-center shadow-lg shadow-black/[0.03]"
          >
            <div className="mb-4 flex size-20 items-center justify-center rounded-2xl bg-muted/60">
              <Users className="size-10 text-muted-foreground/40" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              حداقل ۲ متخصص برای مقایسه انتخاب کنید
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              از صفحه متخصص‌ها، با کلیک روی دکمه مقایسه می‌توانید متخصص‌ها را به
              لیست اضافه کنید.
            </p>
            <Button
              onClick={() => navigateTo('browse-specialists')}
              className="gap-2"
            >
              <ArrowRight className="size-4" />
              مشاهده متخصص‌ها
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Comparison table ────────────────────────
  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={fadeInUp.hidden}
          animate={fadeInUp.visible}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              مقایسه متخصص‌ها
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مقایسه {count} متخصص انتخاب شده
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompareList}
            className="gap-2 self-start sm:self-auto"
          >
            <Trash2 className="size-4" />
            پاک کردن لیست
          </Button>
        </motion.div>

        {/* Table wrapper — horizontal scroll on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="overflow-x-auto rounded-2xl border border-border/40 bg-card shadow-xl shadow-black/[0.04]"
        >
          <table className="w-full min-w-[640px]">
            {/* ── Column Headers ── */}
            <thead>
              <tr className="border-b border-border/40">
                {/* Sticky label column */}
                <th className="sticky right-0 z-10 w-44 min-w-[11rem] bg-muted/60 px-4 py-5 text-right text-xs font-medium text-muted-foreground backdrop-blur-sm sm:w-52 sm:min-w-[13rem]" />

                {specialists.map((specialist) => {
                  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
                  const colorClass = getAvatarColor(specialist.displayName ?? '');

                  return (
                    <th
                      key={specialist.id}
                      className="px-4 py-5 text-center"
                      style={{ width: `${Math.floor(100 / count)}%` }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <Avatar className="size-16">
                            <AvatarFallback
                              className={`text-base font-bold ${colorClass}`}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {specialist.isVerified && (
                            <span className="absolute -bottom-1 -left-1 flex size-5 items-center justify-center rounded-full bg-white dark:bg-gray-900">
                              <ShieldCheck className="size-3.5 fill-emerald-500 text-white" />
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold">{specialist.displayName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {specialist.city}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            useAppStore
                              .getState()
                              .toggleCompareSpecialist(specialist.id)
                          }
                          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="حذف از مقایسه"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* ── امتیاز (Rating) ── */}
              <tr className="border-b border-border/40 bg-card transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Star className="size-4 text-amber-400" />
                    امتیاز
                  </span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <div
                      className={`inline-flex ${
                        isBest('rating', s.rating)
                          ? 'rounded-lg bg-emerald-50 px-2 py-1 dark:bg-emerald-950/30'
                          : ''
                      }`}
                    >
                      <RatingStars rating={s.rating} />
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── تعداد پروژه (Project count) ── */}
              <tr className="border-b border-border/40 bg-muted/20 transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">تعداد پروژه</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <span
                      className={`text-sm font-bold ${
                        isBest('projectCount', s.projectCount)
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {s.projectCount.toLocaleString('fa-IR')}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── نرخ تکمیل (Completion rate) ── */}
              <tr className="border-b border-border/40 bg-card transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">نرخ تکمیل</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <RateBar
                        value={s.completionRate}
                        highlight={isBest('completionRate', s.completionRate)}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── نرخ پاسخ‌دهی (Response rate) ── */}
              <tr className="border-b border-border/40 bg-muted/20 transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">نرخ پاسخ‌دهی</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <RateBar
                        value={s.responseRate}
                        highlight={isBest('responseRate', s.responseRate)}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── زمان پاسخ (Response time) ── */}
              <tr className="border-b border-border/40 bg-card transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">زمان پاسخ</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold">
                      {s.responseTime || '—'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── دستمزد ساعتی (Hourly rate) ── */}
              <tr className="border-b border-border/40 bg-muted/20 transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">دستمزد ساعتی</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <span
                      className={`text-sm font-semibold ${
                        isBest('hourlyRate', s.hourlyRate || Infinity)
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {s.hourlyRate && s.hourlyRate > 0
                        ? formatPrice(s.hourlyRate)
                        : 'توافقی'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── حداقل قیمت پروژه (Min project price) ── */}
              <tr className="border-b border-border/40 bg-card transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">حداقل قیمت پروژه</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <span
                      className={`text-sm font-semibold ${
                        isBest(
                          'minProjectPrice',
                          s.minProjectPrice || Infinity
                        )
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {s.minProjectPrice ? formatPrice(s.minProjectPrice) : '—'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── مهارت‌ها (Skills) ── */}
              <tr className="border-b border-border/40 bg-muted/20 transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">مهارت‌ها</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {s.skills.map((skill) => (
                        <Badge
                          key={skill.name}
                          variant="secondary"
                          className={`rounded-md text-[11px] font-medium ${
                            isBest('skillCount', s.skills.length)
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── وضعیت (Status) ── */}
              <tr className="border-b border-border/40 bg-card transition-colors hover:bg-muted/30">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-4 backdrop-blur-sm">
                  <span className="text-sm font-medium">وضعیت</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        s.online
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          s.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                      />
                      {s.online ? 'آنلاین' : 'آفلاین'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── عملیات (Actions) ── */}
              <tr className="bg-muted/20">
                <td className="sticky right-0 z-10 bg-muted/40 px-4 py-5 backdrop-blur-sm">
                  <span className="text-sm font-medium">عملیات</span>
                </td>
                {specialists.map((s) => (
                  <td key={s.id} className="px-4 py-5 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1.5 rounded-lg text-xs"
                        onClick={() => navigateTo('messages', { id: s.id })}
                      >
                        <MessageSquare className="size-3.5" />
                        ارسال پیام
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 gap-1.5 rounded-lg text-xs"
                        onClick={() =>
                          navigateTo('specialist-profile', { id: s.id })
                        }
                      >
                        <Eye className="size-3.5" />
                        مشاهده پروفایل
                        <ArrowLeft className="size-3" />
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}
