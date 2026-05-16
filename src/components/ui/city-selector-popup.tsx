'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  MapPin,
  Check,
  X,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type City,
  getIranProvinces,
  searchCities,
} from '@/lib/location-system';

interface CitySelectorPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCities: City[];
  onSelectionChange: (cities: City[]) => void;
}

// ─── Checkbox Component ───
function Checkable({
  checked,
  partial,
  onClick,
  className,
}: {
  checked: boolean;
  partial?: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onClick(e as unknown as React.MouseEvent); }}}
      className={cn(
        'flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] shrink-0 cursor-pointer select-none transition-all duration-150',
        checked
          ? 'bg-emerald-600 border-emerald-600 shadow-[0_0_0_2px_rgba(5,150,105,0.15)]'
          : partial
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-background',
        className
      )}
    >
      {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      {!checked && partial && (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">-</span>
      )}
    </div>
  );
}

export function CitySelectorPopup({
  open,
  onOpenChange,
  selectedCities,
  onSelectionChange,
}: CitySelectorPopupProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tempSelection, setTempSelection] = React.useState<City[]>(selectedCities);
  const [expandedProvince, setExpandedProvince] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  const provinces = React.useMemo(() => getIranProvinces(), []);

  // Sync temp selection
  React.useEffect(() => {
    setTempSelection(selectedCities);
  }, [selectedCities]);

  // Focus search on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Toggle city
  const toggleCity = (city: City) => {
    setTempSelection(prev =>
      prev.some(c => c.id === city.id)
        ? prev.filter(c => c.id !== city.id)
        : [...prev, city]
    );
  };

  // Toggle all cities of a province
  const toggleProvince = (provinceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const province = provinces.find(p => p.id === provinceId);
    if (!province) return;
    const ids = new Set(province.cities.map(c => c.id));
    const allSelected = [...ids].every(id => tempSelection.some(c => c.id === id));
    if (allSelected) {
      setTempSelection(prev => prev.filter(c => !ids.has(c.id)));
    } else {
      const newCities = province.cities.filter(c => !tempSelection.some(s => s.id === c.id));
      setTempSelection(prev => [...prev, ...newCities]);
    }
  };

  const selectAll = () => setTempSelection(provinces.flatMap(p => p.cities));
  const clearAll = () => setTempSelection([]);

  const handleConfirm = () => {
    onSelectionChange(tempSelection);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelection(selectedCities);
    onOpenChange(false);
  };

  const removeCity = (cityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTempSelection(prev => prev.filter(c => c.id !== cityId));
  };

  const isCitySelected = (cityId: string) => tempSelection.some(c => c.id === cityId);

  const getProvinceState = (provinceId: string) => {
    const province = provinces.find(p => p.id === provinceId);
    if (!province) return { fully: false, partial: false, count: 0 };
    const ids = province.cities.map(c => c.id);
    const count = ids.filter(id => tempSelection.some(c => c.id === id)).length;
    return {
      fully: count === ids.length && ids.length > 0,
      partial: count > 0 && count < ids.length,
      count,
    };
  };

  const totalCities = provinces.reduce((s, p) => s + p.cities.length, 0);
  const isAllSelected = tempSelection.length === totalCities;

  // Filtered provinces/cities based on search
  const filteredProvinces = React.useMemo(() => {
    if (!searchTerm.trim()) return provinces;
    const q = searchTerm.trim().toLowerCase();
    const results = searchCities(searchTerm.trim());
    const matchedCityIds = new Set(results.map(r => r.city.id));

    return provinces.map(p => {
      const cityMatches = p.cities.filter(c => matchedCityIds.has(c.id));
      const nameMatch = p.name.includes(searchTerm.trim()) || p.nameEn.toLowerCase().includes(q);
      return {
        ...p,
        cities: nameMatch ? p.cities : cityMatches,
      };
    }).filter(p => p.cities.length > 0);
  }, [provinces, searchTerm]);

  // Auto-expand when searching
  const searchMode = searchTerm.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[480px] max-h-[85vh] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col"
        dir="rtl"
      >
        {/* ─── Header ─── */}
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="size-[18px] text-emerald-600" />
            <span>انتخاب شهر</span>
          </DialogTitle>
        </DialogHeader>

        {/* ─── Search ─── */}
        <div className="px-5 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
            <Input
              ref={inputRef}
              placeholder="جستجوی شهر یا استان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pr-9 pl-8 rounded-lg bg-muted/50 border-border/40 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Selection Summary ─── */}
        {tempSelection.length > 0 && (
          <div className="px-5 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
              {tempSelection.slice(0, 6).map(city => (
                <span
                  key={city.id}
                  className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                >
                  {city.name}
                  <button
                    onClick={(e) => removeCity(city.id, e)}
                    className="hover:text-emerald-900 dark:hover:text-white transition-colors"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
              {tempSelection.length > 6 && (
                <span className="text-[11px] text-muted-foreground">
                  +{tempSelection.length - 6} شهر دیگر
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Province / City List ─── */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain px-3 pb-2">
          {filteredProvinces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="size-7 mb-2 opacity-25" />
              <p className="text-sm">نتیجه‌ای یافت نشد</p>
            </div>
          )}

          <div className="space-y-px">
            {filteredProvinces.map(province => {
              const pState = getProvinceState(province.id);
              const isExpanded = searchMode || expandedProvince === province.id;

              return (
                <div key={province.id}>
                  {/* Province row */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer transition-colors',
                      isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
                    )}
                    onClick={() => {
                      if (searchMode) return;
                      setExpandedProvince(isExpanded ? null : province.id);
                    }}
                  >
                    <Checkable
                      checked={pState.fully}
                      partial={pState.partial}
                      onClick={(e) => toggleProvince(province.id, e)}
                    />
                    <span className="text-[13px] font-semibold flex-1 min-w-0 truncate">
                      {province.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {pState.count > 0 ? `${pState.count}/` : ''}{province.cities.length}
                    </span>
                    {!searchMode && (
                      <ChevronLeft
                        className={cn(
                          'size-4 text-muted-foreground/60 shrink-0 transition-transform duration-200',
                          isExpanded && '-rotate-90'
                        )}
                      />
                    )}
                  </div>

                  {/* Cities list */}
                  {isExpanded && (
                    <div className="mr-5 pr-1 mb-1 space-y-px border-r-[2px] border-emerald-500/20 rounded-bl-lg">
                      {province.cities.map(city => {
                        const selected = isCitySelected(city.id);
                        return (
                          <label
                            key={city.id}
                            className={cn(
                              'flex items-center gap-3 px-2 py-[9px] rounded-md cursor-pointer transition-colors',
                              selected ? 'bg-emerald-600/8' : 'hover:bg-muted/30'
                            )}
                          >
                            <Checkable
                              checked={selected}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCity(city);
                              }}
                            />
                            <span className={cn(
                              'text-[13px] flex-1',
                              selected
                                ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'text-foreground/90'
                            )}>
                              {city.name}
                            </span>
                            {city.isIsland && (
                              <span className="text-[10px] text-blue-500 font-medium px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 rounded">
                                جزیره
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Sticky Footer ─── */}
        <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left info */}
            <div className="flex items-center gap-2 min-w-0">
              {tempSelection.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[11px] text-destructive/70 hover:text-destructive font-medium whitespace-nowrap transition-colors"
                >
                  پاک کردن
                </button>
              )}
              {!isAllSelected && (
                <button
                  onClick={selectAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium whitespace-nowrap transition-colors"
                >
                  همه
                </button>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                {tempSelection.length > 0 ? `${tempSelection.length} شهر` : 'بدون انتخاب'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-9 px-4 text-[13px] rounded-lg"
              >
                لغو
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                className="h-9 px-5 text-[13px] rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm"
              >
                تایید
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
