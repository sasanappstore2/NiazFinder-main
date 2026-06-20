'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  MessageSquare,
  Briefcase,
  Wallet,
  Shield,
  Megaphone,
  Check,
  X,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============
interface NotificationItem {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  items: NotificationItem[];
}

// ============ Notification Categories Data ============
const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'proposals',
    title: 'پیشنهادها',
    description: 'اطلاع‌رسانی مربوط به پیشنهادات ارسالی و دریافتی',
    icon: Bell,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    items: [
      { id: 'proposal_new', label: 'پیشنهاد جدید برای نیاز من', description: 'وقتی کسی برای نیاز شما پیشنهادی ارسال کند', defaultEnabled: true },
      { id: 'proposal_accepted', label: 'پیشنهاد من پذیرفته شد', description: 'وقتی کارفرما پیشنهاد شما را بپذیرد', defaultEnabled: true },
      { id: 'proposal_rejected', label: 'پیشنهاد من رد شد', description: 'وقتی کارفرما پیشنهاد شما را رد کند', defaultEnabled: true },
      { id: 'proposal_expired', label: 'مهلت ارسال پیشنهاد به پایان رسیده', description: 'وقتی زمان ارسال پیشنهاد برای نیازی تمام شود', defaultEnabled: false },
    ],
  },
  {
    id: 'messages',
    title: 'پیام‌ها',
    description: 'اطلاع‌رسانی مربوط به پیام‌ها و وضعیت آنلاین',
    icon: MessageSquare,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40',
    borderColor: 'border-sky-200 dark:border-sky-800',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    items: [
      { id: 'msg_new', label: 'پیام جدید', description: 'وقتی پیام جدیدی دریافت کنید', defaultEnabled: true },
      { id: 'msg_online', label: 'کاربر آنلاین شد', description: 'وقتی کاربری که با او گفتگو دارید آنلاین شود', defaultEnabled: true },
      { id: 'msg_offline', label: 'کاربر آفلاین شد', description: 'وقتی کاربری که با او گفتگو دارید آفلاین شود', defaultEnabled: false },
    ],
  },
  {
    id: 'projects',
    title: 'پروژه‌ها',
    description: 'اطلاع‌رسانی مربوط به پروژه‌ها و وضعیت آن‌ها',
    icon: Briefcase,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    items: [
      { id: 'project_started', label: 'پروژه جدید شروع شد', description: 'وقتی پروژه جدیدی آغاز به کار کند', defaultEnabled: true },
      { id: 'project_completed', label: 'پروژه تکمیل شد', description: 'وقتی پروژه با موفقیت تکمیل شود', defaultEnabled: true },
      { id: 'project_deadline', label: 'مهلت پروژه رو به اتمام است', description: 'یادآوری نزدیک شدن به مهلت تحویل پروژه', defaultEnabled: true },
      { id: 'project_review', label: 'درخواست بازخوانی شد', description: 'وقتی درخواست بررسی و بازخوانی پروژه ثبت شود', defaultEnabled: true },
    ],
  },
  {
    id: 'financial',
    title: 'مالی',
    description: 'اطلاع‌رسانی مربوط به تراکنش‌ها و کیف پول',
    icon: Wallet,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    borderColor: 'border-violet-200 dark:border-violet-800',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    items: [
      { id: 'fin_deposit', label: 'واریز به کیف پول', description: 'وقتی مبلغی به کیف پول شما واریز شود', defaultEnabled: true },
      { id: 'fin_payment_success', label: 'پرداخت موفق', description: 'وقتی پرداختی با موفقیت انجام شود', defaultEnabled: true },
      { id: 'fin_payment_fail', label: 'پرداخت ناموفق', description: 'وقتی پرداختی ناموفق باشد', defaultEnabled: true },
      { id: 'fin_commission', label: 'کمسیون واریز شد', description: 'اطلاع‌رسانی کسر کمیسیون از تراکنش‌ها', defaultEnabled: true },
    ],
  },
  {
    id: 'account',
    title: 'اکانت',
    description: 'اطلاع‌رسانی مربوط به امنیت و تغییرات حساب کاربری',
    icon: Shield,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    items: [
      { id: 'acc_profile', label: 'تغییرات پروفایل', description: 'اطلاع‌رسانی تغییرات اطلاعات پروفایل', defaultEnabled: false },
      { id: 'acc_password', label: 'تغییر رمز عبور', description: 'وقتی رمز عبور حساب شما تغییر کند', defaultEnabled: true },
      { id: 'acc_device', label: 'ورود از دستگاه جدید', description: 'وقتی از دستگاه جدیدی وارد حساب شوید', defaultEnabled: true },
    ],
  },
  {
    id: 'marketing',
    title: 'بازاریابی',
    description: 'اطلاع‌رسانی مربوط به تخفیف‌ها و اخبار پلتفرم',
    icon: Megaphone,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
    items: [
      { id: 'mkt_discounts', label: 'تخفیف‌ها و پیشنهادات ویژه', description: 'اطلاع‌رسانی تخفیف‌ها و کمپین‌های ویژه', defaultEnabled: false },
      { id: 'mkt_newsletter', label: 'خبرنامه هفتگی', description: 'خلاصه اخبار و فعالیت‌های هفته', defaultEnabled: true },
      { id: 'mkt_features', label: 'اطلاع‌رسانی محصول جدید', description: 'ویژگی‌ها و امکانات جدید پلتفرم', defaultEnabled: true },
    ],
  },
];

