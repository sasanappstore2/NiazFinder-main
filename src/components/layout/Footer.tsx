'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LocateFixed,
  Mail,
  Phone,
  MapPin,
  Send,
  Heart,
  Instagram,
  Twitter,
  Linkedin,
  ExternalLink,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import type { AppView } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// ============ Footer Link ============
interface FooterLinkItem {
  label: string;
  view?: AppView;
  href?: string;
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
      { label: 'صفحه اصلی', view: 'home' },
      { label: 'ثبت نیاز', view: 'post-need' },
      { label: 'متخصص‌ها', view: 'browse-specialists' },
      { label: 'نیازها', view: 'browse-requests' },
    ],
  },
  {
    title: 'دسته‌بندی‌ها',
    links: [
      { label: 'طراحی وب', view: 'browse-specialists' },
      { label: 'اپلیکیشن موبایل', view: 'browse-specialists' },
      { label: 'تولید محتوا', view: 'browse-specialists' },
      { label: 'خدمات خانگی', view: 'browse-specialists' },
    ],
  },
  {
    title: 'پشتیبانی',
    links: [
      { label: 'راهنما', href: '#' },
      { label: 'سوالات متداول', href: '#' },
      { label: 'تماس با ما', href: '#' },
      { label: 'قوانین و مقررات', href: '#' },
    ],
  },
];

// ============ Social Links ============
const SOCIAL_LINKS = [
  { label: 'Instagram', icon: Instagram, href: '#' },
  { label: 'Twitter', icon: Twitter, href: '#' },
  { label: 'LinkedIn', icon: Linkedin, href: '#' },
];

// ============ Contact Info ============
const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'ایمیل',
    value: 'info@needfinder.ir',
    href: 'mailto:info@needfinder.ir',
  },
  {
    icon: Phone,
    label: 'تلفن',
    value: '۰۲۱-۹۱۰۰۰۰۰۰',
    href: 'tel:+982191000000',
  },
  {
    icon: MapPin,
    label: 'آدرس',
    value: 'تهران، خیابان ولیعصر',
    href: '#',
  },
];

// ============ Animation Variants ============
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

// ============ Footer Component ============
interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
  const { navigateTo } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleLinkClick = (link: FooterLinkItem) => {
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
      <footer className="bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <LocateFixed className="size-4 text-primary" />
              <span className="text-sm font-bold text-primary">{SITE_NAME}</span>
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLinkClick({ label: 'صفحه اصلی', view: 'home' })}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                صفحه اصلی
              </button>
              <button
                onClick={() => handleLinkClick({ label: 'ثبت نیاز', view: 'post-need' })}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                ثبت نیاز
              </button>
              <button
                onClick={() => handleLinkClick({ label: 'متخصص‌ها', view: 'browse-specialists' })}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                متخصص‌ها
              </button>
              <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                تماس با ما
              </a>
            </div>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} {SITE_NAME}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // ============ Full Footer (home page) ============
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      {/* Newsletter Section */}
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-start">
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-foreground">
                از آخرین خدمات و تخفیف‌ها باخبر شوید
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                ایمیل خود را وارد کنید تا از جدیدترین اخبار و فرصت‌های ویژه مطلع شوید.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full max-w-sm gap-2">
              <Input
                type="email"
                placeholder="ایمیل شما..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 flex-1"
                dir="ltr"
              />
              <Button type="submit" size="default" className="h-10 px-5">
                {isSubscribed ? (
                  <span className="flex items-center gap-2">
                    <Heart className="size-4" />
                    ثبت شد
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="size-4" />
                    عضویت
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div id="footer-contact" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Section */}
          <motion.div
            custom={0}
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="lg:col-span-4"
          >
            <div className="flex items-center gap-2">
              <LocateFixed className="size-6 text-primary" />
              <span className="text-xl font-bold text-primary">{SITE_NAME}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
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
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>

            {/* Contact Info */}
            <div className="mt-6 flex flex-col gap-3">
              {CONTACT_INFO.map((contact) => (
                <a
                  key={contact.label}
                  href={contact.href}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <contact.icon className="size-4 shrink-0 text-primary/70" />
                  <span>{contact.value}</span>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Link Columns */}
          {FOOTER_COLUMNS.map((column, colIndex) => (
            <motion.div
              key={column.title}
              custom={colIndex + 1}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-2 lg:col-start-auto"
            >
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                {column.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.view ? (
                      <button
                        onClick={() => handleLinkClick(link)}
                        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <Separator />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} {SITE_NAME}. تمامی حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              قوانین استفاده
            </a>
            <span className="text-muted-foreground/30">|</span>
            <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              حریم خصوصی
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
