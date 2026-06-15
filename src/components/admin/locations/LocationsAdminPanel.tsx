'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MapPinned, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminFormField,
  AdminPanel,
  AdminPanelActions,
  AdminToggleRow,
} from '@/components/admin/ui';
import { LocationsHierarchyView } from '@/components/admin/locations/LocationsHierarchyView';
import { NeighborhoodLocationForm } from '@/components/admin/locations/NeighborhoodLocationForm';
import {
  NeighborhoodsManagePage,
  type NeighborhoodManageContext,
} from '@/components/admin/locations/NeighborhoodsManagePage';
import type {
  ManagedCity,
  ManagedNeighborhood,
  ManagedProvince,
} from '@/components/admin/locations/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LocationType = 'province' | 'city' | 'neighborhood';

interface LocationData {
  countries: Array<{
    id: string;
    provinces: ManagedProvince[];
  }>;
  stats?: {
    provinces?: number;
    cities?: number;
    neighborhoods?: number;
    activeCities?: number;
    activeNeighborhoods?: number;
  };
  updatedAt?: string;
}

interface LocationFormState {
  id?: string;
  type: LocationType;
  name: string;
  nameEn: string;
  countryId: string;
  provinceId: string;
  cityId: string;
  order: string;
  isActive: boolean;
  isPopular: boolean;
  isIsland: boolean;
  areasText: string;
}

const initialLocationForm: LocationFormState = {
  type: 'province',
  name: '',
  nameEn: '',
  countryId: 'iran',
  provinceId: '',
  cityId: '',
  order: '0',
  isActive: true,
  isPopular: false,
  isIsland: false,
  areasText: '',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <AdminFormField label={label}>{children}</AdminFormField>;
}

