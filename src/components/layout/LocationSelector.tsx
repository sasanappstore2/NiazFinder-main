'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ChevronLeft,
  Check,
  Search,
  Globe,
  MapPinned,
  X,
  ArrowRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  IRAN_PROVINCES,
  POPULAR_CITIES,
  getCitiesByProvince,
} from '@/lib/iran-cities';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ─── Types ───────────────────────────────────────────────────────────────

interface LocationSelectorProps {
  selectedCity: string | null;
  selectedProvince: string | null;
  onLocationChange: (city: string | null, province: string | null) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────

const RECENT_CITIES_KEY = 'nf-recent-cities';
const MAX_RECENT = 8;

function getRecentCities(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_CITIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentCities(cities: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(cities.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

// ─── Highlighted Text ──────────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-primary">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

// ─── Filter Chip ───────────────────────────────────────────────────────
function LocationChip({
  label,
  icon,
  active,
  selected,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : active
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
      )}
    >
      {selected && <Check className="h-3 w-3 shrink-0" />}
      {icon && !selected && <span className="shrink-0">{icon}</span>}
      {label}
    </button>
  );
}

// ─── Scrollable Chips Row ─────────────────────────────────────────────
function ChipsRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none',
        '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Location Picker Content ───────────────────────────────────────────

function LocationPickerContent({
  selectedCity,
  selectedProvince,
  onLocationChange,
  onClose,
}: {
  selectedCity: string | null;
  selectedProvince: string | null;
  onLocationChange: (city: string | null, province: string | null) => void;
  onClose: () => void;
}) {
  // ─── State ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProvince, setActiveProvince] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasSelection = !!(selectedCity || selectedProvince);

  // ─── Search results ─────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const results: { city: string; province: string }[] = [];
    for (const province of IRAN_PROVINCES) {
      for (const city of province.cities) {
        if (city.name.toLowerCase().includes(q) || province.name.toLowerCase().includes(q)) {
          results.push({ city: city.name, province: province.name });
        }
      }
    }
    return results.slice(0, 40);
  }, [searchQuery]);

  // ─── Recent + Popular ───────────────────────────────────────────────
  const recentCities = useMemo(() => getRecentCities(), []);
  const popularChips = POPULAR_CITIES.slice(0, 14);

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleSelectCity = useCallback(
    (cityName: string, provinceName: string) => {
      onLocationChange(cityName, provinceName);
      const recent = getRecentCities();
      const updated = [cityName, ...recent.filter((c) => c !== cityName)].slice(0, MAX_RECENT);
      saveRecentCities(updated);
      onClose();
    },
    [onLocationChange, onClose]
  );

  const handleSelectAllIran = useCallback(() => {
    onLocationChange(null, null);
    onClose();
  }, [onLocationChange, onClose]);

  const handleSelectProvince = useCallback(
    (provinceName: string) => {
      onLocationChange(null, provinceName);
      onClose();
    },
    [onLocationChange, onClose]
  );

