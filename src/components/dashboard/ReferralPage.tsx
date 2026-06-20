'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Link2,
  Copy,
  Check,
  Gift,
  Users,
  Clock,
  DollarSign,
  Share2,
  Send,
  Mail,
  MessageCircle,
  ChevronDown,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getClientAuthToken } from '@/lib/auth/client-auth';

type ReferralStatus = 'success' | 'pending' | 'expired';

interface ReferralRecord {
  id: string; name: string; date: string; status: ReferralStatus; reward: string;
}

const STATUS_CONFIG: Record<ReferralStatus, { label: string; className: string }> = {
  success: { label: 'موفق', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  pending: { label: 'در انتظار', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  expired: { label: 'منقضی شده', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800' },
};

const HOW_IT_WORKS_STEPS = [
  { number: '۱', title: 'لینک دعوت خود را به اشتراک بگذارید', description: 'کد دعوت اختصاصی خود را کپی کرده و برای دوستانتان بفرستید.', icon: Share2 },
  { number: '۲', title: 'دوستتان با لینک شما ثبت‌نام می‌کند', description: 'دوست شما با لینک شما وارد سایت شده و حساب کاربری می‌سازد.', icon: ArrowLeft },
  { number: '۳', title: 'پس از اولین پروژه، پاداش شما واریز می‌شود', description: 'به محض انجام اولین پروژه توسط دوستتان، ۵۰ هزار تومان به کیف پول شما اضافه می‌شود.', icon: DollarSign },
];

const REFERRAL_RULES = [
  { question: 'مبلغ پاداش دعوت چقدر است؟', answer: 'برای هر دعوت موفق، مبلغ ۵۰ هزار تومان به اعتبار کیف پول شما اضافه می‌شود. دعوت زمانی موفق محسوب می‌شود که شخص دعوت‌شده با لینک شما ثبت‌نام کرده و حداقل یک پروژه را ثبت یا انجام داده باشد.' },
  { question: 'آیا محدودیتی در تعداد دعوت وجود دارد؟', answer: 'خیر، هیچ محدودیتی در تعداد دعوت وجود ندارد. هرچه دوستان بیشتری دعوت کنید، پاداش بیشتری دریافت خواهید کرد.' },
  { question: 'پاداش دعوت چه زمانی واریز می‌شود؟', answer: 'پاداش دعوت بلافاصله پس از انجام اولین پروژه توسط شخص دعوت‌شده به کیف پول شما واریز می‌شود. وضعیت دعوت در جدول تاریخچه قابل مشاهده است.' },
  { question: 'آیا امکان لغو پاداش دعوت وجود دارد؟', answer: 'در صورتی که پروژه اولیه لغو شود یا شخص دعوت‌شده تخلفی داشته باشد، پاداش ممکن است لغو شود. در هر حال، تصمیم نهایی توسط تیم پشتیبانی نیاز فایندر اتخاذ می‌شود.' },
  { question: 'لینک دعوت من منقضی می‌شود؟', answer: 'خیر، لینک دعوت شما هرگز منقضی نمی‌شود و همیشه فعال خواهد بود. اما اگر شخص دعوت‌شده ظرف ۳۰ روز ثبت‌نام نکند، آن دعوت به عنوان منقضی‌شده علامت‌گذاری می‌شود.' },
];

// ============ Component ============
export function ReferralPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [code, setCode] = useState('');
  const [url, setUrl] = useState('');
  const [stats, setStats] = useState({ total: 0, successful: 0, pending: 0, rewards: 0 });
  const [history, setHistory] = useState<ReferralRecord[]>([]);

  useEffect(() => {
    if (!getClientAuthToken()) return;
    apiFetch<{
      code: string;
      url: string;
      stats: { total: number; successful: number; pending: number; rewards: number };
      history: { id: string; isClaimed: boolean; reward: number; createdAt: string }[];
    }>('/api/referral/me')
      .then((data) => {
        setCode(data.code);
        setUrl(data.url);
        setStats(data.stats);
        setHistory(
          data.history.map((h) => ({
            id: h.id,
            name: h.id.slice(-6),
            date: new Date(h.createdAt).toLocaleDateString('fa-IR'),
            status: h.isClaimed ? 'success' : 'pending',
            reward: h.isClaimed ? `+${formatPrice(h.reward)}` : '—',
          }))
        );
      })
      .catch(() => {});
  }, []);

  const REFERRAL_STATS = [
    { id: 'total', label: 'تعداد دعوت‌ها', value: String(stats.total), suffix: 'نفر', icon: Users, gradient: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'successful', label: 'دعوت‌های موفق', value: String(stats.successful), suffix: 'نفر', icon: Check, gradient: 'from-teal-500 to-cyan-500', bgColor: 'bg-teal-50 dark:bg-teal-950/40', iconColor: 'text-teal-600 dark:text-teal-400' },
    { id: 'rewards', label: 'پاداش کسب شده', value: formatPrice(stats.rewards), suffix: '', icon: Gift, gradient: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-600 dark:text-amber-400' },
    { id: 'pending', label: 'در انتظار', value: String(stats.pending), suffix: 'نفر', icon: Clock, gradient: 'from-violet-500 to-purple-500', bgColor: 'bg-violet-50 dark:bg-violet-950/40', iconColor: 'text-violet-600 dark:text-violet-400' },
  ];

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('کد دعوت کپی شد!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('خطا در کپی کردن');
    }
  };

  const handleCopyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('لینک دعوت کپی شد!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('خطا در کپی کردن');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ============ Hero Section ============ */}
      <Card className="relative overflow-hidden rounded-2xl border-0 shadow-lg">
        <div className="absolute inset-0 bg-linear-to-bl from-emerald-500 via-emerald-600 to-teal-700" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-12 -top-12 h-52 w-52 rounded-full bg-white" />
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white" />
          <div className="absolute right-1/4 top-1/4 h-24 w-24 rounded-full bg-white" />
          <div className="absolute bottom-1/3 left-1/3 h-32 w-32 rounded-full bg-white" />
        </div>
        <CardContent className="relative z-10 px-6 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs sm:h-20 sm:w-20">
              <Gift className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl">دوستانتان را دعوت کنید و پاداش بگیرید!</h1>
              <p className="mx-auto max-w-lg text-base leading-relaxed text-emerald-100 sm:text-lg">برای هر دعوت موفق، ۵۰ هزار تومان اعتبار کیف پول دریافت کنید</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-xs"><Sparkles className="h-4 w-4" />بدون محدودیت دعوت</span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-xs"><Check className="h-4 w-4" />واریز فوری پاداش</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ Invite Link Card ============ */}
      <Card className="rounded-2xl shadow-lg shadow-emerald-500/5 border border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold"><Link2 className="h-5 w-5 text-emerald-600" />لینک دعوت شما</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Referral Code */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">کد دعوت</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <span className="text-lg font-bold tabular-nums tracking-widest text-foreground">{code || '—'}</span>
              </div>
              <Button onClick={handleCopyCode} variant="outline" className="gap-2 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 active:scale-95 transition-all duration-150" aria-label="کپی کد دعوت" title="کپی کد دعوت به کلیپ‌بورد">
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiedCode ? 'کپی شد' : 'کپی کد'}
              </Button>
            </div>
          </div>

          {/* Full Invite URL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">لینک کامل دعوت</label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1 truncate rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <span className="text-sm text-foreground" dir="ltr">{url || '—'}</span>
              </div>
              <Button onClick={handleCopyLink} className="shrink-0 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all duration-150" aria-label="کپی لینک دعوت" title="کپی لینک دعوت به کلیپ‌بورد">
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiedLink ? 'کپی شد' : 'کپی لینک'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Share Buttons */}
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">اشتراک‌گذاری در شبکه‌های اجتماعی</p>
            <div className="flex items-center gap-3">
              <Button onClick={() => {}} className="gap-2 rounded-xl text-white hover:opacity-90 active:scale-95 transition-all duration-150" style={{ backgroundColor: '#0088cc' }} aria-label="اشتراک در تلگرام" title="اشتراک‌گذاری در تلگرام">
                <Send className="h-4 w-4" /><span className="hidden sm:inline">تلگرام</span>
              </Button>
              <Button onClick={() => {}} className="gap-2 rounded-xl text-white hover:opacity-90 active:scale-95 transition-all duration-150" style={{ backgroundColor: '#25D366' }} aria-label="اشتراک در واتساپ" title="اشتراک‌گذاری در واتساپ">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">واتساپ</span>
              </Button>
              <Button onClick={() => {}} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-150" aria-label="اشتراک با ایمیل" title="اشتراک‌گذاری از طریق ایمیل">
                <Mail className="h-4 w-4" /><span className="hidden sm:inline">ایمیل</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ Referral Stats Grid ============ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REFERRAL_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.id} className="group relative overflow-hidden rounded-2xl shadow-lg shadow-emerald-500/5 border border-border/50 transition-all duration-150 hover:shadow-xl hover:shadow-emerald-500/10">
              <div className={cn('absolute inset-0 bg-linear-to-br opacity-[0.06] dark:opacity-[0.1]', stat.gradient)} />
              <CardContent className="relative z-10 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110', stat.bgColor)}>
                    <Icon className={cn('h-6 w-6', stat.iconColor)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-foreground sm:text-3xl">{stat.value}</span>
                      {stat.suffix && <span className="text-sm font-medium text-muted-foreground">{stat.suffix}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ============ Referral History Table ============ */}
      <Card className="rounded-2xl shadow-lg shadow-emerald-500/5 border border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold"><Clock className="h-5 w-5 text-emerald-600" />تاریخچه دعوت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right font-semibold">نام دوست</TableHead>
                  <TableHead className="text-right font-semibold">تاریخ دعوت</TableHead>
                  <TableHead className="text-right font-semibold">وضعیت</TableHead>
                  <TableHead className="text-right font-semibold">پاداش</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id} className="border-b transition-colors duration-150 last:border-b-0 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                    <TableCell className="py-3.5 pr-4 font-medium text-foreground">{record.name}</TableCell>
                    <TableCell className="py-3.5 pr-4 text-sm text-muted-foreground">{record.date}</TableCell>
                    <TableCell className="py-3.5 pr-4">
                      <Badge variant="outline" className={cn('text-xs px-2.5 py-0.5 font-medium', STATUS_CONFIG[record.status].className)}>{STATUS_CONFIG[record.status].label}</Badge>
                    </TableCell>
                    <TableCell className="py-3.5 pr-4 text-sm font-semibold">
                      {record.status === 'success' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{record.reward}</span>
                      ) : (
                        <span className="text-muted-foreground">{record.reward}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ============ How It Works Section ============ */}
      <Card className="rounded-2xl shadow-lg shadow-emerald-500/5 border border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold"><Sparkles className="h-5 w-5 text-emerald-600" />نحوه کارکرد سیستم دعوت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.number} className="relative flex flex-col items-center gap-4 text-center">
                  {index < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="absolute top-8 left-0 hidden h-px w-full bg-linear-to-l from-emerald-300/40 to-transparent sm:block" />
                  )}
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                    <span className="text-xl font-extrabold text-white">{step.number}</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                    <StepIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ============ Referral Rules ============ */}
      <Card className="rounded-2xl shadow-lg shadow-emerald-500/5 border border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold"><ChevronDown className="h-5 w-5 text-emerald-600" />قوانین و شرایط برنامه دعوت</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {REFERRAL_RULES.map((rule, index) => (
              <AccordionItem key={index} value={`rule-${index}`} className="border-border/50">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-emerald-600 hover:no-underline transition-colors duration-150 min-h-44px flex items-center">
                  {rule.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground pr-2">
                  {rule.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <noscript>
        <div className="sr-only">
          <h1>سیستم دعوت دوستان - نیاز فایندر</h1>
          <p>صفحه دعوت دوستان شامل لینک دعوت اختصاصی، آمار دعوت‌ها، تاریخچه و قوانین برنامه دعوت نیاز فایندر.</p>
        </div>
      </noscript>
    </div>
  );
}
