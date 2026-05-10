'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, ArrowLeft, Sparkles, FileText, Wrench, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const floatingCards = [
  { icon: <Wrench className="size-5 text-emerald-600" />, title: 'تعمیر لپ‌تاپ', budget: '۲ میلیون تومان', delay: 0 },
  { icon: <Sparkles className="size-5 text-amber-500" />, title: 'طراحی لوگو', budget: '۵ میلیون تومان', delay: 0.3 },
  { icon: <FileText className="size-5 text-primary" />, title: 'تولید محتوا', budget: '۳ میلیون تومان', delay: 0.6 },
  { icon: <BookOpen className="size-5 text-rose-500" />, title: 'مشاوره حقوقی', budget: 'ساعتی', delay: 0.9 },
];

const stats = [
  { value: '۱۰,۰۰۰+', label: 'متخصص فعال' },
  { value: '۵۰,۰۰۰+', label: 'نیاز ثبت شده' },
  { value: '۹۸٪', label: 'رضایت کاربران' },
];

export function HeroSection() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigateTo('browse-requests', { query: searchQuery });
    }
  };

  return (
    <section className="relative overflow-hidden hero-gradient">
      {/* Pattern overlay */}
      <div className="absolute inset-0 pattern-overlay" />

      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div variants={item}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              پلتفرم هوشمند اتصال نیاز به متخصص
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={item}
            className="mb-6 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
          >
            نیازت رو ثبت کن،
            <br />
            <span className="bg-gradient-to-l from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
              بهترین متخصص رو پیدا کن
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={item}
            className="mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            پلتفرم هوشمند اتصال نیاز به متخصص. هزاران متخصص آماده خدمت‌رسانی به شما هستند.
          </motion.p>

          {/* Search Bar */}
          <motion.form
            variants={item}
            onSubmit={handleSearch}
            className="mb-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg sm:gap-3"
          >
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search className="size-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="نوع خدمت، تخصص یا نیاز خود را جستجو کنید..."
                className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              type="submit"
              className="h-10 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              جستجو
            </Button>
          </motion.form>

          {/* CTA Buttons */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => navigateTo('post-need')}
              className="h-12 rounded-xl px-8 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
            >
              <Plus className="size-5" />
              ثبت نیاز رایگان
            </Button>
            <Button
              onClick={() => navigateTo('browse-specialists')}
              variant="outline"
              className="h-12 rounded-xl px-8 text-base font-semibold"
            >
              جستجوی متخصص
              <ArrowLeft className="size-5" />
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={item}
            className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Floating Cards */}
          <motion.div
            variants={item}
            className="mt-16 hidden w-full max-w-4xl lg:block"
          >
            <div className="grid grid-cols-4 gap-4">
              {floatingCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: card.delay + 0.5, ease: 'easeOut' }}
                  className="group cursor-pointer"
                >
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      {card.icon}
                    </div>
                    <p className="mb-1 text-sm font-semibold">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{card.budget}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
