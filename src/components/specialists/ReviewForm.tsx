'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Star,
  Send,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  StarHalf,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryRating {
  quality: number;       // کیفیت کار
  timeliness: number;    // رعایت زمان‌بندی
  communication: number; // ارتباط و پاسخگویی
  professionalism: number; // حرفه‌ای بودن
}

interface FormData {
  ratings: CategoryRating;
  comment: string;
  pros: string;
  cons: string;
  recommended: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'quality' as keyof CategoryRating, label: 'کیفیت کار', icon: Star },
  { key: 'timeliness' as keyof CategoryRating, label: 'رعایت زمان‌بندی', icon: Star },
  { key: 'communication' as keyof CategoryRating, label: 'ارتباط و پاسخگویی', icon: MessageSquare },
  { key: 'professionalism' as keyof CategoryRating, label: 'حرفه‌ای بودن', icon: Star },
] as const;

const RATING_LABELS: Record<number, string> = {
  0: '',
  0.5: 'خیلی بد',
  1: 'خیلی بد',
  1.5: 'بد',
  2: 'بد',
  2.5: 'متوسط',
  3: 'متوسط',
  3.5: 'خوب',
  4: 'خوب',
  4.5: 'عالی',
  5: 'عالی',
};

// ─── Star Rating Sub-component ───────────────────────────────────────────────

function InteractiveStarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (val: number) => void;
  size?: number;
}) {
  const [hoverValue, setHoverValue] = useState<number>(0);
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = hoverValue > 0 ? hoverValue : value;
  const isHovering = hoverValue > 0;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeftHalf = x < rect.width / 2;
      const side = isLeftHalf ? 'left' : 'right';

      setHoverSide(side);
      const newVal = isLeftHalf ? starIndex - 0.5 : starIndex;
      setHoverValue(newVal);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoverValue(0);
    setHoverSide(null);
  }, []);

  const handleClick = useCallback(
    (starIndex: number) => {
      const newVal = hoverSide === 'left' ? starIndex - 0.5 : starIndex;
      onChange(newVal === value ? 0 : newVal);
    },
    [hoverSide, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, starIndex: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onChange(Math.min(5, starIndex));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onChange(Math.max(0, starIndex - 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(starIndex);
      }
    },
    [onChange]
  );

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-0.5"
      dir="ltr"
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = displayValue >= star;
        const isHalf = !isFull && displayValue >= star - 0.5;
        const isEmpty = !isFull && !isHalf;

        return (
          <div
            key={star}
            className="cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-sm"
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={() => handleClick(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            role="button"
            aria-label={`${star} ستاره`}
            tabIndex={0}
          >
            {isFull ? (
              <Star
                size={size}
                className={`transition-colors duration-150 ${
                  isHovering
                    ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                    : 'text-amber-500'
                }`}
                fill="currentColor"
                strokeWidth={1.5}
              />
            ) : isHalf ? (
              <div className="relative" style={{ width: size, height: size }}>
                <Star
                  size={size}
                  className="absolute inset-0 text-muted-foreground/30"
                  fill="currentColor"
                  strokeWidth={1.5}
                />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: '50%' }}
                >
                  <Star
                    size={size}
                    className={`transition-colors duration-150 ${
                      isHovering
                        ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : 'text-amber-500'
                    }`}
                    fill="currentColor"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ) : (
              <Star
                size={size}
                className={`transition-colors duration-150 ${
                  isHovering
                    ? 'text-amber-200'
                    : 'text-muted-foreground/30'
                }`}
                fill="currentColor"
                strokeWidth={1.5}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Success State ───────────────────────────────────────────────────────────

function SuccessState({
  overallRating,
  onGoBack,
}: {
  overallRating: number;
  onGoBack: () => void;
}) {
  return (
    <div className="relative">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 gap-6">
          {/* Animated checkmark */}
          <div>
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Thank you text */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              با تشکر از شما! 🙏
            </h3>
            <p className="text-muted-foreground text-sm">
              نظر شما با موفقیت ثبت شد و پس از بررسی نمایش داده خواهد شد.
            </p>
          </div>

          {/* Rating display */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-6 py-3 shadow-md border border-border/30">
            <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {overallRating.toFixed(1)}
            </span>
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    className={
                      overallRating >= star
                        ? 'text-amber-500'
                        : overallRating >= star - 0.5
                        ? 'text-amber-400'
                        : 'text-muted-foreground/30'
                    }
                    fill="currentColor"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                امتیاز کلی شما
              </span>
            </div>
          </div>

          {/* Go back button */}
          <div>
            <Button
              onClick={handleGoBack}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 h-11 rounded-xl"
              data-href="/specialist-profile"
              title="بازگشت به پروفایل کسب‌وکار"
            >
              <ChevronLeft className="w-4 h-4" />
              بازگشت
            </Button>
          </div>
        </CardContent>
      </Card>
      <noscript>
        <div className="sr-only">
          <h1>ثبت نظر و امتیاز - نیاز فایندر</h1>
          <p>فرم ثبت نظر و امتیاز شامل ارزیابی کیفیت کار، رعایت زمان‌بندی، ارتباط و پاسخگویی و حرفه‌ای بودن کسب‌وکار.</p>
        </div>
      </noscript>
    </div>
  );
}
// ─── Main Review Form ────────────────────────────────────────────────────────

export default function ReviewForm() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const goBack = useAppStore((s) => s.goBack);
  const viewParams = useAppStore((s) => s.viewParams);
  const specialistId = viewParams?.id ?? '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [ratings, setRatings] = useState<CategoryRating>({
    quality: 0,
    timeliness: 0,
    communication: 0,
    professionalism: 0,
  });
  const [comment, setComment] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [recommended, setRecommended] = useState(true);

  // Computed
  const overallRating = useMemo(() => {
    const vals = Object.values(ratings);
    const ratedCount = vals.filter((v) => v > 0).length;
    if (ratedCount === 0) return 0;
    return vals.reduce((sum, v) => sum + v, 0) / vals.length;
  }, [ratings]);

  const overallLabel = RATING_LABELS[Math.round(overallRating * 2) / 2] ?? '';

  const isFormValid = useMemo(() => {
    const allRated = Object.values(ratings).every((v) => v > 0);
    const commentValid = comment.trim().length >= 20;
    return allRated && commentValid;
  }, [ratings, comment]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRatingChange = useCallback(
    (key: keyof CategoryRating, value: number) => {
      setRatings((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 2000) {
      setComment(val);
      if (val.trim().length >= 20) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next['comment'];
          return next;
        });
      }
    }
  }, []);

  const handleProsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) setPros(val);
  }, []);

  const handleConsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) setCons(val);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Check all ratings
    const unratedCategories = CATEGORIES.filter(
      (c) => ratings[c.key] === 0
    );
    if (unratedCategories.length > 0) {
      newErrors['ratings'] = 'لطفاً به تمام دسته‌بندی‌ها امتیاز دهید.';
    }

    // Comment validation
    const trimmedComment = comment.trim();
    if (trimmedComment.length === 0) {
      newErrors['comment'] = 'لطفاً نظر خود را بنویسید.';
    } else if (trimmedComment.length < 20) {
      newErrors['comment'] = `حداقل ۲۰ کاراکتر وارد کنید. (${trimmedComment.length}/۲۰)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [ratings, comment]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1800));

    setIsSubmitting(false);
    setIsSuccess(true);
    toast.success('نظر شما با موفقیت ثبت شد', {
      description: 'با تشکر از اشتراک‌گذاری تجربه‌تان.',
    });
  }, [validate]);

  const handleGoBack = useCallback(() => {
    if (specialistId) {
      navigateTo('specialist-profile', { id: specialistId });
    } else {
      goBack();
    }
  }, [navigateTo, goBack, specialistId]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <SuccessState overallRating={overallRating} onGoBack={handleGoBack} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="border-emerald-200/50 dark:border-emerald-900/30 overflow-hidden shadow-xl shadow-emerald-500/[0.04]">
        {/* Header */}
        <CardHeader className="bg-gradient-to-l from-emerald-50/80 to-white dark:from-emerald-950/15 dark:to-background pb-4">
          <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" />
            ثبت نظر و امتیاز
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            تجربه خود را از همکاری با این کسب‌وکار به اشتراک بگذارید
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* ── Overall Rating Display ─────────────────────────────────── */}
          <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-100/60 dark:border-emerald-900/30 shadow-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white dark:bg-gray-800 shadow-sm border">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {overallRating > 0 ? overallRating.toFixed(1) : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star}>
                    {overallRating >= star ? (
                      <Star
                        size={20}
                        className="text-amber-500"
                        fill="currentColor"
                        strokeWidth={1.5}
                      />
                    ) : overallRating >= star - 0.5 ? (
                      <StarHalf
                        size={20}
                        className="text-amber-400"
                        fill="currentColor"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Star
                        size={20}
                        className="text-muted-foreground/30"
                        fill="currentColor"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {overallLabel || 'امتیاز کلی (میانگین دسته‌بندی‌ها)'}
              </span>
            </div>
          </div>

          {/* ── Rating Categories ──────────────────────────────────────── */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-foreground">
              امتیازدهی به دسته‌بندی‌ها
            </Label>

            {errors['ratings'] && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                ⚠️ {errors['ratings']}
              </p>
            )}

            {CATEGORIES.map((category) => {
              const currentRating = ratings[category.key];
              const label =
                RATING_LABELS[Math.round(currentRating * 2) / 2] ?? '';

              return (
                <div
                  key={category.key}
                  className="flex items-center justify-between gap-4 bg-muted/40 dark:bg-muted/30 rounded-xl p-3.5 border border-border/30 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {category.label}
                    </span>
                    {label && (
                      <span className="text-xs text-muted-foreground">
                        {label}
                      </span>
                    )}
                  </div>
                  <InteractiveStarRating
                    value={currentRating}
                    onChange={(val) => handleRatingChange(category.key, val)}
                    size={24}
                  />
                </div>
              );
            })}
          </div>

          <Separator className="bg-emerald-100 dark:bg-emerald-900/40" />

          {/* ── Comment ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label
              htmlFor="review-comment"
              className="text-sm font-semibold text-foreground flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              نظر شما
            </Label>

            <Textarea
              id="review-comment"
              placeholder="تجربه خود را از همکاری با این کسب‌وکار بنویسید..."
              value={comment}
              onChange={handleCommentChange}
              className="min-h-[120px] resize-y text-sm leading-7 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
              dir="rtl"
            />

            <div className="flex items-center justify-between">
              {errors['comment'] && (
                <p className="text-sm text-red-500">
                  ⚠️ {errors['comment']}
                </p>
              )}
              <span
                className={`text-xs mr-auto tabular-nums ${
                  comment.trim().length < 20
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
                }`}
              >
                {comment.length} / ۲۰۰۰
              </span>
            </div>
          </div>

          <Separator className="bg-emerald-100 dark:bg-emerald-900/40" />

          {/* ── Pros & Cons ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                نقاط قوت
              </Label>
              <Textarea
                placeholder="مثلاً: خلاقیت بالا، تحویل به موقع..."
                value={pros}
                onChange={handleProsChange}
                className="min-h-[80px] resize-y text-sm leading-7 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                dir="rtl"
              />
              <span className="text-xs text-muted-foreground tabular-nums block text-left" dir="ltr">
                {pros.length} / 500
              </span>
            </div>

            {/* Cons */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <ThumbsDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                نقاط ضعف
              </Label>
              <Textarea
                placeholder="مثلاً: تأخیر در پاسخگویی..."
                value={cons}
                onChange={handleConsChange}
                className="min-h-[80px] resize-y text-sm leading-7 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                dir="rtl"
              />
              <span className="text-xs text-muted-foreground tabular-nums block text-left" dir="ltr">
                {cons.length} / 500
              </span>
            </div>
          </div>

          {/* ── Recommended Toggle ─────────────────────────────────────── */}
          <div className="flex items-center justify-between bg-muted/40 dark:bg-muted/30 rounded-xl p-4 border border-border/30">
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="recommended-switch"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                آیا این کسب‌وکار را پیشنهاد می‌دهید؟
              </Label>
              <span className="text-xs text-muted-foreground">
                {recommended
                  ? '✅ این کسب‌وکار را توصیه می‌کنم'
                  : '❌ این کسب‌وکار را توصیه نمی‌کنم'}
              </span>
            </div>
            <Switch
              id="recommended-switch"
              checked={recommended}
              onCheckedChange={setRecommended}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <Separator className="bg-emerald-100 dark:bg-emerald-900/40" />

          {/* ── Submit Button ──────────────────────────────────────────── */}
          <div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="w-full h-12 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25"
              title="ثبت نظر و امتیاز"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال ثبت نظر...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>ثبت نظر</span>
                </>
              )}
            </Button>

            {!isFormValid && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                برای ثبت نظر، لطفاً به تمام دسته‌بندی‌ها امتیاز دهید و حداقل ۲۰ کاراکتر بنویسید.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <noscript>
        <div className="sr-only">
          <h1>فرم ثبت نظر - نیاز فایندر</h1>
          <p>برای ثبت نظر، ابتدا به تمام دسته‌بندی‌ها امتیاز دهید و نظر خود را بنویسید.</p>
        </div>
      </noscript>
    </div>
  );
}
