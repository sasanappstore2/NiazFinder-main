'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Crown,
  Database,
  Edit3,
  FolderTree,
  Globe2,
  Layers3,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { SUPER_ADMIN_PHONE, isSuperAdminPhone } from '@/lib/super-admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Section = 'overview' | 'categories' | 'locations' | 'system';
type LocationType = 'province' | 'city' | 'neighborhood';

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalRequests: number;
  openRequests: number;
  totalProposals: number;
  totalCategories: number;
  inactiveCategories: number;
  totalReviews: number;
  totalTransactions: number;
  locations: {
    countries: number;
    provinces: number;
    activeProvinces: number;
    cities: number;
    activeCities: number;
    neighborhoods: number;
    activeNeighborhoods: number;
  };
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  requestCount: number;
  skillCount: number;
  childCount: number;
  children: AdminCategory[];
}

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  order: number;
}

interface ManagedNeighborhood {
  id: string;
  name: string;
  nameEn?: string;
  isActive: boolean;
  order: number;
}

interface ManagedCity {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  isPopular?: boolean;
  isIsland?: boolean;
  order: number;
  neighborhoods: ManagedNeighborhood[];
}

interface ManagedProvince {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  order: number;
  cities: ManagedCity[];
}

interface ManagedCountry {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  provinces: ManagedProvince[];
}

interface LocationData {
  countries: ManagedCountry[];
  updatedAt: string;
  stats?: OverviewStats['locations'];
}

interface CategoryFormState {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  parentId: string;
  order: string;
  isActive: boolean;
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
}

const initialCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'Globe',
  image: '',
  parentId: 'root',
  order: '0',
  isActive: true,
};

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
};

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString('fa-IR');
}

