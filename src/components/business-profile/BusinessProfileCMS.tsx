'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package, ImageIcon, Building2, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getBlueprintForCategorySlug } from '@/config/business-profile-blueprints';
import type { CmsModule } from '@/config/business-profile-blueprints/types';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type OfferRow = {
  id: string;
  title: string;
  description: string;
  priceRange?: string;
};

type PortfolioRow = {
  id: string;
  title: string;
  mediaUrl: string;
};

type CompanyForm = {
  legalName: string;
  registrationNumber: string;
  industry: string;
  employeeCount: string;
  website: string;
  description: string;
};

export function BusinessProfileCMS() {
  const [modules, setModules] = useState<CmsModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [company, setCompany] = useState<CompanyForm>({
    legalName: '',
    registrationNumber: '',
    industry: '',
    employeeCount: '',
    website: '',
    description: '',
  });
  const [newOffer, setNewOffer] = useState({ title: '', description: '', priceRange: '' });
  const [newPortfolio, setNewPortfolio] = useState({ title: '', mediaUrl: '' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, offersRes, portRes, extRes] = await Promise.all([
        fetch('/api/business/me/categories', { headers: getAuthHeaders() }),
        fetch('/api/business/me/offers', { headers: getAuthHeaders() }),
        fetch('/api/business/me/portfolio', { headers: getAuthHeaders() }),
        fetch('/api/business/me/extensions', { headers: getAuthHeaders() }),
      ]);

      if (catRes.ok) {
        const cat = (await catRes.json()) as { primaryCategorySlug?: string };
        if (cat.primaryCategorySlug) {
          const bp = getBlueprintForCategorySlug(cat.primaryCategorySlug);
          setModules(bp.cmsModules);
        }
      }
      if (offersRes.ok) {
        const data = (await offersRes.json()) as { offers?: OfferRow[] };
        setOffers(data.offers ?? []);
      }
      if (portRes.ok) {
        const data = (await portRes.json()) as { items?: PortfolioRow[] };
        setPortfolio(data.items ?? []);
      }
      if (extRes.ok) {
        const data = (await extRes.json()) as { extensions?: { company?: CompanyForm } };
        if (data.extensions?.company) {
          setCompany((prev) => ({ ...prev, ...data.extensions!.company! }));
        }
      }
    } catch {
      toast.error('خطا در بارگذاری داده‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addOffer = async () => {
    if (!newOffer.title.trim() || !newOffer.description.trim()) return;
    const res = await fetch('/api/business/me/offers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newOffer),
    });
    if (!res.ok) {
      toast.error('افزودن محصول/خدمت ناموفق بود');
      return;
    }
    setNewOffer({ title: '', description: '', priceRange: '' });
    toast.success('ذخیره شد');
    loadAll();
  };

  const deleteOffer = async (id: string) => {
    await fetch(`/api/business/me/offers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    loadAll();
  };

  const addPortfolio = async () => {
    if (!newPortfolio.title.trim() || !newPortfolio.mediaUrl.trim()) return;
    const res = await fetch('/api/business/me/portfolio', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newPortfolio),
    });
    if (!res.ok) {
      toast.error('افزودن به گالری ناموفق بود');
      return;
    }
    setNewPortfolio({ title: '', mediaUrl: '' });
    toast.success('ذخیره شد');
    loadAll();
  };

  const deletePortfolio = async (id: string) => {
    await fetch(`/api/business/me/portfolio/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    loadAll();
  };

  const saveCompany = async () => {
    const res = await fetch('/api/business/me/extensions', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ extensions: { company } }),
    });
    if (!res.ok) {
      toast.error('ذخیره مشخصات شرکت ناموفق بود');
      return;
    }
    toast.success('مشخصات شرکت ذخیره شد');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          در حال بارگذاری مدیریت پروفایل...
        </CardContent>
      </Card>
    );
  }

  const showOffers = modules.includes('offers');
  const showPortfolio = modules.includes('portfolio');
  const showCompany = modules.includes('companyInfo');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">مدیریت پروفایل کسب‌وکار</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          محتوای عمومی پروفایل `/b/...` را از اینجا ویرایش کنید. تب‌ها و بخش‌ها بر اساس دسته‌بندی
          انتخاب‌شده در بخش «دسته‌بندی» تنظیم می‌شوند.
        </CardContent>
      </Card>

      {showOffers && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Package className="size-4 text-primary" />
            <CardTitle className="text-base">محصولات / خدمات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offers.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.priceRange ?? '—'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteOffer(o.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>عنوان</Label>
                <Input value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>قیمت</Label>
                <Input value={newOffer.priceRange} onChange={(e) => setNewOffer({ ...newOffer, priceRange: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>توضیحات</Label>
                <Textarea value={newOffer.description} onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })} rows={2} />
              </div>
            </div>
            <Button size="sm" onClick={addOffer}>
              <Plus className="ml-1 size-4" />
              افزودن
            </Button>
          </CardContent>
        </Card>
      )}

      {showPortfolio && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ImageIcon className="size-4 text-primary" />
            <CardTitle className="text-base">گالری / نمونه‌کار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolio.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <p className="font-medium">{p.title}</p>
                <Button variant="ghost" size="icon" onClick={() => deletePortfolio(p.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>عنوان</Label>
                <Input value={newPortfolio.title} onChange={(e) => setNewPortfolio({ ...newPortfolio, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>URL تصویر</Label>
                <Input dir="ltr" value={newPortfolio.mediaUrl} onChange={(e) => setNewPortfolio({ ...newPortfolio, mediaUrl: e.target.value })} />
              </div>
            </div>
            <Button size="sm" onClick={addPortfolio}>
              <Plus className="ml-1 size-4" />
              افزودن
            </Button>
          </CardContent>
        </Card>
      )}

      {showCompany && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Building2 className="size-4 text-primary" />
            <CardTitle className="text-base">مشخصات شرکت</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>نام رسمی</Label>
              <Input value={company.legalName} onChange={(e) => setCompany({ ...company, legalName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>شماره ثبت</Label>
              <Input value={company.registrationNumber} onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>حوزه فعالیت</Label>
              <Input value={company.industry} onChange={(e) => setCompany({ ...company, industry: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>تعداد پرسنل</Label>
              <Input value={company.employeeCount} onChange={(e) => setCompany({ ...company, employeeCount: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>وب‌سایت</Label>
              <Input dir="ltr" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>توضیحات</Label>
              <Textarea value={company.description} onChange={(e) => setCompany({ ...company, description: e.target.value })} rows={3} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={saveCompany}>ذخیره مشخصات شرکت</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
