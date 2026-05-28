'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { MAX_PROFILE_CATEGORY_SELECTIONS } from '@/lib/business/business-category';
import type { OccupationMegaMenuNode } from '@/lib/business/occupation-mega-menu';

export type CategoryMegaMenuFilterResult = {
  sectors: OccupationMegaMenuNode[];
  flatJobs: OccupationMegaMenuNode[];
};

export type BusinessCategoryMegaMenuConfig = {
  defaultTree: OccupationMegaMenuNode[];
  filterMenu: (query: string) => CategoryMegaMenuFilterResult;
  getSectorColor: (parentSlug: string) => string;
  maxSelections?: number;
  selectionNoun: string;
  searchPlaceholder: string;
  emptySearchMessage: string;
  mobileRootTitle: string;
  hintText?: string;
  /** Browse navigation: leaf click navigates instead of toggling selection. */
  navigateOnLeaf?: (slug: string) => void;
};

/** When to use the two-column desktop mega menu (matches site `lg` nav breakpoint). */
export type MegaMenuLayoutMode = 'auto' | 'desktop' | 'mobile';

const MEGA_MENU_DESKTOP_MIN_WIDTH_PX = 1024;

function useViewportDesktopMegaMenu(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MEGA_MENU_DESKTOP_MIN_WIDTH_PX}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

function resolveMegaMenuLayout(
  layout: MegaMenuLayoutMode,
  viewportDesktop: boolean
): 'desktop' | 'mobile' {
  if (layout === 'desktop') return 'desktop';
  if (layout === 'mobile') return 'mobile';
  return viewportDesktop ? 'desktop' : 'mobile';
}

