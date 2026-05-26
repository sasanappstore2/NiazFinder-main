'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useEffect } from 'react';
import { ArrowLeft, FileText, Users, Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench, GraduationCap, Bot, Briefcase, Heart, Code, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

// Category icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench, GraduationCap, Bot,
  Briefcase, Heart, Code, Layout: Monitor, Server: Monitor, Layers: Smartphone,
  Apple: Smartphone, FileCode: Code, Paintbrush: Palette, PencilRuler: Pen,
  Laptop: Monitor, Hammer: Wrench, School: GraduationCap, BotIcon: Bot,
  MessageCircle: Bot, Shield: Briefcase, Scale: Briefcase,
};

export function CategoriesSection() {
  const { navigateTo } = useNavigate();
  const categories = useAppStore((s) => s.categories);
  const fetchCategories = useAppStore((s) => s.fetchCategories);

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  return (
    <section id="categories" className="section-padding bg-background" aria-label="دسته‌بندی خدمات" itemScope itemType="https://schema.org/ItemList">
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <h2 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight" itemProp="name">دسته‌بندی خدمات</h2>
            <p className="text-sm md:text-base text-muted-foreground" itemProp="description">از میان صدها دسته‌بندی، نیاز خود را پیدا کنید</p>
          </div>
          <Button
            onClick={() => navigateTo('browse-requests')}
            variant="outline"
            className="hidden sm:inline-flex h-10 rounded-xl border-border/60 px-6 shrink-0 transition-all 150ms ease"
            data-href="/browse?type=need"
            title="مشاهده همه دسته‌بندی‌های خدمات"
          >
            مشاهده همه
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Grid */}
        {categories.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="در حال بارگذاری دسته‌بندی‌ها" role="status">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/80 py-5">
                <CardContent className="flex items-start gap-4 p-0 px-6">
                  <Skeleton className="size-12 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-3 w-14 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const IconComponent = ICON_MAP[category.icon || ''] || Globe;
              return (
                <Card
                  key={category.id}
                  onClick={() => navigateTo('browse-requests', { categoryId: category.slug || category.id })}
                  className="group cursor-pointer border-border/50 bg-card/80 py-5 hover-lift transition-all 150ms ease"
                  data-href={`/need?categoryId=${category.id}`}
                  title={`${category.name} - ${category.requestCount.toLocaleString('fa-IR')} نیاز فعال`}
                  itemScope
                  itemType="https://schema.org/ListItem"
                >
                  <CardContent className="flex items-start gap-4 p-0 px-6">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                      <IconComponent className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1.5 text-sm font-bold leading-snug line-clamp-1 group-hover:text-primary transition-colors 150ms ease" itemProp="name">
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3" aria-hidden="true" />
                          {category.requestCount.toLocaleString('fa-IR')} نیاز فعال
                        </span>
                        {category.specialistCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3" aria-hidden="true" />
                            {category.specialistCount.toLocaleString('fa-IR')} کسب‌وکار
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Mobile View All */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Button
            onClick={() => navigateTo('browse-requests')}
            variant="outline"
            className="h-10 rounded-xl border-border/60 px-6"
            data-href="/browse?type=need"
            title="مشاهده همه دسته‌بندی‌های خدمات"
          >
            مشاهده همه
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>دسته‌بندی خدمات</h2>
          <p>از میان صدها دسته‌بندی شامل کامپیوتر و فناوری اطلاعات، طراحی گرافیک، بازاریابی دیجیتال، آموزش و مشاوره، حقوقی و مالی، ساختمان و عمران، سلامت و زیبایی، خودرو و حمل‌ونقل، نیاز خود را پیدا کنید.</p>
        </div>
      </noscript>
    </section>
  );
}
