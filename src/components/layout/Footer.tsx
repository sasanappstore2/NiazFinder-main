'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useState, useEffect } from 'react';
import {
  LocateFixed,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Twitter,
  Linkedin,
  ExternalLink,
  ArrowUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import type { AppView } from '@/lib/types';
import { FOOTER_LINK_GROUPS } from '@/config/navigation';
import { SITE_LABELS } from '@/config/site-labels';
import { legacyViewToPath, routeBuilder } from '@/config/routes';

import { Separator } from '@/components/ui/separator';

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
      { label: SITE_LABELS.home, view: 'home', title: `بازگشت به ${SITE_LABELS.siteName}` },
      { label: SITE_LABELS.postNeed, view: 'post-need', title: SITE_LABELS.postNeed },
      {
        label: SITE_LABELS.marketplaceNeeds,
        view: 'browse-requests',
        title: SITE_LABELS.marketplaceNeeds,
      },
      {
        label: SITE_LABELS.marketplaceBusiness,
        view: 'browse-specialists',
        title: SITE_LABELS.marketplaceBusiness,
      },
      { label: SITE_LABELS.pricing, view: 'pricing', title: SITE_LABELS.pricing },
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
      { label: 'راهنما', href: routeBuilder.help(), title: 'راهنمای استفاده از نیاز فایندر' },
      { label: 'سوالات متداول', href: routeBuilder.help(), title: 'پاسخ سوالات رایج کاربران' },
      { label: 'تماس با ما', href: '#contact', title: 'اطلاعات تماس با تیم پشتیبانی' },
      { label: 'قوانین و مقررات', href: '/terms', title: 'قوانین و مقررات استفاده از سرویس' },
    ],
  },
];

// ============ Social Links ============
const SOCIAL_LINKS = [
  { label: 'اینستاگرام', icon: Instagram, href: 'https://instagram.com/needfinder', title: 'ما را در اینستاگرام دنبال کنید' },
  { label: 'توییتر', icon: Twitter, href: 'https://twitter.com/needfinder', title: 'ما را در توییتر دنبال کنید' },
  { label: 'لینکدین', icon: Linkedin, href: 'https://linkedin.com/company/needfinder', title: 'ما را در لینکدین دنبال کنید' },
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
  /** Add bottom padding for floating mobile nav */
  withMobileNav?: boolean;
}

