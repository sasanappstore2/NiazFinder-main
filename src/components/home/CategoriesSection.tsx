'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const startTime = performance.now();
    const startVal = 0;
    const endVal = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayed(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {displayed.toLocaleString('fa-IR')}
    </span>
  );
}

export function CategoriesSection() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <section className="relative bg-background py-20 sm:py-24 lg:py-28 overflow-hidden">
      {/* Subtle mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient-bg opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            دسته‌بندی خدمات
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground/80">
            از میان صدها دسته‌بندی، نیاز خود را پیدا کنید
          </p>
        </motion.div>

        {/* Categories Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {CATEGORIES.map((category) => (
            <motion.div key={category.id} variants={item}>
              <Card
                onClick={() => navigateTo('browse-requests', { categoryId: category.id })}
                className="group cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm py-5 transition-all duration-500 ease-out hover:scale-[1.02] hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/8 hover:border-primary/40 dark:hover:border-primary/30"
              >
                <CardContent className="flex items-start gap-4 p-0 px-6">
                  {/* Icon with bounce on hover */}
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/12 to-primary/5 text-2xl shadow-sm transition-all duration-500 group-hover:bg-gradient-to-br group-hover:from-primary/20 group-hover:to-primary/10 group-hover:shadow-md group-hover:shadow-primary/10"
                  >
                    {category.icon}
                  </motion.div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1.5 text-sm font-bold leading-snug line-clamp-1 transition-colors duration-300 group-hover:text-primary">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground/80">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3" />
                        <AnimatedNumber value={category.requestCount} /> نیاز فعال
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" />
                        <AnimatedNumber value={category.specialistCount} /> متخصص
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <Button
            onClick={() => navigateTo('browse-requests')}
            variant="outline"
            className="h-11 rounded-xl border-border/60 bg-card/50 backdrop-blur-sm px-8 transition-all duration-300 hover:shadow-lg hover:bg-card"
          >
            مشاهده همه
            <ArrowLeft className="size-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