function LeafIconBadge({
  node,
  selected,
  getSectorColor,
}: {
  node: OccupationMegaMenuNode;
  selected: boolean;
  getSectorColor: (parentSlug: string) => string;
}) {
  const Icon = node.icon;
  const color = node.pickable ? getSectorColor(node.parent ?? '') : node.color;

  return (
    <div className="relative shrink-0">
      <Icon className="size-5" style={{ color }} />
      {selected && (
        <span
          className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
          aria-hidden
        >
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

function useToggleSelection(
  selectedSlugs: string[],
  onChange: (slugs: string[]) => void,
  maxSelections: number,
  selectionNoun: string
) {
  return React.useCallback(
    (slug: string) => {
      const set = new Set(selectedSlugs);
      if (set.has(slug)) {
        onChange(selectedSlugs.filter((s) => s !== slug));
        return;
      }
      if (selectedSlugs.length >= maxSelections) {
        toast.message(`حداکثر ${maxSelections} ${selectionNoun} می‌توانید انتخاب کنید`);
        return;
      }
      onChange([...selectedSlugs, slug]);
    },
    [selectedSlugs, onChange, maxSelections, selectionNoun]
  );
}

function DesktopCategoryMegaMenu({
  sectors,
  selectedSlugs,
  onChange,
  getSectorColor,
  maxSelections,
  selectionNoun,
  navigateOnLeaf,
}: {
  sectors: OccupationMegaMenuNode[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  getSectorColor: (parentSlug: string) => string;
  maxSelections: number;
  selectionNoun: string;
  navigateOnLeaf?: (slug: string) => void;
}) {
  const [activeSector, setActiveSector] = React.useState<OccupationMegaMenuNode | null>(
    sectors[0] ?? null
  );
  const toggle = useToggleSelection(selectedSlugs, onChange, maxSelections, selectionNoun);
  const onLeafClick = navigateOnLeaf ?? toggle;

  React.useEffect(() => {
    if (!activeSector && sectors[0]) setActiveSector(sectors[0]);
    if (activeSector && !sectors.find((s) => s.id === activeSector.id)) {
      setActiveSector(sectors[0] ?? null);
    }
  }, [sectors, activeSector]);

  const jobs = activeSector?.subCategories ?? [];

  const SectorRow = ({
    sector,
    isActive,
  }: {
    sector: OccupationMegaMenuNode;
    isActive: boolean;
  }) => {
    const selectedInSector = (sector.subCategories ?? []).filter((j) =>
      selectedSlugs.includes(j.slug)
    ).length;

    return (
      <button
        type="button"
        onMouseEnter={() => setActiveSector(sector)}
        onClick={() => setActiveSector(sector)}
        className={cn(
          'flex w-full min-h-10 items-center gap-2 px-2.5 py-2 rounded-md transition-colors duration-100 text-right',
          isActive
            ? 'bg-emerald-500/10 font-semibold text-emerald-800 dark:text-emerald-300'
            : 'hover:bg-muted/50 text-foreground'
        )}
        dir="rtl"
      >
        <span
          className={cn(
            'min-w-0 flex-1 text-sm leading-snug line-clamp-2',
            sector.id === 'online-stores-browse-root' && 'font-bold'
          )}
        >
          {sector.name}
          {!navigateOnLeaf && selectedInSector > 0 && (
            <span className="ms-1 inline-flex rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white align-middle">
              {selectedInSector}
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <sector.icon className="size-5" style={{ color: sector.color }} />
          <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
        </div>
      </button>
    );
  };

  return (
    <div
      className="flex h-[min(420px,58vh)] min-h-[280px] w-full min-w-0 rounded-xl border border-border/60 overflow-hidden"
      dir="rtl"
    >
      <div className="w-[36%] min-w-[9.75rem] max-w-[13.5rem] shrink-0 border-s border-border/40 bg-muted/20 p-1.5 sm:min-w-[11rem] sm:max-w-[15rem]">
        <ScrollArea className="h-full">
          <div className="space-y-0.5 pe-0.5">
            {sectors.map((sector) => (
              <SectorRow key={sector.id} sector={sector} isActive={activeSector?.id === sector.id} />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="min-w-0 flex-1 p-1.5 sm:p-2">
        <AnimatePresence mode="wait">
          {activeSector && (
            <motion.div
              key={activeSector.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <ScrollArea className="h-full">
                <p className="mb-1 px-2 py-1.5 text-xs font-semibold leading-snug text-muted-foreground line-clamp-2">
                  {activeSector.name}
                </p>
                <Separator className="mb-1" />
                <div className="space-y-0.5">
                  {jobs.map((job) => {
                    const selected = !navigateOnLeaf && selectedSlugs.includes(job.slug);
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onLeafClick(job.slug)}
                        className={cn(
                          'flex w-full min-h-10 items-center gap-2 px-2.5 py-2 rounded-md transition-colors duration-100 text-right text-sm',
                          selected
                            ? 'bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-300'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <span className="min-w-0 flex-1 leading-snug line-clamp-2">{job.name}</span>
                        <LeafIconBadge
                          node={job}
                          selected={selected}
                          getSectorColor={getSectorColor}
                        />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MobileCategoryMegaMenu({
  sectors,
  selectedSlugs,
  onChange,
  getSectorColor,
  maxSelections,
  selectionNoun,
  mobileRootTitle,
  navigateOnLeaf,
}: {
  sectors: OccupationMegaMenuNode[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  getSectorColor: (parentSlug: string) => string;
  maxSelections: number;
  selectionNoun: string;
  mobileRootTitle: string;
  navigateOnLeaf?: (slug: string) => void;
}) {
  const [history, setHistory] = React.useState<OccupationMegaMenuNode[][]>([sectors]);
  const [direction, setDirection] = React.useState(1);
  const toggle = useToggleSelection(selectedSlugs, onChange, maxSelections, selectionNoun);
  const onLeafClick = navigateOnLeaf ?? toggle;

  const currentLevel = history[history.length - 1];
  const parentSector =
    history.length > 1
      ? sectors.find((s) => s.slug === currentLevel[0]?.parent) ?? null
      : null;
  const headerTitle = parentSector?.name ?? mobileRootTitle;

  const openSector = (sector: OccupationMegaMenuNode) => {
    if (sector.subCategories?.length) {
      setDirection(1);
      setHistory((prev) => [...prev, sector.subCategories!]);
    }
  };

  const handleBack = () => {
    if (history.length > 1) {
      setDirection(-1);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  return (
    <div className="flex h-[min(400px,60vh)] min-h-[280px] w-full min-w-0 flex-col rounded-xl border border-border/60 overflow-hidden">
      {history.length > 1 && (
        <header className="flex items-center border-b border-border/40 px-2 py-2">
          <Button variant="ghost" size="icon" type="button" onClick={handleBack} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="flex-1 text-center text-sm font-semibold">{headerTitle}</p>
          <div className="w-10 shrink-0" />
        </header>
      )}

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={history.length}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.22 }}
            className="absolute inset-0"
          >
            <ScrollArea className="h-full">
              <div className="space-y-0.5 p-2" dir="rtl">
                {currentLevel.map((node) => {
                  const isSector = !node.pickable;
                  const hasSub = !!node.subCategories?.length;
                  const selected =
                    !navigateOnLeaf && !isSector && selectedSlugs.includes(node.slug);

                  if (isSector) {
                    const count = navigateOnLeaf
                      ? 0
                      : (node.subCategories ?? []).filter((j) =>
                          selectedSlugs.includes(j.slug)
                        ).length;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => openSector(node)}
                        className="flex w-full min-h-11 items-center gap-2 px-3 py-2.5 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={cn(
                              'min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2 text-right',
                              node.id === 'online-stores-browse-root' && 'font-bold'
                            )}
                          >
                            {node.name}
                          </span>
                          {count > 0 && (
                            <span className="rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                              {count}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <node.icon className="size-5" style={{ color: node.color }} />
                          {hasSub && <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onLeafClick(node.slug)}
                      className={cn(
                        'flex w-full min-h-11 items-center gap-2 px-3 py-2.5 rounded-md text-sm',
                        selected
                          ? 'bg-emerald-500/10 font-semibold text-emerald-800 dark:text-emerald-300'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="min-w-0 flex-1 leading-snug line-clamp-2 text-right">{node.name}</span>
                      <LeafIconBadge
                        node={node}
                        selected={selected}
                        getSectorColor={getSectorColor}
                      />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SearchResults({
  jobs,
  selectedSlugs,
  onChange,
  getSectorColor,
  maxSelections,
  selectionNoun,
  emptySearchMessage,
  navigateOnLeaf,
}: {
  jobs: OccupationMegaMenuNode[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  getSectorColor: (parentSlug: string) => string;
  maxSelections: number;
  selectionNoun: string;
  emptySearchMessage: string;
  navigateOnLeaf?: (slug: string) => void;
}) {
  const toggle = useToggleSelection(selectedSlugs, onChange, maxSelections, selectionNoun);
  const onLeafClick = navigateOnLeaf ?? toggle;

  if (jobs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground rounded-xl border border-border/60">
        {emptySearchMessage}
      </p>
    );
  }

  return (
    <ScrollArea className="h-[min(280px,40vh)] rounded-xl border border-border/60">
      <div className="space-y-0.5 p-2" dir="rtl">
        {jobs.map((job) => {
          const selected = !navigateOnLeaf && selectedSlugs.includes(job.slug);
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => onLeafClick(job.slug)}
              className={cn(
                'flex w-full items-center justify-between h-10 px-3 rounded-md text-sm',
                selected
                  ? 'bg-emerald-500/10 font-semibold text-emerald-800 dark:text-emerald-300'
                  : 'hover:bg-muted/50'
              )}
            >
              <span className="truncate">{job.name}</span>
              <LeafIconBadge node={job} selected={selected} getSectorColor={getSectorColor} />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function BusinessCategoryMegaMenuPicker({
  config,
  selectedSlugs,
  onChange,
  className,
  layout = 'auto',
}: {
  config: BusinessCategoryMegaMenuConfig;
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  className?: string;
  /** Force mobile drill-down in sheets; desktop columns in wide popovers. */
  layout?: MegaMenuLayoutMode;
}) {
  const [query, setQuery] = React.useState('');
  const viewportDesktop = useViewportDesktopMegaMenu();
  const resolvedLayout = resolveMegaMenuLayout(layout, viewportDesktop);
  const isDesktop = resolvedLayout === 'desktop';
  const maxSelections = config.maxSelections ?? MAX_PROFILE_CATEGORY_SELECTIONS;

  const { sectors, flatJobs } = React.useMemo(
    () => config.filterMenu(query),
    [config, query]
  );

  const searching = query.trim().length > 0;
  const tree = sectors.length > 0 ? sectors : config.defaultTree;
  const navigateOnLeaf = config.navigateOnLeaf;
  const hint =
    config.hintText ??
    `حداکثر ${maxSelections} ${config.selectionNoun} — اولین مورد، مورد اصلی است`;

  return (
    <div className={cn('space-y-2', className)}>
      {!navigateOnLeaf && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{hint}</span>
          <span dir="ltr" className="tabular-nums">
            {selectedSlugs.length}/{maxSelections}
          </span>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={config.searchPlaceholder}
          className="h-10 ps-9"
        />
      </div>

      {searching ? (
        <SearchResults
          jobs={flatJobs}
          selectedSlugs={selectedSlugs}
          onChange={onChange}
          getSectorColor={config.getSectorColor}
          maxSelections={maxSelections}
          selectionNoun={config.selectionNoun}
          emptySearchMessage={config.emptySearchMessage}
          navigateOnLeaf={navigateOnLeaf}
        />
      ) : isDesktop ? (
        <DesktopCategoryMegaMenu
          sectors={tree}
          selectedSlugs={selectedSlugs}
          onChange={onChange}
          getSectorColor={config.getSectorColor}
          maxSelections={maxSelections}
          selectionNoun={config.selectionNoun}
          navigateOnLeaf={navigateOnLeaf}
        />
      ) : (
        <MobileCategoryMegaMenu
          sectors={tree}
          selectedSlugs={selectedSlugs}
          onChange={onChange}
          getSectorColor={config.getSectorColor}
          maxSelections={maxSelections}
          selectionNoun={config.selectionNoun}
          mobileRootTitle={config.mobileRootTitle}
          navigateOnLeaf={navigateOnLeaf}
        />
      )}
    </div>
  );
}