export function LocationsAdminPanel({
  onFullPageChange,
}: {
  onFullPageChange?: (active: boolean) => void;
}) {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormState>(initialLocationForm);
  const [neighborhoodManage, setNeighborhoodManage] = useState<NeighborhoodManageContext | null>(null);
  const [neighborhoodFormVisible, setNeighborhoodFormVisible] = useState(false);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<LocationData>('/api/super-admin/locations');
      setLocations(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0645\u06a9\u0627\u0646\u200c\u0647\u0627');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    const handler = () => void loadLocations();
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [loadLocations]);

  const provinces = useMemo(
    () => locations?.countries.find((c) => c.id === 'iran')?.provinces ?? [],
    [locations]
  );

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.id === locationForm.provinceId) ?? provinces[0],
    [locationForm.provinceId, provinces]
  );

  const cities = selectedProvince?.cities ?? [];
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === locationForm.cityId) ?? cities[0],
    [cities, locationForm.cityId]
  );

  const openNeighborhoodManage = useCallback(
    (ctx: NeighborhoodManageContext) => {
      setNeighborhoodFormVisible(false);
      setLocationForm(initialLocationForm);
      setNeighborhoodManage(ctx);
      onFullPageChange?.(true);
    },
    [onFullPageChange]
  );

  const closeNeighborhoodManage = useCallback(() => {
    setNeighborhoodManage(null);
    setNeighborhoodFormVisible(false);
    setLocationForm(initialLocationForm);
    onFullPageChange?.(false);
  }, [onFullPageChange]);

  const saveLocation = async () => {
    const areas =
      locationForm.type === 'neighborhood' && locationForm.areasText.trim()
        ? locationForm.areasText
            .split(/[\n,\u060C]/)
            .map((a) => a.trim())
            .filter(Boolean)
        : undefined;

    const payload = {
      ...locationForm,
      provinceId: locationForm.provinceId || selectedProvince?.id || '',
      cityId: locationForm.cityId || selectedCity?.id || '',
      order: Number(locationForm.order) || 0,
      areas,
    };

    try {
      const method = locationForm.id ? 'PATCH' : 'POST';
      const nextLocations = await apiFetch<LocationData>('/api/super-admin/locations', {
        method,
        body: JSON.stringify(payload),
      });
      setLocations(nextLocations);
      if (neighborhoodManage) {
        setNeighborhoodFormVisible(false);
        setLocationForm(initialLocationForm);
      } else {
        setLocationForm({
          ...initialLocationForm,
          provinceId: locationForm.provinceId,
          cityId: locationForm.cityId,
          type: locationForm.type,
        });
      }
      toast.success(
        locationForm.id
          ? '\u0645\u0648\u0642\u0639\u06cc\u062a \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0634\u062f'
          : '\u0645\u0648\u0642\u0639\u06cc\u062a \u062c\u062f\u06cc\u062f \u0633\u0627\u062e\u062a\u0647 \u0634\u062f'
      );
      await loadLocations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '\u062e\u0637\u0627 \u062f\u0631 \u0630\u062e\u06cc\u0631\u0647 \u0645\u0648\u0642\u0639\u06cc\u062a');
    }
  };

  const editLocation = (
    type: LocationType,
    item: ManagedProvince | ManagedCity | ManagedNeighborhood,
    ctx?: { provinceId?: string; cityId?: string }
  ) => {
    const areasText =
      type === 'neighborhood' && 'areas' in item && item.areas?.length
        ? item.areas.join('\n')
        : '';
    setLocationForm((current) => ({
      ...current,
      id: item.id,
      type,
      name: item.name,
      nameEn: item.nameEn || '',
      order: String(item.order ?? 0),
      isActive: item.isActive,
      isPopular: 'isPopular' in item ? Boolean(item.isPopular) : false,
      isIsland: 'isIsland' in item ? Boolean(item.isIsland) : false,
      areasText,
      provinceId: ctx?.provinceId ?? (type === 'province' ? item.id : current.provinceId),
      cityId:
        ctx?.cityId ??
        (type === 'city' ? item.id : type === 'neighborhood' ? current.cityId : ''),
    }));
  };

  const startAddNeighborhood = (ctx: { provinceId: string; cityId: string }) => {
    setLocationForm({
      ...initialLocationForm,
      type: 'neighborhood',
      provinceId: ctx.provinceId,
      cityId: ctx.cityId,
    });
  };

  const deleteLocation = async (type: LocationType, id: string) => {
    try {
      const nextLocations = await apiFetch<LocationData>('/api/super-admin/locations', {
        method: 'DELETE',
        body: JSON.stringify({ type, id }),
      });
      setLocations(nextLocations);
      toast.success('\u0645\u0648\u0642\u0639\u06cc\u062a \u062d\u0630\u0641 \u0634\u062f');
      await loadLocations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '\u062e\u0637\u0627 \u062f\u0631 \u062d\u0630\u0641 \u0645\u0648\u0642\u0639\u06cc\u062a');
    }
  };

  if (isLoading && !neighborhoodManage) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-(--color-secondaryText)">
        {'\u062f\u0631 \u062d\u0627\u0644 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0645\u06a9\u0627\u0646\u200c\u0647\u0627\u2026'}
      </div>
    );
  }

  if (neighborhoodManage) {
    return (
      <>
        {neighborhoodFormVisible &&
          locationForm.type === 'neighborhood' &&
          locationForm.cityId === neighborhoodManage.city.id && (
            <NeighborhoodLocationForm
              cityName={neighborhoodManage.city.name}
              values={{
                id: locationForm.id,
                name: locationForm.name,
                nameEn: locationForm.nameEn,
                order: locationForm.order,
                isActive: locationForm.isActive,
                areasText: locationForm.areasText,
              }}
              onChange={(patch) => setLocationForm((c) => ({ ...c, ...patch }))}
              onSave={() => void saveLocation()}
              onCancel={() => {
                setNeighborhoodFormVisible(false);
                setLocationForm(initialLocationForm);
              }}
            />
          )}
        <NeighborhoodsManagePage
          city={neighborhoodManage.city}
          provinceName={neighborhoodManage.provinceName}
          onBack={closeNeighborhoodManage}
          onEdit={(n) => {
            editLocation('neighborhood', n, {
              provinceId: neighborhoodManage.provinceId,
              cityId: neighborhoodManage.city.id,
            });
            setNeighborhoodFormVisible(true);
          }}
          onDelete={(id) => void deleteLocation('neighborhood', id)}
          onAdd={() => {
            startAddNeighborhood({
              provinceId: neighborhoodManage.provinceId,
              cityId: neighborhoodManage.city.id,
            });
            setNeighborhoodFormVisible(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <AdminPanel
        variant="form"
        title={
          locationForm.id
            ? '\u0648\u06cc\u0631\u0627\u06cc\u0634 \u0645\u0648\u0642\u0639\u06cc\u062a'
            : '\u0627\u0641\u0632\u0648\u062f\u0646 \u0645\u0648\u0642\u0639\u06cc\u062a'
        }
        description={
          '\u0627\u0633\u062a\u0627\u0646\u060c \u0634\u0647\u0631 \u0648 \u0645\u062d\u0644\u0647 \u0628\u0647 \u0635\u0648\u0631\u062a \u0633\u0644\u0633\u0644\u0647\u200c\u0645\u0631\u0627\u062a\u0628\u06cc \u0645\u062f\u06cc\u0631\u06cc\u062a \u0645\u06cc\u200c\u0634\u0648\u062f.'
        }
        icon={MapPinned}
        className="h-fit xl:sticky xl:top-20"
      >
        <div className="space-y-4">
          <Field label={'\u0646\u0648\u0639'}>
            <Select
              value={locationForm.type}
              onValueChange={(value) =>
                setLocationForm({ ...locationForm, type: value as LocationType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="province">{'\u0627\u0633\u062a\u0627\u0646'}</SelectItem>
                <SelectItem value="city">{'\u0634\u0647\u0631'}</SelectItem>
                <SelectItem value="neighborhood">{'\u0645\u062d\u0644\u0647'}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {locationForm.type !== 'province' && (
            <Field label={'\u0627\u0633\u062a\u0627\u0646 \u0648\u0627\u0644\u062f'}>
              <Select
                value={locationForm.provinceId || selectedProvince?.id || ''}
                onValueChange={(value) =>
                  setLocationForm({ ...locationForm, provinceId: value, cityId: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province.id} value={province.id}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {locationForm.type === 'neighborhood' && (
            <Field label={'\u0634\u0647\u0631 \u0648\u0627\u0644\u062f'}>
              <Select
                value={locationForm.cityId || selectedCity?.id || ''}
                onValueChange={(value) => setLocationForm({ ...locationForm, cityId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city, cityIndex) => (
                    <SelectItem
                      key={`${selectedProvince?.id || 'p'}-${city.id}-${cityIndex}`}
                      value={city.id}
                    >
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label={'\u0646\u0627\u0645 \u0641\u0627\u0631\u0633\u06cc'}>
            <Input
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
            />
          </Field>
          <Field label={'\u0646\u0627\u0645 \u0627\u0646\u06af\u0644\u06cc\u0633\u06cc'}>
            <Input
              dir="ltr"
              value={locationForm.nameEn}
              onChange={(e) => setLocationForm({ ...locationForm, nameEn: e.target.value })}
            />
          </Field>
          <Field label={'\u062a\u0631\u062a\u06cc\u0628'}>
            <PersianDigitInput
              variant="plain"
              value={locationForm.order}
              onChange={(order) => setLocationForm({ ...locationForm, order })}
            />
          </Field>
          {locationForm.type === 'neighborhood' && (
            <Field
              label={
                '\u0632\u06cc\u0631\u0645\u062d\u062f\u0648\u062f\u0647\u200c\u0647\u0627 (\u0647\u0631 \u062e\u0637 \u06cc\u0627 \u0628\u0627 \u0648\u06cc\u0631\u06af\u0648\u0644)'
              }
            >
              <Textarea
                value={locationForm.areasText}
                onChange={(e) =>
                  setLocationForm({ ...locationForm, areasText: e.target.value })
                }
                className="min-h-[100px]"
              />
            </Field>
          )}
          <div className="grid gap-2">
            <AdminToggleRow label={'\u0641\u0639\u0627\u0644 \u0628\u0627\u0634\u062f'}>
              <Switch
                checked={locationForm.isActive}
                onCheckedChange={(checked) =>
                  setLocationForm({ ...locationForm, isActive: checked })
                }
              />
            </AdminToggleRow>
            {locationForm.type === 'city' && (
              <>
                <AdminToggleRow label={'\u0634\u0647\u0631 \u0645\u062d\u0628\u0648\u0628'}>
                  <Switch
                    checked={locationForm.isPopular}
                    onCheckedChange={(checked) =>
                      setLocationForm({ ...locationForm, isPopular: checked })
                    }
                  />
                </AdminToggleRow>
                <AdminToggleRow label={'\u062c\u0632\u06cc\u0631\u0647'}>
                  <Switch
                    checked={locationForm.isIsland}
                    onCheckedChange={(checked) =>
                      setLocationForm({ ...locationForm, isIsland: checked })
                    }
                  />
                </AdminToggleRow>
              </>
            )}
          </div>
          <AdminPanelActions>
            <Button onClick={() => void saveLocation()} className="admin-btn-save flex-1">
              <Save className="size-4" />
              {'\u0630\u062e\u06cc\u0631\u0647'}
            </Button>
            <Button variant="outline" onClick={() => setLocationForm(initialLocationForm)}>
              {'\u067e\u0627\u06a9\u200c\u0633\u0627\u0632\u06cc'}
            </Button>
          </AdminPanelActions>
        </div>
      </AdminPanel>

      <LocationsHierarchyView
        provinces={provinces}
        stats={locations?.stats}
        onEditProvince={(p) => editLocation('province', p)}
        onDeleteProvince={(id) => void deleteLocation('province', id)}
        onEditCity={(city, provinceId) => editLocation('city', city, { provinceId })}
        onDeleteCity={(id) => void deleteLocation('city', id)}
        onManageNeighborhoods={openNeighborhoodManage}
      />
    </div>
  );
}
