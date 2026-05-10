'use client';

import { motion } from 'framer-motion';
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
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export function CategoriesSection() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <section className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            دسته‌بندی خدمات
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
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
                className="group cursor-pointer border-border/60 bg-card py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <CardContent className="flex items-start gap-4 p-0 px-6">
                  {/* Icon */}
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-2xl transition-colors duration-300 group-hover:bg-primary/15">
                    {category.icon}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold leading-snug line-clamp-1">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3" />
                        {category.requestCount.toLocaleString('fa-IR')} نیاز فعال
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" />
                        {category.specialistCount.toLocaleString('fa-IR')} متخصص
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
            className="h-11 rounded-xl px-8"
          >
            مشاهده همه
            <ArrowLeft className="size-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