export function Footer({ compact = false, withMobileNav = true }: FooterProps) {
  const { navigateTo } = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  const currentYear = new Date().getFullYear();

  const footerNavClass = cn(withMobileNav && 'footer-with-mobile-nav');

  // ============ Compact Footer (non-home pages) ============
  if (compact) {
    return (
      <footer id="footer" className={cn(footerNavClass, 'bg-card/30')} role="contentinfo" itemScope itemType="https://schema.org/WPFooter">
        <div className="page-container py-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2" itemScope itemType="https://schema.org/Organization">
              <LocateFixed className="size-4 text-primary" />
              <span className="text-sm font-bold text-primary" itemProp="name">
                {SITE_NAME}
              </span>
              <meta itemProp="url" content="/" />
            </div>

            <nav className="flex items-center gap-4" aria-label="پاورقی" role="navigation">
              <a
                href={routeBuilder.home()}
                data-view="home"
                data-href={routeBuilder.home()}
                title={SITE_LABELS.home}
                onClick={(e) => handleLinkClick(e, { label: SITE_LABELS.home, view: 'home', title: SITE_LABELS.home })}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                {SITE_LABELS.home}
              </a>
              <a
                href={routeBuilder.needNew()}
                data-view="post-need"
                data-href={routeBuilder.needNew()}
                title={SITE_LABELS.postNeed}
                onClick={(e) => handleLinkClick(e, { label: SITE_LABELS.postNeed, view: 'post-need', title: SITE_LABELS.postNeed })}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                {SITE_LABELS.postNeed}
              </a>
              <a
                href={routeBuilder.browseAll({ type: 'need' })}
                data-view="browse-requests"
                data-href={routeBuilder.browseAll({ type: 'need' })}
                title={SITE_LABELS.marketplaceNeeds}
                onClick={(e) => handleLinkClick(e, { label: SITE_LABELS.marketplaceNeeds, view: 'browse-requests', title: SITE_LABELS.marketplaceNeeds })}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                {SITE_LABELS.marketplaceNeeds}
              </a>
              <a
                href={routeBuilder.browseAll({ type: 'business' })}
                data-view="browse-specialists"
                data-href={routeBuilder.browseAll({ type: 'business' })}
                title={SITE_LABELS.marketplaceBusiness}
                onClick={(e) => handleLinkClick(e, { label: SITE_LABELS.marketplaceBusiness, view: 'browse-specialists', title: SITE_LABELS.marketplaceBusiness })}
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                {SITE_LABELS.marketplaceBusiness}
              </a>
              <a
                href="/#contact"
                data-href="/#contact"
                title="تماس با ما"
                className="text-xs text-muted-foreground transition-colors duration-200 hover:text-primary hover:underline decoration-primary/30 underline-offset-2"
              >
                تماس با ما
              </a>
            </nav>

            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} {SITE_NAME}
            </p>
          </div>
        </div>

        <noscript>
          <div className="page-container py-3">
            <nav className="flex flex-wrap items-center justify-center gap-4 text-xs" aria-label="لینک‌های پایین صفحه">
              <a href="/" title="صفحه اصلی">صفحه اصلی</a>
              <a href="/post" title="ثبت نیاز">ثبت نیاز</a>
              <a href={routeBuilder.browseAll({ type: 'business' })} title="کسب‌وکارها">کسب‌وکارها</a>
              <a href="/pricing" title="تعرفه‌ها">تعرفه‌ها</a>
              <a href="/#contact" title="تماس با ما">تماس با ما</a>
            </nav>
          </div>
        </noscript>
      </footer>
    );
  }

  // ============ Full Footer (home page) ============
  return (
    <footer id="footer" className={cn(footerNavClass, 'mt-auto footer-glass footer-wave')} role="contentinfo" itemScope itemType="https://schema.org/WPFooter">
      <div className="gradient-line" />

      <div id="footer-contact" className="page-container py-6 sm:py-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {/* Brand — full width on mobile */}
          <div
            id="contact"
            className="col-span-2 lg:col-span-1"
            itemScope
            itemType="https://schema.org/Organization"
          >
            <div className="flex items-center gap-2">
              <LocateFixed className="size-5 text-primary sm:size-6" />
              <span className="text-lg font-bold text-primary sm:text-xl" itemProp="name">
                {SITE_NAME}
              </span>
              <meta itemProp="url" content="/" />
              <meta itemProp="description" content={SITE_DESCRIPTION} />
            </div>
            <p
              className="mt-2 line-clamp-2 max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm"
              itemProp="description"
            >
              {SITE_DESCRIPTION}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.title}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                  >
                    <social.icon className="size-3.5" />
                  </a>
                ))}
              </div>
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                itemScope
                itemType="https://schema.org/ContactPoint"
              >
                {CONTACT_INFO.map((contact) => {
                  const isLink = Boolean(contact.href) && contact.href !== '#';
                  const inner = (
                    <>
                      <contact.icon className="size-3.5 shrink-0 text-primary/70" />
                      <span className="truncate max-w-[140px] sm:max-w-none">{contact.value}</span>
                    </>
                  );
                  return isLink ? (
                    <a
                      key={contact.label}
                      href={contact.href}
                      title={contact.title}
                      className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-primary"
                    >
                      {inner}
                    </a>
                  ) : (
                    <span
                      key={contact.label}
                      title={contact.title}
                      className="inline-flex items-center gap-1"
                    >
                      {inner}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Link columns — 2×2 on mobile */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-2 text-xs font-semibold text-foreground sm:text-sm">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-1.5" role="list">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.view ? (
                      <a
                        href={legacyViewToPath(link.view)}
                        data-view={link.view}
                        data-href={legacyViewToPath(link.view)}
                        title={link.title}
                        onClick={(e) => handleLinkClick(e, link)}
                        className="flex min-h-6 items-center gap-1 py-0.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary sm:text-sm link-underline-animated"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.href ?? '#'}
                        data-href={link.href ?? '#'}
                        title={link.title}
                        className="flex min-h-6 items-center gap-1 py-0.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary sm:text-sm link-underline-animated"
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
                        {(link.href ?? '').startsWith('http') && (
                          <ExternalLink className="size-3" />
                        )}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn('back-to-top-btn hidden', showBackToTop && 'visible')}
        aria-hidden
        tabIndex={-1}
      >
        <ArrowUp className="size-5" />
      </button>

      <Separator />
      <div className="page-container py-3 sm:py-4">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-3">
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

      <noscript>
        <div className="page-container border-t border-border py-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h2 className="mb-3 text-sm font-semibold">نیاز فایندر</h2>
              <p className="text-sm text-muted-foreground">{SITE_DESCRIPTION}</p>
              <p className="mt-2 text-sm text-muted-foreground">ایمیل: info@needfinder.ir</p>
              <p className="text-sm text-muted-foreground">تلفن: ۰۲۱-۹۱۰۰۰۰۰۰</p>
            </div>
            <nav aria-label="دسترسی سریع">
              <h2 className="mb-3 text-sm font-semibold">دسترسی سریع</h2>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href="/" title="صفحه اصلی نیاز فایندر">صفحه اصلی</a></li>
                <li><a href="/post" title="ثبت نیاز جدید">ثبت نیاز</a></li>
                <li><a href={routeBuilder.browseAll({ type: 'business' })} title="کسب‌وکارها حرفه‌ای">کسب‌وکارها</a></li>
                <li><a href="/pricing" title="تعرفه‌ها و طرح‌های اشتراک">تعرفه‌ها</a></li>
              </ul>
            </nav>
            <nav aria-label="دسته‌بندی‌ها">
              <h2 className="mb-3 text-sm font-semibold">دسته‌بندی‌ها</h2>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href={routeBuilder.browseAll({ type: 'business' })} title="طراحی وب‌سایت">طراحی وب</a></li>
                <li><a href={routeBuilder.browseAll({ type: 'business' })} title="اپلیکیشن موبایل">اپلیکیشن موبایل</a></li>
                <li><a href={routeBuilder.browseAll({ type: 'business' })} title="تولید محتوا">تولید محتوا</a></li>
                <li><a href={routeBuilder.browseAll({ type: 'business' })} title="خدمات خانگی">خدمات خانگی</a></li>
              </ul>
            </nav>
            <nav aria-label="پشتیبانی">
              <h2 className="mb-3 text-sm font-semibold">پشتیبانی</h2>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href={routeBuilder.help()} title="راهنمای استفاده">راهنما</a></li>
                <li><a href={routeBuilder.help()} title="سوالات متداول">سوالات متداول</a></li>
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