  const resetSearch = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, []);

  const isSearching = searchResults !== null && searchQuery.trim().length > 0;

  // ─── Cities of active province ──────────────────────────────────────
  const activeCities = useMemo(() => {
    if (!activeProvince) return [];
    return getCitiesByProvince(activeProvince);
  }, [activeProvince]);

  const handleOpenProvince = useCallback((provinceName: string) => {
    setActiveProvince(provinceName);
  }, []);

  const handleBackToProvinces = useCallback(() => {
    setActiveProvince(null);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ─── Header: Search + Selected Chip ─── */}
      <div className="shrink-0 border-b p-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="جستجوی شهر یا استان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-border/60 bg-muted/40 pr-10 text-sm shadow-none transition-colors focus-visible:bg-background focus-visible:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={resetSearch}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Selected location chip — right below search */}
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onLocationChange(null, null);
                }}
                className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <MapPinned className="h-3 w-3 shrink-0" />
                <span>{selectedCity || selectedProvince}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
              <button
                onClick={handleSelectAllIran}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                همه ایران
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {isSearching ? (
          /* ═══════ Search Results ═══════ */
          <ScrollArea className="h-full">
            <div className="p-3">
              {searchResults.length > 0 ? (
                <>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {searchResults.length} نتیجه
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.city}-${result.province}`}
                        onClick={() => handleSelectCity(result.city, result.province)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95',
                          selectedCity === result.city
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border/50 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5'
                        )}
                      >
                        <HighlightedText text={result.city} query={searchQuery} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                    <Search className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">نتیجه‌ای یافت نشد</p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          /* ═══════ Main View ═══════ */
          <ScrollArea className="h-full">
            <div className="p-3">
              <AnimatePresence mode="wait">
                {activeProvince ? (
                  /* ─── Cities View ─── */
                  <motion.div
                    key={activeProvince}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Back button */}
                    <button
                      onClick={handleBackToProvinces}
                      className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>بازگشت به استان‌ها</span>
                    </button>

                    {/* Province header + select all */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPinned className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{activeProvince}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {activeCities.length} شهر
                        </span>
                      </div>
                      <button
                        onClick={() => handleSelectProvince(activeProvince)}
                        className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150',
                          selectedProvince === activeProvince && !selectedCity
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        انتخاب کل استان
                      </button>
                    </div>

                    {/* City chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {activeCities.map((city) => {
                        const isActive = selectedCity === city.name;
                        return (
                          <motion.button
                            key={city.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => handleSelectCity(city.name, activeProvince)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-150',
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                : 'border-border/50 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-95'
                            )}
                          >
                            {isActive && <Check className="h-3 w-3 shrink-0" />}
                            {city.name}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  /* ─── Provinces View ─── */
                  <motion.div
                    key="__provinces"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* ── All Iran Chip ── */}
                    <LocationChip
                      label="تمام ایران"
                      icon={<Globe className="h-3.5 w-3.5" />}
                      selected={!hasSelection}
                      onClick={handleSelectAllIran}
                    />

                    {/* ── Recent Cities ── */}
                    {recentCities.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>انتخاب‌های اخیر</span>
                        </div>
                        <ChipsRow>
                          {recentCities.map((city) => (
                            <LocationChip
                              key={city}
                              label={city}
                              selected={selectedCity === city}
                              active={selectedCity === city}
                              onClick={() => {
                                const prov = IRAN_PROVINCES.find((p) =>
                                  p.cities.some((c) => c.name === city)
                                );
                                handleSelectCity(city, prov?.name ?? '');
                              }}
                            />
                          ))}
                        </ChipsRow>
                      </div>
                    )}

                    {/* ── Popular Cities ── */}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>شهرهای محبوب</span>
                      </div>
                      <ChipsRow>
                        {popularChips.map((city) => (
                          <LocationChip
                            key={city}
                            label={city}
                            selected={selectedCity === city}
                            active={selectedCity === city}
                            onClick={() => {
                              const prov = IRAN_PROVINCES.find((p) =>
                                p.cities.some((c) => c.name === city)
                              );
                              handleSelectCity(city, prov?.name ?? '');
                            }}
                          />
                        ))}
                      </ChipsRow>
                    </div>

                    {/* ── Provinces ── */}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <MapPinned className="h-3.5 w-3.5" />
                        <span>استان‌ها</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {IRAN_PROVINCES.filter(p => p.cities.length > 0).map((province) => {
                          const isActive = selectedProvince === province.name && !selectedCity;
                          const hasCityInProvince = province.cities.some((c) => c.name === selectedCity);

                          return (
                            <button
                              key={province.id || province.name}
                              onClick={() => handleOpenProvince(province.name)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-150',
                                (isActive || hasCityInProvince)
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/50 bg-card text-foreground hover:border-primary/30 hover:bg-primary/5 active:scale-95'
                              )}
                            >
                              {isActive && <Check className="h-3 w-3 shrink-0" />}
                              {province.name}
                              <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function LocationSelector({
  selectedCity,
  selectedProvince,
  onLocationChange,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = selectedCity || selectedProvince || 'تمام ایران';
  const hasSelection = !!(selectedCity || selectedProvince);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMobileOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const contentProps = { selectedCity, selectedProvince, onLocationChange, onClose: handleClose };

  return (
    <>
      {/* Trigger Button */}
      <div ref={containerRef} className="relative">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsMobileOpen(true);
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-all duration-200',
            hasSelection
              ? 'border-primary/25 bg-primary/5 text-primary shadow-sm shadow-primary/5 hover:bg-primary/10'
              : 'border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <MapPinned className={cn('h-3.5 w-3.5 shrink-0', hasSelection ? 'text-primary' : 'text-muted-foreground/70')} />
          <span className={cn(
            'max-w-[75px] truncate text-xs font-medium sm:max-w-[110px]',
            hasSelection && 'font-semibold'
          )}>
            {selectedLabel}
          </span>
          {hasSelection ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onLocationChange(null, null);
              }}
              className="mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary transition-colors hover:bg-primary/25"
            >
              ✕
            </span>
          ) : (
            <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          )}
        </button>

        {/* Desktop Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute top-full right-0 z-50 mt-2 w-[min(380px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/10 lg:w-[min(420px,calc(100vw-2rem))]"
            >
              <div className="h-[480px]">
                <LocationPickerContent {...contentProps} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl border-t border-border/60 p-0">
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>
          <SheetHeader className="border-b px-5 pb-3 pt-1">
            <SheetTitle className="flex items-center gap-2.5 text-right">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                <MapPinned className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-semibold">انتخاب موقعیت</span>
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-68px)]">
            <LocationPickerContent {...contentProps} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
