'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, ArrowLeft, Sparkles, FileText, Wrench, BookOpen, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, MOCK_SPECIALISTS, MOCK_REQUESTS } from '@/lib/constants';

type SuggestionType = 'category' | 'specialist' | 'request';

interface SearchSuggestion {
  type: SuggestionType;
  text: string;
  icon: string;
  iconComponent: typeof User;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
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

const TYPE_LABELS: Record<SuggestionType, string> = {
  category: 'دسته‌بندی',
  specialist: 'متخصص',
  request: 'نیاز',
};

const TYPE_BADGE_COLORS: Record<SuggestionType, string> = {
  category: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  specialist: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  request: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export function HeroSection() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (searchQuery.trim().length < 2) return [];

    const q = searchQuery.trim().toLowerCase();
    const results: SearchSuggestion[] = [];

    // Categories
    for (const cat of CATEGORIES) {
      if (cat.name.toLowerCase().includes(q) && cat.icon) {
        results.push({ type: 'category', text: cat.name, icon: cat.icon, iconComponent: User });
      }
      if (cat.children) {
        for (const child of cat.children) {
          if (child.name.toLowerCase().includes(q) && child.icon) {
            results.push({ type: 'category', text: child.name, icon: child.icon, iconComponent: User });
          }
        }
      }
    }

    // Specialist skills
    for (const spec of MOCK_SPECIALISTS) {
      for (const skill of spec.skills) {
        if (skill.name.toLowerCase().includes(q)) {
          results.push({
            type: 'specialist',
            text: `${skill.name} — ${spec.displayName}`,
            icon: '👤',
            iconComponent: User,
          });
        }
      }
    }

    // Request titles
    for (const req of MOCK_REQUESTS) {
      if (req.title.toLowerCase().includes(q)) {
        results.push({ type: 'request', text: req.title, icon: '📋', iconComponent: FileText });
      }
    }

    // Deduplicate by text
    const seen = new Set<string>();
    return results.filter((s) => {
      const key = s.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [searchQuery]);

  const handleSelectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    const queryText = suggestion.text.includes('—') ? suggestion.text.split('—')[0].trim() : suggestion.text;
    setSearchQuery(queryText);
    setShowDropdown(false);
    navigateTo('browse-requests', { query: queryText });
  }, [navigateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (searchQuery.trim()) {
      navigateTo('browse-requests', { query: searchQuery });
    }
  };

  // Click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && showDropdown) {
        e.stopPropagation();
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [showDropdown]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex]);
    }
  };

  const hasDropdown = showDropdown && suggestions.length > 0;

  return (
    <section className="relative overflow-hidden hero-gradient">
      {/* Pattern overlay */}
      <div className="absolute inset-0 pattern-overlay" />

      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 mesh-gradient-bg opacity-60" />

      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-emerald-400/15 blur-[100px] animate-pulse" />
      <div className="absolute -bottom-40 -right-40 size-[500px] rounded-full bg-amber-400/12 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[700px] rounded-full bg-primary/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div variants={item}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-5 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/5 backdrop-blur-sm">
              <Sparkles className="size-4" />
              پلتفرم هوشمند اتصال نیاز به متخصص
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={item}
            className="mb-6 max-w-4xl text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
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
            className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground/90 sm:text-lg sm:leading-relaxed"
          >
            پلتفرم هوشمند اتصال نیاز به متخصص. هزاران متخصص آماده خدمت‌رسانی به شما هستند.
          </motion.p>

          {/* Search Bar with animated gradient border */}
          <motion.form
            variants={item}
            onSubmit={handleSearch}
            className="relative mb-8 w-full max-w-xl"
          >
            <div ref={wrapperRef} className="relative">
              {/* Animated gradient border wrapper */}
              <div className="animate-border-glow rounded-2xl p-[2px]">
                <div className={`flex items-center gap-2 rounded-2xl border bg-card/90 backdrop-blur-xl p-2.5 shadow-xl shadow-black/[0.06] sm:gap-3 transition-all duration-300 ${hasDropdown ? 'border-emerald-300 dark:border-emerald-700 shadow-emerald-500/10' : 'border-border/80 hover:shadow-emerald-500/5'}`}>
                  <div className="flex flex-1 items-center gap-2 px-3">
                    <Search className="size-5 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        setActiveIndex(-1);
                      }}
                      onFocus={() => {
                        if (searchQuery.trim().length >= 2) setShowDropdown(true);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="نوع خدمت، تخصص یا نیاز خود را جستجو کنید..."
                      className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-10 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/30"
                  >
                    جستجو
                  </Button>
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {hasDropdown && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute top-full start-0 end-0 z-50 mt-2 overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-2xl shadow-black/10 backdrop-blur-xl"
                  >
                    <ul className="py-2">
                      {suggestions.map((suggestion, idx) => {
                        const IconComp = suggestion.iconComponent;
                        const isActive = idx === activeIndex;
                        return (
                          <li key={`${suggestion.type}-${idx}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                                isActive
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              {/* Icon */}
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-base">
                                {suggestion.type === 'category'
                                  ? suggestion.icon
                                  : <IconComp className="size-4 text-muted-foreground" />
                                }
                              </span>

                              {/* Text */}
                              <span className="flex-1 truncate text-sm font-medium text-foreground">
                                {suggestion.text}
                              </span>

                              {/* Type badge */}
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[suggestion.type]}`}>
                                {TYPE_LABELS[suggestion.type]}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Footer hint */}
                    <div className="border-t border-border/50 bg-muted/30 px-4 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        برای انتخاب از کلیدهای بالا/پایین و Enter استفاده کنید
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.form>

          {/* CTA Buttons with shimmer hover */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => navigateTo('post-need')}
              className="group relative h-12 overflow-hidden rounded-xl px-8 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Plus className="size-5 relative z-10" />
              <span className="relative z-10">ثبت نیاز رایگان</span>
            </Button>
            <Button
              onClick={() => navigateTo('browse-specialists')}
              variant="outline"
              className="group relative h-12 overflow-hidden rounded-xl border-border/60 bg-card/50 backdrop-blur-sm px-8 text-base font-semibold transition-all duration-300 hover:shadow-lg hover:bg-card hover:-translate-y-0.5 active:translate-y-0"
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
                <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{stat.value}</span>
                <span className="text-sm font-medium text-muted-foreground/80">{stat.label}</span>
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
            <div className="grid grid-cols-4 gap-5">
              {floatingCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: card.delay + 0.5, ease: 'easeOut' }}
                  className={`cursor-pointer ${card.bobClass}`}
                >
                  <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-5 shadow-lg shadow-black/[0.04] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-primary/25 hover:bg-card/90">
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 transition-all duration-300 hover:scale-110 hover:shadow-md hover:shadow-primary/10">
                      {card.icon}
                    </div>
                    <p className="mb-1 text-sm font-bold leading-snug">{card.title}</p>
                    <p className="text-xs font-medium text-muted-foreground/80">{card.budget}</p>
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
            <p className="mb-6 text-xs font-semibold tracking-[0.15em] text-muted-foreground/50 uppercase">
              مورد اعتماد برندهای برتر
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {trustedBrands.map((brand, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.7 + i * 0.1 }}
                  className={`flex size-14 items-center justify-center rounded-2xl ${brand.color} text-[10px] font-bold shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-black/5`}
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
