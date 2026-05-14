'use client';

import { useState, useEffect } from 'react';
import {
  LocateFixed,
  Mail,
  Phone,
  MapPin,
  Check,
  Instagram,
  Twitter,
  Linkedin,
  ExternalLink,
  ArrowUp,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import type { AppView } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ============ View → SEO path mapping ============
const VIEW_HREF: Record<AppView, string> = {
  'home': '/',
  'login': '/login',
  'register': '/register',
  'post-need': '/post-need',
  'browse-requests': '/browse-requests',
  'request-detail': '/request-detail',
  'browse-specialists': '/browse-specialists',
  'specialist-profile': '/specialist-profile',
  'dashboard': '/dashboard',
  'messages': '/messages',
  'notifications': '/notifications',
  'admin': '/admin',
  'profile': '/profile',
  'pricing': '/pricing',
  'compare-specialists': '/compare-specialists',
  'submit-proposal': '/submit-proposal',
  'submit-review': '/submit-review',
  'referral': '/referral',
  'notification-settings': '/notification-settings',
};

// ============ Footer Link ============
interface FooterLinkItem {
  label: string;
  view?: AppView;
  href?: string;
  title: string;
}

// ============ Footer Link Column ============
interface FooterLinkColumn {
  title: string;
  links: FooterLinkItem[];
}

const FOOTER_COLUMNS: FooterLinkColumn[] = [
  {
    title: 'دسترسی سریع',
    links: [
      { label: 'صفحه اصلی', view: 'home', title: 'بازگشت به صفحه اصلی نیاز فایندر' },
      { label: 'ثبت نیاز', view: 'post-need', title: 'ثبت نیاز و درخواست خدمات جدید' },
      { label: 'کسب‌وکارها', view: 'browse-specialists', title: 'مرور و جستجوی کسب‌وکارها حرفه‌ای' },
      { label: 'تعرفه‌ها', view: 'pricing', title: 'مشاهده تعرفه‌ها و طرح‌های اشتراک' },
    ],
  },
  {
    title: 'دسته‌بندی‌ها',
    links: [
      { label: 'طراحی وب', view: 'browse-specialists', title: 'کسب‌وکارها طراحی وب‌سایت و رابط کاربری' },
      { label: 'اپلیکیشن موبایل', view: 'browse-specialists', title: 'کسب‌وکارها توسعه اپلیکیشن iOS و Android' },
      { label: 'تولید محتوا', view: 'browse-specialists', title: 'کسب‌وکارها تولید محتوای متنی و تصویری' },
      { label: 'خدمات خانگی', view: 'browse-specialists', title: 'کسب‌وکارها خدمات تعمیرات و نصب خانگی' },
    ],
  },
  {
    title: 'پشتیبانی',
    links: [
      { label: 'راهنما', href: '/guide', title: 'راهنمای استفاده از نیاز فایندر' },
      { label: 'سوالات متداول', href: '/faq', title: 'پاسخ سوالات رایج کاربران' },
      { label: 'تماس با ما', href: '#contact', title: 'اطلاعات تماس با تیم پشتیبانی' },
      { label: 'قوانین و مقررات', href: '/terms', title: 'قوانین و مقررات استفاده از سرویس' },
    ],
  },
];

// ============ Social Links ============
const SOCIAL_LINKS = [
  { label: 'اینستاگرام', icon: Instagram, href: '#', title: 'ما را در اینستاگرام دنبال کنید' },
  { label: 'توییتر', icon: Twitter, href: '#', title: 'ما را در توییتر دنبال کنید' },
  { label: 'لینکدین', icon: Linkedin, href: '#', title: 'ما را در لینکدین دنبال کنید' },
];

// ============ Contact Info ============
const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'ایمیل',
    value: 'info@needfinder.ir',
    href: 'mailto:info@needfinder.ir',
    title: 'ارسال ایمیل به نیاز فایندر',
  },
  {
    icon: Phone,
    label: 'تلفن',
    value: '۰۲۱-۹۱۰۰۰۰۰۰',
    href: 'tel:+982191000000',
    title: 'تماس تلفنی با پشتیبانی',
  },
  {
    icon: MapPin,
    label: 'آدرس',
    value: 'تهران، خیابان ولیعصر',
    href: '#',
    title: 'آدرس دفتر مرکزی نیاز فایندر',
  },
];

