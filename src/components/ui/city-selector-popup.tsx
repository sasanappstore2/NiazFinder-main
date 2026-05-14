'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MapPin,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries, type City } from '@/lib/location-system';

interface CitySelectorPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCities: City[];
  onSelectionChange: (cities: City[]) => void;
  title?: string;
  description?: string;
}

interface CountryWithState {
  id: string;
  name: string;
  nameEn: string;
  isExpanded: boolean;
  provinces: ProvinceWithState[];
}

interface ProvinceWithState {
  id: string;
  name: string;
  nameEn: string;
  isExpanded: boolean;
  isSelected: boolean;
  selectedCities: City[];
  cities: City[];
}

export function CitySelectorPopup({
  open,
  onOpenChange,
  selectedCities,
  onSelectionChange,
  title = 'انتخاب شهر',
  description = 'شهرهای مورد نظر خود را انتخاب کنید',
}: CitySelectorPopupProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [countriesData, setCountriesData] = React.useState<CountryWithState[]>([]);
  const [tempSelection, setTempSelection] = React.useState<City[]>(selectedCities);

  // Initialize countries data - focus on Iran
  React.useEffect(() => {
    const iranCountry = countries.find(country => country.id === 'iran');
    if (iranCountry) {
      const countriesData = [{
        ...iranCountry,
        isExpanded: true,
        provinces: iranCountry.provinces.map(province => ({
          ...province,
          isExpanded: false,
          isSelected: false,
          selectedCities: [],
        })),
      }];
      setCountriesData(countriesData);
    }
  }, []);

  // Update temp selection when selectedCities changes
  React.useEffect(() => {
    setTempSelection(selectedCities);
  }, [selectedCities]);

  // Update country and province states based on temp selection
  React.useEffect(() => {
    setCountriesData(prev => prev.map(country => ({
      ...country,
      provinces: country.provinces.map(province => {
        const selectedCitiesInProvince = province.cities.filter(city =>
          tempSelection.some(selectedCity => selectedCity.id === city.id)
        );
        const isProvinceSelected = selectedCitiesInProvince.length === province.cities.length && province.cities.length > 0;

        return {
          ...province,
          isSelected: isProvinceSelected,
          selectedCities: selectedCitiesInProvince,
        };
      }),
    })));
  }, [tempSelection]);

  const filteredCountries = React.useMemo(() => {
    if (!searchTerm) return countriesData;

    return countriesData.map(country => ({
      ...country,
      provinces: country.provinces.map(province => ({
        ...province,
        cities: province.cities.filter(city =>
          city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          city.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          province.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })).filter(province =>
        province.cities.length > 0 ||
        province.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    })).filter(country =>
      country.provinces.length > 0 ||
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [countriesData, searchTerm]);

  const allCities = React.useMemo(() => {
    return countriesData.flatMap(country =>
      country.provinces.flatMap(province => province.cities)
    );
  }, [countriesData]);

  const isAllSelected = tempSelection.length === allCities.length && allCities.length > 0;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setTempSelection([]);
    } else {
      setTempSelection(allCities);
    }
  };

  const handleProvinceToggle = (countryId: string, provinceId: string) => {
    const country = countriesData.find(c => c.id === countryId);
    const province = country?.provinces.find(p => p.id === provinceId);
    if (!province) return;

    const isProvinceSelected = province.isSelected;

    if (isProvinceSelected) {
      setTempSelection(prev => prev.filter(city =>
        !province.cities.some(pCity => pCity.id === city.id)
      ));
    } else {
      setTempSelection(prev => {
        const newSelection = [...prev];
        province.cities.forEach(city => {
          if (!newSelection.some(selectedCity => selectedCity.id === city.id)) {
            newSelection.push(city);
          }
        });
        return newSelection;
      });
    }
  };

  const handleCityToggle = (city: City) => {
    setTempSelection(prev =>
      prev.some(selectedCity => selectedCity.id === city.id)
        ? prev.filter(selectedCity => selectedCity.id !== city.id)
        : [...prev, city]
    );
  };

  const handleProvinceExpand = (countryId: string, provinceId: string) => {
    setCountriesData(prev => prev.map(country =>
      country.id === countryId
        ? {
            ...country,
            provinces: country.provinces.map(province =>
              province.id === provinceId
                ? { ...province, isExpanded: !province.isExpanded }
                : province
            ),
          }
        : country
    ));
  };

  const handleCountryExpand = (countryId: string) => {
    setCountriesData(prev => prev.map(country =>
      country.id === countryId
        ? { ...country, isExpanded: !country.isExpanded }
        : country
    ));
  };

  const handleConfirm = () => {
    onSelectionChange(tempSelection);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelection(selectedCities);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setTempSelection([]);
  };

  const getSelectionSummary = () => {
    return getLocationDisplayName(tempSelection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0" dir="rtl">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="text-lg font-semibold text-center">
            {title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center">
            {description}
          </p>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجو در استان‌ها و شهرها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-10 h-9"
            />
          </div>
        </div>

        {/* Selection Summary */}
        <div className="px-4 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {getSelectionSummary()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 px-2 text-xs"
              >
                {isAllSelected ? 'لغو همه' : 'همه'}
              </Button>
              {tempSelection.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Countries List */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-0">
            {filteredCountries.map((country, countryIndex) => (
              <div key={country.id}>
                {/* Country Header */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer bg-primary/5"
                  onClick={() => handleCountryExpand(country.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-bold text-base text-primary">{country.name}</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {country.provinces.length} استان
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    {country.isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Provinces List */}
                {country.isExpanded && (
                  <div className="bg-muted/5">
                    {country.provinces.map((province, provinceIndex) => (
                      <div key={province.id}>
                        {/* Province Header */}
                        <div
                          className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleProvinceExpand(country.id, province.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={province.isSelected}
                              onCheckedChange={() => handleProvinceToggle(country.id, province.id)}
                              className="h-4 w-4"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="font-medium text-sm">{province.name}</span>
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {province.cities.length}
                            </Badge>
                            {province.selectedCities.length > 0 && !province.isSelected && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                {province.selectedCities.length}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center">
                            {province.isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Cities List */}
                        {province.isExpanded && (
                          <div className="bg-muted/10">
                            <div className="px-4 py-2 space-y-1">
                              {province.cities.map((city, cityIndex) => (
                                <div
                                  key={`${country.id}-${province.id}-${city.id}-${cityIndex}`}
                                  className="flex items-center gap-3 p-2 hover:bg-background/50 transition-colors rounded-sm"
                                >
                                  <Checkbox
                                    checked={tempSelection.some(selectedCity => selectedCity.id === city.id)}
                                    onCheckedChange={() => handleCityToggle(city)}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm text-muted-foreground">{city.name}</span>
                                  {tempSelection.some(selectedCity => selectedCity.id === city.id) && (
                                    <Check className="h-3 w-3 text-primary ms-auto" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Province Separator */}
                        {provinceIndex < country.provinces.length - 1 && (
                          <div className="h-px bg-border mx-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Country Separator */}
                {countryIndex < filteredCountries.length - 1 && (
                  <div className="h-px bg-border mx-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              {tempSelection.length} شهر انتخاب شده
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="h-8 px-3 text-sm"
              >
                لغو
              </Button>
              <Button
                onClick={handleConfirm}
                className="h-8 px-3 text-sm"
              >
                تایید
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getLocationDisplayName(selectedCities: City[]): string {
  if (selectedCities.length === 0) return 'هیچ شهری انتخاب نشده';
  if (selectedCities.length === 1) return selectedCities[0].name;
  return `${selectedCities.length} شهر انتخاب شده`;
}