// ============ Component ============
export function NotificationSettings() {
  const initialState = (): Record<string, boolean> => {
    const state: Record<string, boolean> = {};
    NOTIFICATION_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => { state[item.id] = item.defaultEnabled; });
    });
    return state;
  };

  const [settings, setSettings] = useState<Record<string, boolean>>(initialState);

  const handleToggle = useCallback((itemId: string) => {
    setSettings((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    toast.success('تنظیمات ذخیره شد');
  }, []);

  const handleEnableAll = useCallback(() => {
    const allEnabled: Record<string, boolean> = {};
    NOTIFICATION_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => { allEnabled[item.id] = true; });
    });
    setSettings(allEnabled);
    toast.success('همه اعلان‌ها فعال شدند');
  }, []);

  const handleDisableAll = useCallback(() => {
    const allDisabled: Record<string, boolean> = {};
    NOTIFICATION_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => { allDisabled[item.id] = false; });
    });
    setSettings(allDisabled);
    toast.success('همه اعلان‌ها غیرفعال شدند');
  }, []);

  const handleSave = useCallback(() => {
    toast.success('تنظیمات اعلان‌ها با موفقیت ذخیره شد');
  }, []);

  const totalItems = NOTIFICATION_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
  const enabledCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ============ Page Header ============ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 shadow-sm">
            <Settings2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">تنظیمات اعلان‌ها</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">مدیریت نحوه دریافت اعلان‌ها و نوتیفیکیشن‌ها در پلتفرم نیاز فایندر</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'h-fit gap-1.5 px-3 py-1.5 text-sm font-medium',
            enabledCount === totalItems
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : enabledCount > 0
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
          )}
        >
          {enabledCount === totalItems ? <Check className="h-4 w-4" /> : enabledCount === 0 ? <X className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          <span>{enabledCount.toLocaleString('fa-IR')} از {totalItems.toLocaleString('fa-IR')} فعال</span>
        </Badge>
      </div>

      {/* ============ Bulk Actions ============ */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleEnableAll} className="gap-2 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-all duration-150" title="فعال کردن همه اعلان‌ها">
          <Check className="h-4 w-4" />همه را فعال کن
        </Button>
        <Button variant="outline" size="sm" onClick={handleDisableAll} className="gap-2 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-all duration-150" title="غیرفعال کردن همه اعلان‌ها">
          <X className="h-4 w-4" />همه را غیرفعال کن
        </Button>
      </div>

      <Separator />

      {/* ============ Notification Category Cards ============ */}
      <div className="grid gap-5">
        {NOTIFICATION_CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          const categoryEnabledCount = category.items.filter((item) => settings[item.id]).length;
          const allEnabled = categoryEnabledCount === category.items.length;

          return (
            <Card key={category.id} className="overflow-hidden rounded-2xl border border-border/50 transition-all duration-150 hover:shadow-lg hover:shadow-emerald-500/5">
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', category.bgColor)}>
                      <CategoryIcon className={cn('h-5 w-5', category.color)} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{category.title}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-fit gap-1 px-2 py-0.5 text-xs font-medium',
                      allEnabled
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : categoryEnabledCount > 0
                          ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'border-muted bg-muted text-muted-foreground'
                    )}
                  >
                    {categoryEnabledCount.toLocaleString('fa-IR')} از {category.items.length.toLocaleString('fa-IR')}
                  </Badge>
                </div>
              </CardHeader>

              <Separator className="mx-6 mt-4" />

              <CardContent className="pt-4 pb-2">
                <div className="space-y-1">
                  {category.items.map((item, index) => (
                    <div key={item.id}>
                      <div className={cn(
                        'flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-all duration-150',
                        settings[item.id]
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                          : 'bg-transparent hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10'
                      )}>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-semibold text-foreground">{item.label}</span>
                          <span className="text-xs leading-relaxed text-muted-foreground">{item.description}</span>
                        </div>
                        <Switch
                          checked={settings[item.id]}
                          onCheckedChange={() => handleToggle(item.id)}
                          className="shrink-0 data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500"
                          dir="ltr"
                          aria-label={item.label}
                        />
                      </div>
                      {index < category.items.length - 1 && <Separator className="mx-3 my-0.5 opacity-50" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ============ Save Button ============ */}
      <div>
        <Button
          onClick={handleSave}
          className="w-full gap-2 rounded-xl bg-emerald-600 py-6 text-base font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:shadow-emerald-600/10"
          title="ذخیره تنظیمات اعلان‌ها"
        >
          <Check className="h-5 w-5" />ذخیره تنظیمات
        </Button>
      </div>
      <noscript>
        <div className="sr-only">
          <h1>تنظیمات اعلان‌ها - نیاز فایندر</h1>
          <p>مدیریت نحوه دریافت اعلان‌ها و نوتیفیکیشن‌ها شامل پیشنهادها، پیام‌ها، پروژه‌ها، مالی، حساب کاربری و بازاریابی.</p>
        </div>
      </noscript>
    </div>
  );
}
