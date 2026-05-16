'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  MapPin,
  Check,
  X,
  ChevronDown,
  Star,
  Waves,
  Globe2,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  countries,
  type City,
  getIranProvinces,
  getPopularCities,
  getIslands,
  searchCities,
} from '@/lib/location-system';

interface CitySelectorPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCities: City[];
  onSelectionChange: (cities: City[]) => void;
}

type ViewTab = 'popular' | 'provinces' | 'islands' | 'search';

// Province alphabet grouping
const PERSIAN_ALPHA = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
const getFirstLetter = (name: string): string => {
  return name.charAt(0);
};

export function CitySelectorPopup({
  open,
  onOpenChange,
  selectedCities,
  onSelectionChange,
}: CitySelectorPopupProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tempSelection, setTempSelection] = React.useState<City[]>(selectedCities);
  const [activeTab, setActiveTab] = React.useState<ViewTab>('popular');
  const [expandedProvince, setExpandedProvince] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<{ city: City; provinceName: string }[]>([]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const provinces = React.useMemo(() => getIranProvinces(), []);
  const popularCities = React.useMemo(() => getPopularCities(), []);
  const islands = React.useMemo(() => getIslands(), []);

  // Sync temp selection
  React.useEffect(() => {
    setTempSelection(selectedCities);
  }, [selectedCities]);

  // Focus search on search tab
  React.useEffect(() => {
    if (activeTab === 'search' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  // Search handler with debounce
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchCities(searchTerm.trim());
    setSearchResults(results);
  }, [searchTerm]);

  // Toggle city in temp selection
  const toggleCity = (city: City) => {
    setTempSelection(prev =>
      prev.some(c => c.id === city.id)
        ? prev.filter(c => c.id !== city.id)
        : [...prev, city]
    );
  };

  // Toggle all cities of a province
  const toggleProvince = (provinceId: string) => {
    const province = provinces.find(p => p.id === provinceId);
    if (!province) return;
    const provinceCityIds = province.cities.map(c => c.id);
    const allSelected = provinceCityIds.every(id =>
      tempSelection.some(c => c.id === id)
    );
    if (allSelected) {
      setTempSelection(prev => prev.filter(c => !provinceCityIds.includes(c.id)));
    } else {
      const newCities = province.cities.filter(
        c => !tempSelection.some(s => s.id === c.id)
      );
      setTempSelection(prev => [...prev, ...newCities]);
    }
  };

  // Select/deselect all
  const selectAll = () => {
    const allCities = provinces.flatMap(p => p.cities);
    setTempSelection(allCities);
  };

  const clearAll = () => {
    setTempSelection([]);
  };

  // Confirm
  const handleConfirm = () => {
    onSelectionChange(tempSelection);
    onOpenChange(false);
  };

  // Cancel
  const handleCancel = () => {
    setTempSelection(selectedCities);
    onOpenChange(false);
  };

  // Remove from chips
  const removeCity = (cityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTempSelection(prev => prev.filter(c => c.id !== cityId));
  };

  // Check if province is fully selected
  const isProvinceFullySelected = (provinceId: string): boolean => {
    const province = provinces.find(p => p.id === provinceId);
    if (!province || province.cities.length === 0) return false;
    return province.cities.every(c => tempSelection.some(s => s.id === c.id));
  };

  // Get count of selected cities in province
  const getProvinceSelectedCount = (provinceId: string): number => {
    const province = provinces.find(p => p.id === provinceId);
    if (!province) return 0;
    return province.cities.filter(c => tempSelection.some(s => s.id === c.id)).length;
  };

  const isCitySelected = (cityId: string) => tempSelection.some(c => c.id === cityId);

  const totalCities = provinces.reduce((sum, p) => sum + p.cities.length, 0);
  const isAllSelected = tempSelection.length === totalCities;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[520px] max-h-[88vh] p-0 gap-0 overflow-hidden rounded-2xl"
        dir="rtl"
      >
        {/* ─── Header ─── */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 justify-center">
            <MapPin className="size-5 text-emerald-500" />
            <span>انتخاب شهر</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center mt-1">
            شهر مورد نظر خود را انتخاب کنید تا نتایج مرتبط ببینید
          </p>
        </DialogHeader>

        {/* ─── Search Bar ─── */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              ref={inputRef}
              placeholder="جستجوی شهر یا استان..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.trim()) setActiveTab('search');
              }}
              className="h-10 pr-10 pl-4 rounded-xl bg-muted/50 border-border/40 focus:bg-background transition-colors text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                  setActiveTab('popular');
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Selected Cities Chips ─── */}
        {tempSelection.length > 0 && (
          <div className="px-5 pb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground ml-1">انتخاب‌شده:</span>
              {tempSelection.slice(0, 5).map(city => (
                <button
                  key={city.id}
                  onClick={() => removeCity(city.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all',
                    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                  )}
                >
                  {city.name}
                  <X className="size-2.5" />
                </button>
              ))}
              {tempSelection.length > 5 && (
                <span className="text-[11px] text-muted-foreground">
                  +{tempSelection.length - 5} شهر دیگر
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab Navigation ─── */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl">
            {([
              { key: 'popular' as ViewTab, label: 'محبوب‌ها', icon: Star },
              { key: 'provinces' as ViewTab, label: 'استان‌ها', icon: Globe2 },
              { key: 'islands' as ViewTab, label: 'جزایر', icon: Waves },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 max-h-[400px] px-5">
          {/* ══ Popular Cities ══ */}
          {activeTab === 'popular' && (
            <div className="pb-4">
              <div className="grid grid-cols-3 gap-2">
                {popularCities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => toggleCity(city)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 border',
                      isCitySelected(city.id)
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-background/60 border-border/30 hover:bg-muted/60 hover:border-border/60 text-foreground'
                    )}
                  >
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate text-xs font-medium">{city.name}</span>
                    {isCitySelected(city.id) && (
                      <Check className="size-3.5 ms-auto text-emerald-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ Provinces List ══ */}
          {activeTab === 'provinces' && (
            <div className="pb-4 space-y-0.5">
              {provinces.map(province => {
                const isExpanded = expandedProvince === province.id;
                const isFullySelected = isProvinceFullySelected(province.id);
                const selectedCount = getProvinceSelectedCount(province.id);

                return (
                  <div key={province.id} className="rounded-lg overflow-hidden">
                    {/* Province header */}
                    <div
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg transition-all duration-150',
                        isExpanded
                          ? 'bg-muted/70'
                          : 'hover:bg-muted/40'
                      )}
                      onClick={() => setExpandedProvince(isExpanded ? null : province.id)}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Province checkbox indicator */}
                        <div
                          className={cn(
                            'flex size-5 items-center justify-center rounded-md border-2 shrink-0 transition-all duration-150',
                            isFullySelected
                              ? 'bg-emerald-500 border-emerald-500'
                              : selectedCount > 0
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-border/60'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProvince(province.id);
                          }}
                        >
                          {isFullySelected && <Check className="size-3 text-white" />}
                          {!isFullySelected && selectedCount > 0 && (
                            <span className="text-[9px] font-bold text-emerald-600">{selectedCount}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{province.name}</span>
                          <span className="text-[11px] text-muted-foreground ms-2">
                            {province.cities.length} شهر
                          </span>
                        </div>
                      </div>

                      <ChevronLeft
                        className={cn(
                          'size-4 text-muted-foreground shrink-0 transition-transform duration-200',
                          isExpanded && '-rotate-90'
                        )}
                      />
                    </div>

                    {/* Expanded cities */}
                    {isExpanded && (
                      <div className="mt-1 mr-7 border-r-2 border-emerald-500/15 pr-2 space-y-0">
                        {province.cities.map(city => {
                          const selected = isCitySelected(city.id);
                          return (
                            <button
                              key={city.id}
                              onClick={() => toggleCity(city)}
                              className={cn(
                                'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-100',
                                selected
                                  ? 'bg-emerald-500/10'
                                  : 'hover:bg-muted/40'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {city.isIsland && (
                                  <Waves className="size-3 text-blue-500" />
                                )}
                                <span className={cn(
                                  'text-xs',
                                  selected ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-foreground/80'
                                )}>
                                  {city.name}
                                </span>
                              </div>
                              {selected && (
                                <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500">
                                  <Check className="size-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ Islands ══ */}
          {activeTab === 'islands' && (
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Waves className="size-4 text-blue-500" />
                <span className="text-sm font-semibold">جزایر ایران</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {islands.length} جزیره
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {islands.map(island => (
                  <button
                    key={island.id}
                    onClick={() => toggleCity(island)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 border',
                      isCitySelected(island.id)
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300'
                        : 'bg-background/60 border-border/30 hover:bg-muted/60 hover:border-border/60 text-foreground'
                    )}
                  >
                    <Waves className="size-3.5 shrink-0 text-blue-500" />
                    <span className="truncate text-xs font-medium">{island.name}</span>
                    {isCitySelected(island.id) && (
                      <Check className="size-3.5 ms-auto text-blue-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ Search Results ══ */}
          {activeTab === 'search' && (
            <div className="pb-4">
              {searchTerm.trim() && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Search className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">نتیجه‌ای یافت نشد</p>
                  <p className="text-xs mt-1">عبارت دیگری را جستجو کنید</p>
                </div>
              )}
              {searchResults.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs text-muted-foreground">
                      {searchResults.length} نتیجه
                    </span>
                    <button
                      onClick={() => {
                        const newSelection = [...tempSelection];
                        searchResults.forEach(({ city }) => {
                          if (!newSelection.some(c => c.id === city.id)) {
                            newSelection.push(city);
                          }
                        });
                        setTempSelection(newSelection);
                      }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      انتخاب همه نتایج
                    </button>
                  </div>
                  <div className="space-y-0.5 max-h-[340px] overflow-y-auto">
                    {searchResults.map(({ city, provinceName }) => {
                      const selected = isCitySelected(city.id);
                      return (
                        <button
                          key={city.id}
                          onClick={() => toggleCity(city)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-100',
                            selected
                              ? 'bg-emerald-500/10'
                              : 'hover:bg-muted/40'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {city.isIsland ? (
                              <Waves className="size-3.5 text-blue-500 shrink-0" />
                            ) : (
                              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className={cn(
                                'text-sm block truncate',
                                selected ? 'text-emerald-700 dark:text-emerald-300 font-medium' : ''
                              )}>
                                {city.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {provinceName}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            'flex size-5 items-center justify-center rounded-md border-2 shrink-0 transition-all duration-150 ms-2',
                            selected
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-border/60'
                          )}>
                            {selected && <Check className="size-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="border-t border-border/30 px-5 py-3 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {tempSelection.length === 0
                ? 'هیچ شهری انتخاب نشده'
                : tempSelection.length === totalCities
                  ? 'تمام ایران'
                  : `${tempSelection.length} شهر`
              }
            </span>
            {tempSelection.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] text-destructive hover:text-destructive/80 font-medium transition-colors"
              >
                پاک کردن
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isAllSelected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-8 text-xs text-muted-foreground"
              >
                انتخاب همه
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-8 px-4 text-xs rounded-lg"
            >
              لغو
            </Button>
            <Button
              onClick={handleConfirm}
              className="h-8 px-5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700"
            >
              تایید
              {tempSelection.length > 0 && (
                <Badge className="ms-1.5 h-4 min-w-[16px] px-1 text-[10px] bg-white/20 text-white border-0">
                  {tempSelection.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