function UnauthorizedView() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-600">
        <Lock className="size-10" />
      </div>
      <h1 className="text-2xl font-black">دسترسی سوپرادمین محدود است</h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        این بخش فقط برای حسابی فعال می‌شود که با شماره
        <span dir="ltr" className="mx-1 font-mono font-bold text-foreground">{SUPER_ADMIN_PHONE}</span>
        وارد شده و نقش `SUPER_ADMIN` داشته باشد.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | undefined;
  icon: ElementType;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black">{formatNumber(value)}</p>
        </div>
        <div className={`flex size-12 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SuperAdminDashboard() {
  const currentUser = useAppStore((state) => state.currentUser);
  const authToken = useAppStore((state) => state.authToken);
  const [section, setSection] = useState<Section>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm);
  const [locations, setLocations] = useState<LocationData | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormState>(initialLocationForm);

  const isAllowed = Boolean(
    currentUser?.role === 'SUPER_ADMIN' && isSuperAdminPhone(currentUser.phone)
  );

  const apiFetch = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...((init?.headers as Record<string, string> | undefined) || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'عملیات انجام نشد');
    }

    return data as T;
  }, [authToken]);

  const loadAll = useCallback(async () => {
    if (!isAllowed || !authToken) return;

    setIsLoading(true);
    try {
      const [overviewData, categoryData, locationData] = await Promise.all([
        apiFetch<{ stats: OverviewStats }>('/api/super-admin/overview'),
        apiFetch<{ categories: AdminCategory[]; flatCategories: FlatCategory[] }>('/api/super-admin/categories'),
        apiFetch<LocationData>('/api/super-admin/locations'),
      ]);

      setOverview(overviewData.stats);
      setCategories(categoryData.categories);
      setFlatCategories(categoryData.flatCategories);
      setLocations(locationData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, authToken, isAllowed]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const provinces = useMemo(() => {
    return locations?.countries.find((country) => country.id === 'iran')?.provinces ?? [];
  }, [locations]);

  const selectedProvince = useMemo(() => {
    return provinces.find((province) => province.id === locationForm.provinceId) ?? provinces[0];
  }, [locationForm.provinceId, provinces]);

  const cities = selectedProvince?.cities ?? [];

  const selectedCity = useMemo(() => {
    return cities.find((city) => city.id === locationForm.cityId) ?? cities[0];
  }, [cities, locationForm.cityId]);

  const saveCategory = async () => {
    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      description: categoryForm.description,
      icon: categoryForm.icon,
      image: categoryForm.image,
      parentId: categoryForm.parentId === 'root' ? null : categoryForm.parentId,
      order: Number(categoryForm.order) || 0,
      isActive: categoryForm.isActive,
    };

    try {
      if (categoryForm.id) {
        await apiFetch(`/api/super-admin/categories/${categoryForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('دسته‌بندی بروزرسانی شد');
      } else {
        await apiFetch('/api/super-admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('دسته‌بندی جدید ساخته شد');
      }
      setCategoryForm(initialCategoryForm);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ذخیره دسته‌بندی');
    }
  };

  const editCategory = (category: AdminCategory | FlatCategory) => {
    const fullCategory = 'children' in category
      ? category
      : [...categories, ...categories.flatMap((item) => item.children)].find((item) => item.id === category.id);

    if (!fullCategory) return;

    setSection('categories');
    setCategoryForm({
      id: fullCategory.id,
      name: fullCategory.name,
      slug: fullCategory.slug,
      description: fullCategory.description || '',
      icon: fullCategory.icon || '',
      image: fullCategory.image || '',
      parentId: fullCategory.parentId || 'root',
      order: String(fullCategory.order ?? 0),
      isActive: fullCategory.isActive,
    });
  };

  const deleteCategory = async (id: string) => {
    try {
      const result = await apiFetch<{ mode: 'deleted' | 'deactivated'; message?: string }>(
        `/api/super-admin/categories/${id}`,
        { method: 'DELETE' }
      );
      toast.success(result.message || (result.mode === 'deleted' ? 'دسته‌بندی حذف شد' : 'دسته‌بندی غیرفعال شد'));
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف دسته‌بندی');
    }
  };

  const saveLocation = async () => {
    const payload = {
      ...locationForm,
      provinceId: locationForm.provinceId || selectedProvince?.id || '',
      cityId: locationForm.cityId || selectedCity?.id || '',
      order: Number(locationForm.order) || 0,
    };

    try {
      const method = locationForm.id ? 'PATCH' : 'POST';
      const nextLocations = await apiFetch<LocationData>('/api/super-admin/locations', {
        method,
        body: JSON.stringify(payload),
      });
      setLocations(nextLocations);
      setLocationForm({
        ...initialLocationForm,
        provinceId: locationForm.provinceId,
        cityId: locationForm.cityId,
        type: locationForm.type,
      });
      toast.success(locationForm.id ? 'موقعیت بروزرسانی شد' : 'موقعیت جدید ساخته شد');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ذخیره موقعیت');
    }
  };

  const editLocation = (type: LocationType, item: ManagedProvince | ManagedCity | ManagedNeighborhood) => {
    setSection('locations');
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
    }));
  };

  const deleteLocation = async (type: LocationType, id: string) => {
    try {
      const nextLocations = await apiFetch<LocationData>('/api/super-admin/locations', {
        method: 'DELETE',
        body: JSON.stringify({ type, id }),
      });
      setLocations(nextLocations);
      toast.success('موقعیت حذف شد');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف موقعیت');
    }
  };

  if (!isAllowed) return <UnauthorizedView />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950/[0.03] to-background px-4 pb-12 pt-2" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-cyan-500 to-violet-500" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                  <Crown className="size-7" />
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">SUPER_ADMIN</Badge>
                    <Badge variant="outline" dir="ltr">{SUPER_ADMIN_PHONE}</Badge>
                  </div>
                  <h1 className="text-2xl font-black sm:text-3xl">مرکز فرمان سوپرادمین نیازفایندر</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                    کنترل کامل کاربران، دسته‌بندی‌ها، زیردسته‌بندی‌ها، استان‌ها، شهرها و محله‌ها با دسترسی محدود به شماره مالک.
                  </p>
                </div>
              </div>
              <Button onClick={loadAll} variant="outline" disabled={isLoading}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                بروزرسانی داده‌ها
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-2 sm:grid-cols-4">
          {[
            { id: 'overview' as const, label: 'نمای کلی', icon: BarChart3 },
            { id: 'categories' as const, label: 'دسته‌بندی‌ها', icon: FolderTree },
            { id: 'locations' as const, label: 'مکان‌ها', icon: MapPin },
            { id: 'system' as const, label: 'حاکمیت سیستم', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={section === item.id ? 'default' : 'outline'}
                className="h-12 justify-start"
                onClick={() => setSection(item.id)}
              >
                <Icon className="size-4" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              در حال دریافت اطلاعات مدیریتی...
            </CardContent>
          </Card>
        )}

        {!isLoading && section === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="کل کاربران" value={overview?.totalUsers} icon={Users} tone="bg-emerald-500/10 text-emerald-600" />
              <StatCard title="نیازهای ثبت‌شده" value={overview?.totalRequests} icon={Database} tone="bg-cyan-500/10 text-cyan-600" />
              <StatCard title="دسته‌بندی‌ها" value={overview?.totalCategories} icon={FolderTree} tone="bg-violet-500/10 text-violet-600" />
              <StatCard title="شهرهای فعال" value={overview?.locations.activeCities} icon={Globe2} tone="bg-amber-500/10 text-amber-600" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-600" />
                  سطح دسترسی عملیاتی
                </CardTitle>
                <CardDescription>
                  سوپرادمین فعلی از شماره مجاز وارد شده و می‌تواند تمام بخش‌های حساس را مدیریت کند.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {[
                  `کاربران فعال: ${formatNumber(overview?.activeUsers)}`,
                  `کاربران مسدود: ${formatNumber(overview?.bannedUsers)}`,
                  `نیازهای باز: ${formatNumber(overview?.openRequests)}`,
                  `پیشنهادها: ${formatNumber(overview?.totalProposals)}`,
                  `نظرات: ${formatNumber(overview?.totalReviews)}`,
                  `محله‌ها: ${formatNumber(overview?.locations.neighborhoods)}`,
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && section === 'categories' && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>{categoryForm.id ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'}</CardTitle>
                <CardDescription>برای زیردسته، والد را انتخاب کنید.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="نام">
                  <Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
                </Field>
                <Field label="اسلاگ">
                  <Input dir="ltr" value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} placeholder="auto-generated-if-empty" />
                </Field>
                <Field label="والد">
                  <Select value={categoryForm.parentId} onValueChange={(value) => setCategoryForm({ ...categoryForm, parentId: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">دسته‌بندی اصلی</SelectItem>
                      {flatCategories.filter((category) => !category.parentId && category.id !== categoryForm.id).map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="آیکن Lucide">
                    <Input dir="ltr" value={categoryForm.icon} onChange={(event) => setCategoryForm({ ...categoryForm, icon: event.target.value })} />
                  </Field>
                  <Field label="ترتیب">
                    <Input type="number" value={categoryForm.order} onChange={(event) => setCategoryForm({ ...categoryForm, order: event.target.value })} />
                  </Field>
                </div>
                <Field label="تصویر">
                  <Input dir="ltr" value={categoryForm.image} onChange={(event) => setCategoryForm({ ...categoryForm, image: event.target.value })} />
                </Field>
                <Field label="توضیحات">
                  <Textarea value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
                </Field>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-sm font-medium">فعال باشد</span>
                  <Switch checked={categoryForm.isActive} onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveCategory} className="flex-1">
                    <Save className="size-4" />
                    ذخیره
                  </Button>
                  <Button variant="outline" onClick={() => setCategoryForm(initialCategoryForm)}>
                    پاک‌سازی
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ساختار دسته‌بندی‌ها</CardTitle>
                <CardDescription>ویرایش، غیرفعال‌سازی و حذف امن دسته‌ها و زیردسته‌ها.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black">{category.name}</h3>
                          <Badge variant={category.isActive ? 'default' : 'secondary'}>{category.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{category.slug}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatNumber(category.requestCount)} نیاز، {formatNumber(category.skillCount)} مهارت، {formatNumber(category.children.length)} زیردسته
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => editCategory(category)}><Edit3 className="size-3.5" />ویرایش</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteCategory(category.id)}><Trash2 className="size-3.5" />حذف</Button>
                      </div>
                    </div>
                    {category.children.length > 0 && (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {category.children.map((child) => (
                          <div key={child.id} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2">
                            <div>
                              <div className="flex items-center gap-2 text-sm font-bold">
                                <Layers3 className="size-4 text-muted-foreground" />
                                {child.name}
                                {!child.isActive && <Badge variant="secondary">غیرفعال</Badge>}
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">{child.slug}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => editCategory(child)}><Edit3 className="size-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteCategory(child.id)}><Trash2 className="size-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && section === 'locations' && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>{locationForm.id ? 'ویرایش موقعیت' : 'افزودن موقعیت'}</CardTitle>
                <CardDescription>استان، شهر و محله به صورت سلسله‌مراتبی مدیریت می‌شود.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="نوع">
                  <Select value={locationForm.type} onValueChange={(value) => setLocationForm({ ...locationForm, type: value as LocationType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="province">استان</SelectItem>
                      <SelectItem value="city">شهر</SelectItem>
                      <SelectItem value="neighborhood">محله</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {locationForm.type !== 'province' && (
                  <Field label="استان والد">
                    <Select value={locationForm.provinceId || selectedProvince?.id || ''} onValueChange={(value) => setLocationForm({ ...locationForm, provinceId: value, cityId: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.id}>{province.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                {locationForm.type === 'neighborhood' && (
                  <Field label="شهر والد">
                    <Select value={locationForm.cityId || selectedCity?.id || ''} onValueChange={(value) => setLocationForm({ ...locationForm, cityId: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field label="نام فارسی">
                  <Input value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} />
                </Field>
                <Field label="نام انگلیسی">
                  <Input dir="ltr" value={locationForm.nameEn} onChange={(event) => setLocationForm({ ...locationForm, nameEn: event.target.value })} />
                </Field>
                <Field label="ترتیب">
                  <Input type="number" value={locationForm.order} onChange={(event) => setLocationForm({ ...locationForm, order: event.target.value })} />
                </Field>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <span className="text-sm font-medium">فعال باشد</span>
                    <Switch checked={locationForm.isActive} onCheckedChange={(checked) => setLocationForm({ ...locationForm, isActive: checked })} />
                  </div>
                  {locationForm.type === 'city' && (
                    <>
                      <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                        <span className="text-sm font-medium">شهر محبوب</span>
                        <Switch checked={locationForm.isPopular} onCheckedChange={(checked) => setLocationForm({ ...locationForm, isPopular: checked })} />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                        <span className="text-sm font-medium">جزیره</span>
                        <Switch checked={locationForm.isIsland} onCheckedChange={(checked) => setLocationForm({ ...locationForm, isIsland: checked })} />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveLocation} className="flex-1">
                    <Save className="size-4" />
                    ذخیره
                  </Button>
                  <Button variant="outline" onClick={() => setLocationForm(initialLocationForm)}>
                    پاک‌سازی
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>استان‌ها، شهرها و محله‌ها</CardTitle>
                <CardDescription>
                  {formatNumber(locations?.stats?.provinces)} استان، {formatNumber(locations?.stats?.cities)} شهر، {formatNumber(locations?.stats?.neighborhoods)} محله
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {provinces.map((province) => (
                  <div key={province.id} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black">{province.name}</h3>
                          <Badge variant={province.isActive ? 'default' : 'secondary'}>{province.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{province.id} · {province.nameEn}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatNumber(province.cities.length)} شهر</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => editLocation('province', province)}><Edit3 className="size-3.5" />ویرایش</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteLocation('province', province.id)}><Trash2 className="size-3.5" />حذف</Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {province.cities.map((city) => (
                        <div key={city.id} className="rounded-xl border bg-background p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 text-sm font-bold">
                                <MapPin className="size-4 text-muted-foreground" />
                                {city.name}
                                {!city.isActive && <Badge variant="secondary">غیرفعال</Badge>}
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">{city.id}</p>
                              {city.neighborhoods.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">{formatNumber(city.neighborhoods.length)} محله</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => editLocation('city', city)}><Edit3 className="size-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteLocation('city', city.id)}><Trash2 className="size-4" /></Button>
                            </div>
                          </div>
                          {city.neighborhoods.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {city.neighborhoods.map((neighborhood) => (
                                <button
                                  key={neighborhood.id}
                                  type="button"
                                  onClick={() => editLocation('neighborhood', neighborhood)}
                                  className="rounded-full border bg-muted/40 px-2 py-1 text-[11px] hover:bg-muted"
                                >
                                  {neighborhood.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && section === 'system' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                حاکمیت و عملیات حساس
              </CardTitle>
              <CardDescription>
                این بخش برای کنترل دسترسی، کاربران و تصمیم‌های حساس سیستم است.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" className="h-14 justify-start" onClick={() => { window.location.href = '/admin/users'; }}>
                  <Users className="size-5" />
                  مدیریت کامل کاربران، نقش‌ها، مسدودسازی و تایید
                </Button>
                <Button variant="outline" className="h-14 justify-start" onClick={() => setSection('categories')}>
                  <Plus className="size-5" />
                  ساخت و ویرایش ساختار خدمات
                </Button>
              </div>
              <Separator />
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-900 dark:text-amber-200">
                نقش `SUPER_ADMIN` عمداً به شماره {SUPER_ADMIN_PHONE} محدود شده است. حتی اگر کاربر دیگری به صورت دستی نقش مشابه بگیرد، APIهای این بخش بدون تطابق شماره اجازه دسترسی نمی‌دهند.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
