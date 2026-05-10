'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, ArrowLeft, Sparkles, FileText, Wrench, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';

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
  { icon: <Wrench className="size-5 text-emerald-600" />, title: 'تعمیر لپ‌تاپ', budget: '۲ میلیون تومان', delay: 0, bobClass: 'animate-bob-1' },
  { icon: <Sparkles className="size-5 text-amber-500" />, title: 'طراحی لوگو', budget: '۵ میلیون تومان', delay: 0.3, bobClass: 'animate-bob-2' },
  { icon: <FileText className="size-5 text-primary" />, title: 'تولید محتوا', budget: '۳ میلیون تومان', delay: 0.6, bobClass: 'animate-bob-3' },
  { icon: <BookOpen className="size-5 text-rose-500" />, title: 'مشاوره حقوقی', budget: 'ساعتی', delay: 0.9, bobClass: 'animate-bob-4' },
];

const stats = [
  { value: '۱۰,۰۰۰+', label: 'متخصص فعال' },
  { value: '۵۰,۰۰۰+', label: 'نیاز ثبت شده' },
  { value: '۹۸٪', label: 'رضایت کاربران' },
];

const trustedBrands = [
  { name: 'دیجی‌کالا', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  { name: 'اسنپ', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { name: 'وب‌ماندگار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { name: 'ایران‌تلکام', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  { name: 'پارس‌پک', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  { name: 'زرین‌پال', color: 'bg-amber-100 text-yellow-700 dark:bg-amber-900/30 dark:text-yellow-300' },
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

      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 mesh-gradient-bg opacity-60" />

      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />

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

          {/* Search Bar with animated gradient border */}
          <motion.form
            variants={item}
            onSubmit={handleSearch}
            className="relative mb-8 w-full max-w-xl"
          >
            {/* Animated gradient border wrapper */}
            <div className="animate-border-glow rounded-2xl p-[2px]">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg sm:gap-3">
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
              </div>
            </div>
          </motion.form>

          {/* CTA Buttons with shimmer hover */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => navigateTo('post-need')}
              className="group relative h-12 overflow-hidden rounded-xl px-8 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-600/30"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Plus className="size-5 relative z-10" />
              <span className="relative z-10">ثبت نیاز رایگان</span>
            </Button>
            <Button
              onClick={() => navigateTo('browse-specialists')}
              variant="outline"
              className="group relative h-12 overflow-hidden rounded-xl px-8 text-base font-semibold transition-all duration-300 hover:shadow-md"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative z-10">جستجوی متخصص</span>
              <ArrowLeft className="size-5 relative z-10" />
            </Button>
          </motion.div>

          {/* Gradient line above stats */}
          <div className="mt-14 w-full max-w-md gradient-line" />

          {/* Stats */}
          <motion.div
            variants={item}
            className="py-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Gradient line below stats */}
          <div className="w-full max-w-md gradient-line" />

          {/* Floating Cards with bob animation and glass hover */}
          <motion.div
            variants={item}
            className="mt-14 hidden w-full max-w-4xl lg:block"
          >
            <div className="grid grid-cols-4 gap-4">
              {floatingCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: card.delay + 0.5, ease: 'easeOut' }}
                  className={`cursor-pointer ${card.bobClass}`}
                >
                  <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-primary/30 hover:bg-card">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                      {card.icon}
                    </div>
                    <p className="mb-1 text-sm font-semibold">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{card.budget}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Trusted By section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="mt-16 w-full"
          >
            <p className="mb-6 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
              مورد اعتماد برندهای برتر
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {trustedBrands.map((brand, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.7 + i * 0.1 }}
                  className={`flex size-14 items-center justify-center rounded-2xl ${brand.color} text-[10px] font-bold shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-md`}
                >
                  {brand.name}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