// ============ Footer Component ============
interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
  const { navigateTo } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Back to top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: FooterLinkItem) => {
    e.preventDefault();
    if (link.view) {
      navigateTo(link.view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const currentYear = new Date().getFullYear();

  // ============ Compact Footer (non-home pages) ============
  if (compact) {
    return (
      <footer id="footer" className="bg-card/30" role="contentinfo" itemScope itemType="https://schema.org/WPFooter">
        <div className="container-default py-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2" itemScope itemType="https://schema.org/Organization">
              <LocateFixed className="size-4 text-primary" />
              <span className="text-sm font-bold text-primary" itemProp="name">
                {SITE_NAME}
              </span>
              <meta itemProp="url" content="/" />
            </div>

            {/* Quick links */}
            <nav className="flex items-center gap-4" aria-label="پاورقی" role="navigation">
              <a
                href={VIEW_HREF['home']}
                data-view="home"
                data-href={VIEW_HREF['home']}
                title="صفحه اصلی"
                onClick={(e) => handleLinkClick(e, FOOTER_COLUMNS[0].links[0])}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                صفحه اصلی
              </a>
              <a
                href={VIEW_HREF['post-need']}
                data-view="post-need"
                data-href={VIEW_HREF['post-need']}
                title="ثبت نیاز"
                onClick={(e) => handleLinkClick(e, FOOTER_COLUMNS[0].links[1])}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                ثبت نیاز
              </a>
              <a
                href={VIEW_HREF['browse-specialists']}
                data-view="browse-specialists"
                data-href={VIEW_HREF['browse-specialists']}
                title="کسب‌وکارها"
                onClick={(e) => handleLinkClick(e, FOOTER_COLUMNS[0].links[2])}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                کسب‌وکارها
              </a>
              <a
                href="#contact"
                data-href="#contact"
                title="تماس با ما"
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                تماس با ما
              </a>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} {SITE_NAME}
            </p>
          </div>
        </div>

        {/* Noscript fallback for crawlers */}
        <noscript>
          <div className="container-default py-3">
            <nav className="flex flex-wrap items-center justify-center gap-4 text-xs" aria-label="لینک‌های پایین صفحه">
              <a href="/" title="صفحه اصلی">صفحه اصلی</a>
              <a href="/post-need" title="ثبت نیاز">ثبت نیاز</a>
              <a href="/browse-specialists" title="کسب‌وکارها">کسب‌وکارها</a>
              <a href="/pricing" title="تعرفه‌ها">تعرفه‌ها</a>
              <a href="#contact" title="تماس با ما">تماس با ما</a>
            </nav>
          </div>
        </noscript>
      </footer>
    );
  }

  // ============ Full Footer (home page) ============
  return (
    <footer id="footer" className="mt-auto bg-card/50 footer-wave" role="contentinfo" itemScope itemType="https://schema.org/WPFooter">
      {/* Gradient top decoration line */}
      <div className="gradient-line" />
      {/* Newsletter Section */}
      <div className="border-b border-border bg-muted/30">
        <div className="container-default py-10">
          <div className="gradient-border rounded-xl p-6 md:p-8">
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-start">
              <div className="max-w-md">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <Sparkles className="size-4 text-emerald-500" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-foreground">
                    از آخرین خدمات و تخفیف‌ها باخبر شوید
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  ایمیل خود را وارد کنید تا از جدیدترین اخبار و فرصت‌های ویژه
                  مطلع شوید.
                </p>
              </div>
              <form
                onSubmit={handleSubscribe}
                className="flex w-full max-w-sm gap-2"
                aria-label="عضویت در خبرنامه"
              >
                <input
                  type="email"
                  placeholder="ایمیل شما..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="newsletter-input h-[40px] w-full flex-1 rounded-lg px-3 text-sm"
                  dir="ltr"
                  aria-label="آدرس ایمیل"
                  required
                />
                <Button
                  type="submit"
                  size="default"
                  className={cn(
                    'h-[40px] px-5 transition-all duration-200 hover:shadow-[0_0_12px_oklch(0.51_0.12_165/0.25)]',
                    isSubscribed && 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-[0_0_12px_oklch(0.51_0.12_165/0.3)] newsletter-success'
                  )}
                >
                  {isSubscribed ? (
                    <span className="flex items-center gap-2">
                      <Check className="size-4" />
                      ثبت شد
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="size-4" />
                      عضویت
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient arc */
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-50/40 to-transparent dark:from-emerald-950/20 pointer-events-none" aria-hidden="true" />

      {/* Main Footer */}
      <div id="footer-contact" className="container-default py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Section */}
          <div id="contact" className="sm:col-span-2 lg:col-span-1" itemScope itemType="https://schema.org/Organization">
            <div className="flex items-center gap-2">
              <LocateFixed className="size-[24px] text-primary" />
              <span className="text-xl font-bold text-primary" itemProp="name">
                {SITE_NAME}
              </span>
              <meta itemProp="url" content="/" />
              <meta itemProp="description" content={SITE_DESCRIPTION} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground" itemProp="description">
              {SITE_DESCRIPTION}
            </p>

            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.title}
                  className="flex size-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all duration-200 hover:scale-110 hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/15 hover:to-emerald-500/10 hover:text-primary hover:shadow-[0_0_12px_oklch(0.51_0.12_165/0.15)] hover:ring-2 hover:ring-primary/20"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>

            {/* Contact Info */}
            <div className="mt-6 flex flex-col gap-3" itemScope itemType="https://schema.org/ContactPoint">
              {CONTACT_INFO.map((contact) => (
                <a
                  key={contact.label}
                  href={contact.href}
                  title={contact.title}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  <contact.icon className="size-4 shrink-0 text-primary/70" />
                  <span>{contact.value}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                {column.title}
              </h4>
              <ul className="flex flex-col gap-2.5" role="list">
                {column.links.map((link) => (
                  <li key={link.label} className="transition-all duration-150 hover:border-s-2 hover:border-primary hover:ps-3">
                    {link.view ? (
                      <a
                        href={VIEW_HREF[link.view]}
                        data-view={link.view}
                        data-href={VIEW_HREF[link.view]}
                        title={link.title}
                        onClick={(e) => handleLinkClick(e, link)}
                        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.href ?? '#'}
                        data-href={link.href ?? '#'}
                        title={link.title}
                        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
                        target={
                          (link.href ?? '').startsWith('http') ? '_blank' : undefined
                        }
                        rel={
                          (link.href ?? '').startsWith('http')
                            ? 'noopener noreferrer'
                            : undefined
                        }
                      >
                        {link.label}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Back to Top Button (home page only) */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          'back-to-top-btn',
          showBackToTop && 'visible',
        )}
        aria-label="بازگشت به بالای صفحه"
        title="بازگشت به بالای صفحه"
      >
        <ArrowUp className="size-5" />
      </button>

      {/* Bottom Bar */}
      <Separator />
      <div className="container-default py-5">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span className="inline-block size-1.5 rotate-45 rounded-[1px] bg-primary/60" aria-hidden="true" />
            &copy; {currentYear} {SITE_NAME}. تمامی حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/terms"
              data-href="/terms"
              title="قوانین و مقررات استفاده از نیاز فایندر"
              className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
            >
              قوانین استفاده
            </a>
            <span className="text-muted-foreground/30" aria-hidden="true">
              |
            </span>
            <a
              href="/privacy"
              data-href="/privacy"
              title="سیاست حریم خصوصی نیاز فایندر"
              className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
            >
              حریم خصوصی
            </a>
          </div>
        </div>
      </div>

      {/* Noscript fallback for crawlers */}
      <noscript>
        <div className="container-default border-t border-border py-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-3 text-sm font-semibold">نیاز فایندر</h4>
              <p className="text-sm text-muted-foreground">{SITE_DESCRIPTION}</p>
              <p className="mt-2 text-sm text-muted-foreground">ایمیل: info@needfinder.ir</p>
              <p className="text-sm text-muted-foreground">تلفن: ۰۲۱-۹۱۰۰۰۰۰۰</p>
            </div>
            <nav aria-label="دسترسی سریع">
              <h4 className="mb-3 text-sm font-semibold">دسترسی سریع</h4>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href="/" title="صفحه اصلی نیاز فایندر">صفحه اصلی</a></li>
                <li><a href="/post-need" title="ثبت نیاز جدید">ثبت نیاز</a></li>
                <li><a href="/browse-specialists" title="کسب‌وکارها حرفه‌ای">کسب‌وکارها</a></li>
                <li><a href="/pricing" title="تعرفه‌ها و طرح‌های اشتراک">تعرفه‌ها</a></li>
              </ul>
            </nav>
            <nav aria-label="دسته‌بندی‌ها">
              <h4 className="mb-3 text-sm font-semibold">دسته‌بندی‌ها</h4>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href="/browse-specialists" title="طراحی وب‌سایت">طراحی وب</a></li>
                <li><a href="/browse-specialists" title="اپلیکیشن موبایل">اپلیکیشن موبایل</a></li>
                <li><a href="/browse-specialists" title="تولید محتوا">تولید محتوا</a></li>
                <li><a href="/browse-specialists" title="خدمات خانگی">خدمات خانگی</a></li>
              </ul>
            </nav>
            <nav aria-label="پشتیبانی">
              <h4 className="mb-3 text-sm font-semibold">پشتیبانی</h4>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href="/guide" title="راهنمای استفاده">راهنما</a></li>
                <li><a href="/faq" title="سوالات متداول">سوالات متداول</a></li>
                <li><a href="#contact" title="تماس با ما">تماس با ما</a></li>
                <li><a href="/terms" title="قوانین و مقررات">قوانین و مقررات</a></li>
              </ul>
            </nav>
          </div>
        </div>
      </noscript>
    </footer>
  );
}
