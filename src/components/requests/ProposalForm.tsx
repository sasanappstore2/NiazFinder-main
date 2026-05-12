'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Send, Clock, DollarSign, Loader2, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { MOCK_REQUESTS, MOCK_SPECIALISTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getPriorityLabel } from '@/lib/constants';

// ─── Helpers ───────────────────────────────────────────

/** Convert Latin digits to Persian (Arabic-Indic) numerals */
function toPersianDigits(value: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/[0-9]/g, (d) => persianDigits[Number(d)]);
}

/** Format a number with thousand separators using Persian digits */
function formatPriceDisplay(value: string): string {
  const raw = value.replace(/[^0-9]/g, '');
  if (!raw) return '';
  const formatted = Number(raw).toLocaleString('en-US');
  return toPersianDigits(formatted);
}

// ─── Priority style helper ─────────────────────────────

function getPriorityBadgeStyle(priority: string) {
  const map: Record<string, string> = {
    URGENT: 'bg-destructive/10 text-destructive border-destructive/20',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    NORMAL: 'bg-muted text-muted-foreground border-border',
    LOW: 'bg-muted text-muted-foreground border-border',
  };
  return map[priority] || map.NORMAL;
}

// ─── Component ─────────────────────────────────────────

export function ProposalForm() {
  const viewParams = useAppStore((s) => s.viewParams);
  const goBack = useAppStore((s) => s.goBack);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  // Resolve request from store params
  const requestId = viewParams.id || 'r1';
  const request = MOCK_REQUESTS.find((r) => r.id === requestId) || MOCK_REQUESTS[0];

  // Current specialist (mock — first specialist's portfolio)
  const currentSpecialist = MOCK_SPECIALISTS[0];
  const portfolioItems = currentSpecialist.portfolios || [];

  // ── Form state ──
  const [priceRaw, setPriceRaw] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryUnit, setDeliveryUnit] = useState('day');
  const [message, setMessage] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ── Validation state ──
  const [errors, setErrors] = useState<{
    price?: string;
    deliveryTime?: string;
    message?: string;
  }>({});

  const [touched, setTouched] = useState<{
    price?: boolean;
    deliveryTime?: boolean;
    message?: boolean;
  }>({});

  // ── Derived values ──
  const priceNumeric = Number(priceRaw.replace(/[^0-9]/g, ''));
  const messageLength = message.length;
  const isNearLimit = messageLength > 1800;
  const isOverLimit = messageLength > 2000;

  // ── Validation ──
  function validate(): boolean {
    const newErrors: typeof errors = {};

    if (!priceNumeric || priceNumeric <= 0) {
      newErrors.price = 'لطفاً قیمت پیشنهادی را وارد کنید (بیشتر از صفر)';
    }

    if (!deliveryTime || Number(deliveryTime) <= 0) {
      newErrors.deliveryTime = 'لطفاً زمان تحویل را مشخص کنید';
    }

    if (messageLength < 50) {
      newErrors.message = `پیام شما باید حداقل ۵۰ کاراکتر باشد (${toPersianDigits(String(50 - messageLength))} کاراکتر دیگر)`;
    }

    if (messageLength > 2000) {
      newErrors.message = 'پیام شما نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleBlur(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Run validation on blur to show errors early
    const newErrors: typeof errors = {};
    if (field === 'price' && (!priceNumeric || priceNumeric <= 0)) {
      newErrors.price = 'لطفاً قیمت پیشنهادی را وارد کنید (بیشتر از صفر)';
    }
    if (field === 'deliveryTime' && (!deliveryTime || Number(deliveryTime) <= 0)) {
      newErrors.deliveryTime = 'لطفاً زمان تحویل را مشخص کنید';
    }
    if (field === 'message') {
      if (messageLength < 50) {
        newErrors.message = `پیام شما باید حداقل ۵۰ کاراکتر باشد (${toPersianDigits(String(50 - messageLength))} کاراکتر دیگر)`;
      }
      if (messageLength > 2000) {
        newErrors.message = 'پیام شما نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد';
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
  }

  // ── Submit ──
  async function handleSubmit() {
    // Touch all fields
    setTouched({ price: true, deliveryTime: true, message: true });

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1800));

    setIsSubmitting(false);
    setIsSuccess(true);

    toast.success('پیشنهاد شما با موفقیت ارسال شد!', {
      description: `پیشنهاد شما برای «${request.title}» ثبت شد و به اطلاع کارفرما خواهد رسید.`,
    });

    // Navigate back after success animation
    setTimeout(() => {
      goBack();
    }, 1200);
  }

  // ── Delivery unit labels ──
  const deliveryUnitLabels: Record<string, string> = {
    day: 'روز',
    week: 'هفته',
    month: 'ماه',
  };

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto" dir="rtl">
      <AnimatePresence mode="wait">
        {/* ── Success State ── */}
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
              className="mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 250, damping: 15 }}
              >
                <Check className="size-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
              </motion.div>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl font-bold text-foreground"
            >
              پیشنهاد با موفقیت ارسال شد!
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              در حال بازگشت...
            </motion.p>
          </motion.div>
        ) : (
          /* ── Form State ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Card className="overflow-hidden rounded-2xl border-border/50 shadow-lg shadow-black/[0.04]">
              {/* Gradient accent bar */}
              <div className="h-1.5 bg-gradient-to-l from-emerald-400 via-teal-500 to-emerald-600" />

              {/* ── Header ── */}
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 text-lg shrink-0 shadow-sm">
                      {request.categoryIcon || '📋'}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-relaxed line-clamp-2 font-bold">
                        {request.title}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ارسال پیشنهاد برای این نیاز
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 rounded-lg text-[11px] font-medium w-fit',
                      getPriorityBadgeStyle(request.priority)
                    )}
                  >
                    {getPriorityLabel(request.priority)}
                  </Badge>
                </div>
              </CardHeader>

              <Separator />

              {/* ── Form Body ── */}
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="price" className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-500" />
                    قیمت پیشنهادی
                    <span className="text-destructive">*</span>
                  </Label>

                  <div className="relative">
                    <Input
                      id="price"
                      type="text"
                      inputMode="numeric"
                      placeholder="مثلاً ۵,۰۰۰,۰۰۰"
                      dir="ltr"
                      value={formatPriceDisplay(priceRaw)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setPriceRaw(raw);
                        // Clear error on change
                        if (touched.price) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (Number(raw) > 0) delete next.price;
                            return next;
                          });
                        }
                      }}
                      onBlur={() => handleBlur('price')}
                      className={cn(
                        'pl-[72px] text-left font-mono tracking-wide',
                        touched.price && errors.price && 'border-destructive focus-visible:ring-destructive/30'
                      )}
                    />
                    {/* Toman suffix badge */}
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Badge variant="secondary" className="text-[10px] font-medium bg-muted/80 px-2 py-0.5 rounded-md">
                        تومان
                      </Badge>
                    </div>
                  </div>

                  <AnimatePresence>
                    {touched.price && errors.price && (
                      <motion.p
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <span className="inline-block size-1 rounded-full bg-destructive" />
                        {errors.price}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Budget hint */}
                  {request.budgetMin && request.budgetMax && (
                    <p className="text-[11px] text-muted-foreground">
                      بازه بودجه کارفرما:{' '}
                      <span className="font-medium text-foreground">
                        {toPersianDigits(request.budgetMin.toLocaleString('en-US'))} — {toPersianDigits(request.budgetMax.toLocaleString('en-US'))}
                      </span>{' '}
                      تومان
                    </p>
                  )}
                </div>

                <Separator />

                {/* === Delivery Time Section === */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    زمان تحویل
                    <span className="text-destructive">*</span>
                  </Label>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="مثلاً ۱۴"
                        min={1}
                        dir="ltr"
                        value={deliveryTime}
                        onChange={(e) => {
                          setDeliveryTime(e.target.value);
                          if (touched.deliveryTime) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              if (Number(e.target.value) > 0) delete next.deliveryTime;
                              return next;
                            });
                          }
                        }}
                        onBlur={() => handleBlur('deliveryTime')}
                        className={cn(
                          'text-left font-mono',
                          touched.deliveryTime && errors.deliveryTime && 'border-destructive focus-visible:ring-destructive/30'
                        )}
                      />
                    </div>
                    <Select value={deliveryUnit} onValueChange={setDeliveryUnit} dir="rtl">
                      <SelectTrigger className="w-[110px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">روز</SelectItem>
                        <SelectItem value="week">هفته</SelectItem>
                        <SelectItem value="month">ماه</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <AnimatePresence>
                    {touched.deliveryTime && errors.deliveryTime && (
                      <motion.p
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <span className="inline-block size-1 rounded-full bg-destructive" />
                        {errors.deliveryTime}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Requested delivery hint */}
                  {request.deliveryTime && (
                    <p className="text-[11px] text-muted-foreground">
                      زمان تحویل درخواست کارفرما:{' '}
                      <span className="font-medium text-foreground">
                        {toPersianDigits(String(request.deliveryTime))}{' '}
                        {deliveryUnitLabels[request.deliveryUnit] || 'روز'}
                      </span>
                    </p>
                  )}
                </div>

                <Separator />

                {/* === Cover Letter Section === */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    پیام پیشنهاد (نامه پوششی)
                    <span className="text-destructive">*</span>
                  </Label>

                  <Textarea
                    id="message"
                    placeholder="توضیح دهید که چرا شما بهترین انتخاب برای این پروژه هستید. تجربیات، مهارت‌ها و رویکرد خود را شرح دهید..."
                    className={cn(
                      'min-h-[160px] resize-y text-sm leading-7',
                      touched.message && errors.message && 'border-destructive focus-visible:ring-destructive/30',
                      isOverLimit && 'border-destructive focus-visible:ring-destructive/30'
                    )}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (touched.message) {
                        const len = e.target.value.length;
                        setErrors((prev) => {
                          const next = { ...prev };
                          if (len >= 50 && len <= 2000) delete next.message;
                          return next;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('message')}
                    maxLength={2100}
                  />

                  {/* Character counter */}
                  <div className="flex items-center justify-between">
                    <AnimatePresence>
                      {touched.message && errors.message && (
                        <motion.p
                          initial={{ opacity: 0, height: 0, y: -4 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs text-destructive flex items-center gap-1"
                        >
                          <span className="inline-block size-1 rounded-full bg-destructive" />
                          {errors.message}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <span
                      className={cn(
                        'text-xs tabular-nums transition-colors mr-auto',
                        messageLength === 0 && 'text-muted-foreground',
                        messageLength > 0 && messageLength < 50 && 'text-amber-600 dark:text-amber-400',
                        messageLength >= 50 && !isNearLimit && !isOverLimit && 'text-emerald-600 dark:text-emerald-400',
                        isNearLimit && !isOverLimit && 'text-amber-600 dark:text-amber-400',
                        isOverLimit && 'text-destructive font-semibold'
                      )}
                    >
                      {toPersianDigits(String(messageLength))} / {toPersianDigits('2000')}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* === Portfolio Attachment Section === */}
                {portfolioItems.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      📁 پیوست نمونه کار (اختیاری)
                    </Label>

                    <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio} dir="rtl">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="یک نمونه کار را برای پیوست انتخاب کنید..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">
                          <span className="text-muted-foreground">بدون پیوست نمونه کار</span>
                        </SelectItem>
                        {portfolioItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <span className="flex items-center gap-2">
                              <span className="truncate">{item.title}</span>
                              {item.completedAt && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  ({toPersianDigits(new Date(item.completedAt).toLocaleDateString('fa-IR'))})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedPortfolio && selectedPortfolio !== 'none' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-lg bg-muted/50 p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          نمونه کار «
                          <span className="font-medium text-foreground">
                            {portfolioItems.find((p) => p.id === selectedPortfolio)?.title}
                          </span>
                          » به پیشنهاد شما پیوست خواهد شد.
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                <Separator />

                {/* === Submit Button === */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-12 text-base gap-2 rounded-xl font-semibold transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        در حال ارسال پیشنهاد...
                      </>
                    ) : (
                      <>
                        <Send className="size-5" />
                        ارسال پیشنهاد
                      </>
                    )}
                  </Button>

                  <p className="mt-3 text-center text-[11px] text-muted-foreground leading-relaxed">
                    با ارسال پیشنهاد، شما{' '}
                    <span className="font-medium text-foreground">قوانین و مقررات</span>{' '}
                    نیاز فایندر را می‌پذیرید.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
