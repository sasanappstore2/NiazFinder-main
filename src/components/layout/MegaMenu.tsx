'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3X3,
  ChevronLeft,
  Monitor,
  Smartphone,
  BrainCircuit,
  Palette,
  PenTool,
  Home,
  Wrench,
  GraduationCap,
  Globe,
  Code,
  Server,
  Apple,
  Layers,
  MessageSquare,
  Image,
  Cpu,
  Pen,
  Figma,
  Frame,
  FileText,
  Search,
  Languages,
  Sparkles,
  Droplets,
  Zap,
  Laptop,
  Car,
  Plane,
  BookOpen,
  Scale,
  ArrowLeft,
  Flame,
  Plus,
  TrendingUp,
  Users,
  Star,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import { useAppRouter } from '@/hooks/use-router';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

// ============ Icon Mapping ============
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  '1': Monitor,
  '2': Smartphone,
  '3': PenTool,
  '4': Palette,
  '5': Home,
  '6': Wrench,
  '7': GraduationCap,
  '8': BrainCircuit,
};

const SUBCATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  '1-1': Globe,
  '1-2': Code,
  '1-3': Server,
  '2-1': Smartphone,
  '2-2': Apple,
  '2-3': Layers,
  '3-1': FileText,
  '3-2': Search,
  '3-3': Languages,
  '4-1': Pen,
  '4-2': Figma,
  '4-3': Frame,
  '5-1': Sparkles,
  '5-2': Droplets,
  '5-3': Zap,
  '6-1': Smartphone,
  '6-2': Laptop,
  '6-3': Car,
  '7-1': Plane,
  '7-2': BookOpen,
  '7-3': Scale,
  '8-1': MessageSquare,
  '8-2': Image,
  '8-3': Cpu,
};

// ============ Group Icon Mapping ============
const GROUP_ICONS: Record<string, LucideIcon> = {
  'فناوری و دیجیتال': BrainCircuit,
  'طراحی و محتوا': Palette,
  'خدمات': Wrench,
};

// ============ Mega Menu Groups ============
interface MegaMenuCategory {
  id: string;
  name: string;
  slug: string;
  icon: LucideIcon;
  requestCount: number;
  specialistCount: number;
  children: {
    id: string;
    name: string;
    slug: string;
    icon: LucideIcon;
    requestCount: number;
    specialistCount: number;
  }[];
}

interface MegaMenuGroup {
  title: string;
  icon: LucideIcon;
  categories: MegaMenuCategory[];
}

function buildMenuGroups(): MegaMenuGroup[] {
  const catMap: Record<string, MegaMenuCategory> = {};
  for (const cat of CATEGORIES) {
    const IconComponent = CATEGORY_ICON_MAP[cat.id] || Monitor;
    catMap[cat.id] = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: IconComponent,
      requestCount: cat.requestCount,
      specialistCount: cat.specialistCount,
      children: (cat.children || []).map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        icon: SUBCATEGORY_ICON_MAP[child.id] || Code,
        requestCount: child.requestCount,
        specialistCount: child.specialistCount,
      })),
    };
  }

  return [
    {
      title: 'فناوری و دیجیتال',
      icon: BrainCircuit,
      categories: [catMap['1'], catMap['2'], catMap['8']],
    },
    {
      title: 'طراحی و محتوا',
      icon: Palette,
      categories: [catMap['4'], catMap['3']],
    },
    {
      title: 'خدمات',
      icon: Wrench,
      categories: [catMap['5'], catMap['6'], catMap['7']],
    },
  ];
}

const MEGA_MENU_GROUPS = buildMenuGroups();

// ============ Popular Categories ============
const POPULAR_CATEGORIES = [
  { id: '5', name: 'خدمات خانگی', gradient: 'from-emerald-500/15 to-teal-500/10', textColor: 'text-emerald-600 dark:text-emerald-400', requestCount: 456 },
  { id: '4', name: 'طراحی گرافیک', gradient: 'from-violet-500/15 to-purple-500/10', textColor: 'text-violet-600 dark:text-violet-400', requestCount: 267 },
];

// ============ Animation Variants ============
const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

const columnVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, staggerChildren: 0.025 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18 } },
};

const subPanelVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.1 } },
};

const popularPanelVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, delay: 0.08 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.1 } },
};

