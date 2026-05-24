'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useState } from 'react';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';

const stats = [
  { value: '۱۰,۰۰۰+', label: 'کسب‌وکار فعال' },
  { value: '۵۰,۰۰۰+', label: 'نیاز ثبت شده' },
  { value: '۹۸٪', label: 'رضایت کاربران' },
];

export function HeroSection() {
  const { navigateTo } = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigateTo('browse-requests', { query: searchQuery });
    }
  };

  return (
    <section id="hero" className="relative overflow-hidden hero-gradient" aria-label="بخش اصلی" itemScope itemType="https://schema.org/WPHeader">
      <div className="absolute inset-0 pattern-overlay" aria-hidden="true" />

      <div className="relative container-default mx-auto px-5 md:px-8 py-20 md:py-32">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-5 py-2 text-label font-semibold text-primary" itemProp="about">
            پلتفرم هوشمند اتصال نیاز به کسب‌وکار
          </span>

          {/* Heading */}
          <h1 className="mb-6 max-w-4xl text-display tracking-tight" itemProp="headline">
            نیازت رو ثبت کن،
            <br />
            <span className="text-gradient">بهترین کسب‌وکار رو پیدا کن</span>
          </h1>

          {/* Subheading */}
          <p className="mb-10 max-w-2xl text-body leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed" itemProp="description">
            پلتفرم هوشمند اتصال نیاز به کسب‌وکار. هزاران کسب‌وکار آماده خدمت‌رسانی به شما هستند.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8 w-full max-w-xl" role="search" itemScope itemType="https://schema.org/SearchAction">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="size-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نوع خدمت یا تخصص خود را جستجو کنید..."
                  className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  autoComplete="off"
                  aria-label="جستجوی خدمات"
                  itemProp="query-input"
                />
              </div>
              <Button
                type="submit"
                className="h-10 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all 150ms ease"
                data-href="/browse?type=need"
                title="جستجوی خدمات و کسب‌وکارها"
              >
                جستجو
              </Button>
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => navigateTo('post-need')}
              className="h-12 rounded-xl px-8 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all 150ms ease"
              data-href="/post"
              title="ثبت نیاز رایگان - نیاز خود را به کسب‌وکارها معرفی کنید"
            >
              <Plus className="size-5" aria-hidden="true" />
              <span>ثبت نیاز رایگان</span>
            </Button>
            <Button
              onClick={() => navigateTo('browse-specialists')}
              variant="outline"
              className="h-12 rounded-xl border-border/60 bg-card/50 px-8 text-base font-semibold transition-all 150ms ease"
              data-href="/browse?type=business"
              title="جستجوی کسب‌وکارها - مشاهده پروفایل کسب‌وکارها برتر"
            >
              <span>جستجوی کسب‌وکار</span>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Divider */}
          <div className="mt-14 w-full max-w-md gradient-line" aria-hidden="true" />

          {/* Stats */}
          <div className="py-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12" itemScope itemType="https://schema.org/Organization" itemProp="provider">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{stat.value}</span>
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-md gradient-line" aria-hidden="true" />
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h1>نیاز فایندر - پلتفرم هوشمند اتصال نیاز به کسب‌وکار</h1>
          <p>نیازت رو ثبت کن، بهترین کسب‌وکار رو پیدا کن. پلتفرم هوشمند اتصال نیاز به کسب‌وکار با بیش از ۱۰,۰۰۰ کسب‌وکار فعال و ۵۰,۰۰۰ نیاز ثبت شده و ۹۸٪ رضایت کاربران.</p>
        </div>
      </noscript>
    </section>
  );
}