// ============ Format Number to Persian ============
function toPersianNumber(n: number): string {
  return n.toLocaleString('fa-IR');
}

// ============ Desktop Mega Menu ============
function DesktopMegaMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [hoveredCategory, setHoveredCategory] = useState<MegaMenuCategory | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { push } = useAppRouter();

  const handleCategoryClick = useCallback(
    (cat: MegaMenuCategory) => {
      setHoveredCategory(null);
      push('browse-requests');
      onClose();
    },
    [push, onClose],
  );

  const handleSubcategoryClick = useCallback(
    (cat: MegaMenuCategory) => {
      setHoveredCategory(null);
      push('browse-requests');
      onClose();
    },
    [push, onClose],
  );

  const handleMouseEnter = useCallback((cat: MegaMenuCategory | null) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHoveredCategory(cat);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 150);
  }, []);

  const handleCloseWithReset = useCallback(() => {
    setHoveredCategory(null);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    onClose();
  }, [onClose]);

  const getCategoryData = (id: string) => {
    return CATEGORIES.find((c) => c.id === id);
  };

  // Get total stats from all categories
  const totalRequests = CATEGORIES.reduce((sum, c) => sum + c.requestCount, 0);
  const totalSpecialists = CATEGORIES.reduce((sum, c) => sum + c.specialistCount, 0);

  return (
    <motion.div
      ref={containerRef}
      variants={dropdownVariants}
      initial="hidden"
      animate={isOpen ? 'visible' : 'hidden'}
      exit="exit"
      onMouseLeave={handleMouseLeave}
      className="absolute inset-x-0 top-full z-50 mx-auto mt-1 w-[calc(100vw-2rem)] max-w-5xl px-0 sm:w-auto lg:max-w-6xl xl:max-w-7xl"
    >
      <div className="mega-menu-backdrop overflow-hidden rounded-xl border border-border bg-popover shadow-xl shadow-black/[0.08] backdrop-blur-sm">
        <div className="flex">
          {/* Main Columns */}
          <div className="flex flex-1 divide-x divide-border">
            {MEGA_MENU_GROUPS.map((group, groupIndex) => {
              const GroupIcon = group.icon;
              return (
                <motion.div
                  key={group.title}
                  variants={columnVariants}
                  className={cn(
                    'flex-1 px-3 py-4 sm:px-4 sm:py-5',
                    groupIndex === 0 && 'pe-4 sm:pe-5',
                    groupIndex === MEGA_MENU_GROUPS.length - 1 && 'ps-4 sm:ps-5',
                  )}
                >
                  {/* Group Header */}
                  <div className="mb-2.5 flex items-center gap-2 pb-2 sm:mb-3">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                      <GroupIcon className="size-3.5 text-primary" />
                    </div>
                    <h3 className="text-xs font-bold text-foreground sm:text-sm">
                      {group.title}
                    </h3>
                  </div>

                  {/* Category Items */}
                  <motion.div variants={columnVariants} className="flex flex-col gap-0.5">
                    {group.categories.map((cat) => {
                      const CatIcon = cat.icon;
                      const isHovered = hoveredCategory?.id === cat.id;

                      return (
                        <motion.button
                          key={cat.id}
                          variants={itemVariants}
                          onMouseEnter={() => handleMouseEnter(cat)}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => handleCategoryClick(cat)}
                          className={cn(
                            'mega-menu-item-glow group/cat flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-right transition-all duration-150 sm:gap-3 sm:px-3 sm:py-2.5',
                            isHovered
                              ? 'bg-primary/10 text-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                          )}
                        >
                          <CatIcon
                            className={cn(
                              'mega-icon-hover size-3.5 shrink-0 transition-colors sm:size-4',
                              isHovered ? 'text-primary' : 'text-muted-foreground/60 group-hover/cat:text-foreground/80',
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium sm:text-sm">
                              {cat.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground/60 sm:text-xs">
                              {toPersianNumber(cat.requestCount)}
                            </span>
                            <ChevronLeft className="size-3 text-muted-foreground/40 transition-transform group-hover/cat:-translate-x-0.5 group-hover/cat:text-muted-foreground/60" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Side Panel — only visible on xl+ screens */}
          <div className="hidden xl:block">
            <AnimatePresence mode="wait">
              {hoveredCategory && (
                <motion.div
                  key={hoveredCategory.id}
                  variants={subPanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-56 border-s border-border bg-accent/30 px-4 py-5 backdrop-blur-sm 2xl:w-64"
                  onMouseEnter={() => handleMouseEnter(hoveredCategory)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <hoveredCategory.icon className="size-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">
                      {hoveredCategory.name}
                    </h4>
                  </div>

                  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                    {toPersianNumber(hoveredCategory.requestCount)} نیاز فعال و{' '}
                    {toPersianNumber(hoveredCategory.specialistCount)} متخصص آماده همکاری
                  </p>

                  <div className="flex flex-col gap-0.5">
                    {hoveredCategory.children.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubcategoryClick(hoveredCategory)}
                          className="group/sub flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-right transition-colors hover:bg-accent"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background/60 transition-colors group-hover/sub:bg-background">
                            <SubIcon className="size-3.5 text-muted-foreground/70 transition-colors group-hover/sub:text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-muted-foreground transition-colors group-hover/sub:text-foreground">
                              {sub.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground/50">
                              {toPersianNumber(sub.requestCount)} نیاز
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mega-gradient-divider my-3" />

                  <button
                    onClick={() => handleSubcategoryClick(hoveredCategory)}
                    className="group flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/10"
                  >
                    <span>مشاهده همه</span>
                    <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
                  </button>
                </motion.div>
              )}

              {!hoveredCategory && (
                <motion.div
                  variants={popularPanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-56 border-s border-border px-4 py-5 2xl:w-64"
                >
                  {/* Popular badge */}
                  <div className="mb-3 flex items-center gap-2">
                    <Flame className="size-4 text-orange-500" />
                    <h4 className="text-sm font-bold text-foreground">
                      دسته‌بندی محبوب
                    </h4>
                  </div>

                  {/* Popular category cards */}
                  <div className="flex flex-col gap-2">
                    {POPULAR_CATEGORIES.map((pop) => {
                      const catData = getCategoryData(pop.id);
                      if (!catData) return null;
                      const CatIcon = CATEGORY_ICON_MAP[pop.id] || Monitor;

                      return (
                        <button
                          key={pop.id}
                          onClick={() => {
                            setHoveredCategory(null);
                            push('browse-requests');
                            handleCloseWithReset();
                          }}
                          className={cn(
                            'mega-popular-shimmer group/pop rounded-lg bg-gradient-to-br p-3 text-right transition-all hover:scale-[1.02] hover:shadow-sm',
                            pop.gradient,
                          )}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <CatIcon className={cn('size-3.5', pop.textColor)} />
                            <span className="text-xs font-bold text-foreground sm:text-sm">
                              {pop.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="h-5 rounded-md px-1.5 text-[10px] font-medium"
                            >
                              {toPersianNumber(pop.requestCount)} نیاز
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="h-5 rounded-md px-1.5 text-[10px] font-medium"
                            >
                              {toPersianNumber(catData.specialistCount)} متخصص
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mega-gradient-divider my-3" />

                  {/* CTA Button */}
                  <button
                    onClick={() => {
                      push('post-need');
                      handleCloseWithReset();
                    }}
                    className="group flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    <Plus className="size-3.5" />
                    <span>ثبت نیاز رایگان</span>
                  </button>

                  {/* Quick stats */}
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg bg-accent/50 px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="size-3 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          {toPersianNumber(totalRequests)}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground/60">نیاز فعال</div>
                    </div>
                    <div className="rounded-lg bg-accent/50 px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="size-3 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          {toPersianNumber(totalSpecialists)}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground/60">متخصص</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom quick-stats bar — visible on lg/xl when side panel is hidden */}
        <div className="xl:hidden">
          <div className="mega-gradient-divider" />
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="size-3.5 text-amber-500" />
                <span className="font-medium text-foreground">
                  {POPULAR_CATEGORIES[0].name}
                </span>
                <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                  {toPersianNumber(POPULAR_CATEGORIES[0].requestCount)} نیاز
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="size-3.5 text-violet-500" />
                <span className="font-medium text-foreground">
                  {POPULAR_CATEGORIES[1].name}
                </span>
                <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                  {toPersianNumber(POPULAR_CATEGORIES[1].requestCount)} نیاز
                </Badge>
              </div>
            </div>
            <button
              onClick={() => {
                push('post-need');
                handleCloseWithReset();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Plus className="size-3" />
              <span>ثبت نیاز رایگان</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ Mobile Mega Menu ============
function MobileMegaMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { push } = useAppRouter();

  const handleNavigate = useCallback(
    (cat: MegaMenuCategory) => {
      push('browse-requests');
      onClose();
    },
    [push, onClose],
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[300px] overflow-y-auto p-0 sm:w-[360px]">
        <SheetHeader className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
          <SheetTitle className="flex items-center gap-2 text-right">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Grid3X3 className="size-4 text-primary" />
            </div>
            <span className="text-base font-bold">همه دسته‌بندی‌ها</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-3 sm:p-4">
            {/* CTA Banner */}
            <button
              onClick={() => {
                push('post-need');
                onClose();
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:mb-4 sm:py-3.5"
            >
              <Plus className="size-4" />
              <span>ثبت نیاز رایگان</span>
            </button>

            {/* Accordion Groups */}
            <Accordion type="multiple" className="flex flex-col gap-2">
              {MEGA_MENU_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <AccordionItem
                    key={group.title}
                    value={group.title}
                    className="rounded-xl border border-border bg-card px-1"
                  >
                    <AccordionTrigger className="px-3 py-3 text-right hover:no-underline">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                          <GroupIcon className="size-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold">{group.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="flex flex-col gap-0.5">
                        {group.categories.map((cat) => {
                          const CatIcon = cat.icon;
                          return (
                            <div key={cat.id}>
                              <button
                                onClick={() => handleNavigate(cat)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-right transition-colors hover:bg-accent sm:gap-3"
                              >
                                <CatIcon className="size-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">
                                    {cat.name}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {toPersianNumber(cat.requestCount)} نیاز
                                  </span>
                                </div>
                                <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/50" />
                              </button>

                              {/* Subcategories */}
                              <div className="flex flex-col gap-0.5 pe-3 ps-10 sm:pe-4 sm:ps-11">
                                {cat.children.map((sub) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => handleNavigate(cat)}
                                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-right text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3 sm:py-2"
                                    >
                                      <SubIcon className="size-3 shrink-0" />
                                      <span className="flex-1 truncate">{sub.name}</span>
                                      <span className="text-[10px] text-muted-foreground/50">
                                        {toPersianNumber(sub.requestCount)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Popular Section */}
            <div className="mt-4">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <Flame className="size-4 text-orange-500" />
                <span className="text-sm font-bold">دسته‌بندی محبوب</span>
              </div>
              <div className="flex flex-col gap-2">
                {POPULAR_CATEGORIES.map((pop) => {
                  const catData = CATEGORIES.find((c) => c.id === pop.id);
                  if (!catData) return null;
                  const CatIcon = CATEGORY_ICON_MAP[pop.id] || Monitor;

                  return (
                    <button
                      key={pop.id}
                      onClick={() => {
                        push('browse-requests');
                        onClose();
                      }}
                      className="group flex items-center gap-3 rounded-xl border border-border p-3 text-right transition-colors hover:bg-accent"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 sm:size-10">
                        <CatIcon className="size-4 text-primary sm:size-5" />
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-medium">{pop.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {toPersianNumber(pop.requestCount)} نیاز فعال
                        </span>
                      </div>
                      <ChevronLeft className="size-4 text-muted-foreground/40 transition-transform group-hover:-translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ============ Main MegaMenu Export ============
export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Click outside to close (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on route change (derived state from props pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (isOpen) setIsOpen(false);
  }

  const handleMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* Desktop Version */}
      {!isMobile ? (
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all sm:gap-2 sm:px-3',
              isOpen
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <Grid3X3 className="size-4" />
            <span>همه دسته‌بندی‌ها</span>
            <ChevronLeft
              className={cn(
                'size-3 transition-transform duration-200',
                isOpen && 'rotate-90',
              )}
            />
          </button>

          <AnimatePresence>
            {isOpen && (
              <DesktopMegaMenu isOpen={isOpen} onClose={handleClose} />
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Mobile Version */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:gap-2"
        >
          <Grid3X3 className="size-4" />
          <span className="hidden sm:inline">دسته‌بندی‌ها</span>
        </button>
      )}

      {/* Mobile Sheet */}
      {isMobile && <MobileMegaMenu isOpen={isOpen} onClose={handleClose} />}
    </>
  );
}
