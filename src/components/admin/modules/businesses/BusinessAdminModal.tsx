'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import type {
  BusinessDetail,
  BusinessMemberRow,
  BusinessOfferRow,
  BusinessOutreachRow,
  BusinessPortfolioRow,
  BusinessProfileForm,
  BusinessReviewRow,
  BusinessTabId,
} from './types';
import { BusinessEcosystemAdminTab } from './BusinessEcosystemAdminTab';

const TABS: { id: BusinessTabId; label: string }[] = [
  { id: 'overview', label: 'خلاصه' },
  { id: 'edit', label: 'ویرایش' },
  { id: 'team', label: 'مالک و تیم' },
  { id: 'offers', label: 'پیشنهادها' },
  { id: 'portfolio', label: 'نمونه‌کار' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'reviews', label: 'نظرات' },
  { id: 'ecosystem', label: 'اکوسیستم' },
  { id: 'moderation', label: 'بازبینی' },
];

function ownerLabel(u: { displayName: string | null; firstName: string | null; lastName: string | null; phone: string }) {
  return u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.phone;
}

function detailToForm(d: BusinessDetail): BusinessProfileForm {
  return {
    name: d.name,
    slug: d.slug,
    description: d.description ?? '',
    city: d.city ?? '',
    province: d.province ?? '',
    address: d.address ?? '',
    phone: d.phone ?? '',
    whatsapp: d.whatsapp ?? '',
    email: d.email ?? '',
    status: d.status,
    verified: d.verified,
    leadAlertsEnabled: d.leadAlertsEnabled,
    chatEnabled: d.chatEnabled,
  };
}

export function BusinessAdminModal({
  businessId,
  open,
  onOpenChange,
  onChanged,
  initialTab = 'overview',
}: {
  businessId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
  initialTab?: BusinessTabId;
}) {
  const { apiFetch, hasPermission } = useAdmin();
  const canWrite = hasPermission('market:businesses:write');
  const canModerate = hasPermission('market:businesses:moderate');
  const canOutreachWrite = hasPermission('market:outreach:write');
  const canReviewModerate = hasPermission('content:reviews:moderate');

  const [tab, setTab] = useState<BusinessTabId>(initialTab);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [form, setForm] = useState<BusinessProfileForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [moderateReason, setModerateReason] = useState('');

  const [members, setMembers] = useState<BusinessMemberRow[]>([]);
  const [owner, setOwner] = useState<BusinessDetail['user'] | null>(null);
  const [offers, setOffers] = useState<BusinessOfferRow[]>([]);
  const [portfolio, setPortfolio] = useState<BusinessPortfolioRow[]>([]);
  const [outreach, setOutreach] = useState<BusinessOutreachRow[]>([]);
  const [reviews, setReviews] = useState<BusinessReviewRow[]>([]);

  const [newOffer, setNewOffer] = useState({ title: '', description: '', priceRange: '' });
  const [newPortfolio, setNewPortfolio] = useState({ title: '', mediaUrl: '' });

  const loadDetail = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const res = await apiFetch<{ business: BusinessDetail }>(`/api/super-admin/businesses/${businessId}`);
      setDetail(res.business);
      setForm(detailToForm(res.business));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, businessId, onOpenChange]);

  useEffect(() => {
    if (open && businessId) {
      setTab(initialTab);
      void loadDetail();
    }
    if (!open) {
      setDetail(null);
      setForm(null);
      setMembers([]);
      setOffers([]);
      setPortfolio([]);
      setOutreach([]);
      setReviews([]);
      setModerateReason('');
    }
  }, [open, businessId, initialTab, loadDetail]);

  const loadTabData = useCallback(async () => {
    if (!businessId) return;
    try {
      if (tab === 'team') {
        const res = await apiFetch<{ owner: BusinessDetail['user']; members: BusinessMemberRow[] }>(
          `/api/super-admin/businesses/${businessId}/members`
        );
        setOwner(res.owner);
        setMembers(res.members);
      } else if (tab === 'offers') {
        const res = await apiFetch<{ offers: BusinessOfferRow[] }>(`/api/super-admin/businesses/${businessId}/offers`);
        setOffers(res.offers);
      } else if (tab === 'portfolio') {
        const res = await apiFetch<{ items: BusinessPortfolioRow[] }>(
          `/api/super-admin/businesses/${businessId}/portfolio`
        );
        setPortfolio(res.items);
      } else if (tab === 'outreach') {
        const res = await apiFetch<{ outreach: BusinessOutreachRow[] }>(
          `/api/super-admin/outreach?businessProfileId=${businessId}&limit=50`
        );
        setOutreach(res.outreach);
      } else if (tab === 'reviews') {
        const res = await apiFetch<{ reviews: BusinessReviewRow[] }>(
          `/api/super-admin/business-reviews?profileId=${businessId}&limit=50`
        );
        setReviews(res.reviews);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  }, [apiFetch, businessId, tab]);

  useEffect(() => {
    if (open && businessId && tab !== 'overview' && tab !== 'edit' && tab !== 'moderation') {
      void loadTabData();
    }
  }, [open, businessId, tab, loadTabData]);

  const saveProfile = async () => {
    if (!businessId || !form) return;
    setIsSaving(true);
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      toast.success('ذخیره شد');
      await loadDetail();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsSaving(false);
    }
  };

  const moderate = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: moderateReason }),
      });
      toast.success('اقدام ثبت شد');
      await loadDetail();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const updateMemberRole = async (userId: string, role: string) => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ userId, role }),
      });
      toast.success('نقش به‌روزرسانی شد');
      void loadTabData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const removeMember = async (userId: string) => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/members?userId=${userId}`, { method: 'DELETE' });
      toast.success('عضو حذف شد');
      void loadTabData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const createOffer = async () => {
    if (!businessId || !newOffer.title.trim()) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/offers`, {
        method: 'POST',
        body: JSON.stringify(newOffer),
      });
      toast.success('پیشنهاد اضافه شد');
      setNewOffer({ title: '', description: '', priceRange: '' });
      void loadTabData();
      void loadDetail();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const toggleOfferPublish = async (offer: BusinessOfferRow) => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/offers/${offer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !offer.isPublished }),
      });
      void loadTabData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/offers/${offerId}`, { method: 'DELETE' });
      toast.success('حذف شد');
      void loadTabData();
      void loadDetail();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const createPortfolio = async () => {
    if (!businessId || !newPortfolio.title.trim() || !newPortfolio.mediaUrl.trim()) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/portfolio`, {
        method: 'POST',
        body: JSON.stringify(newPortfolio),
      });
      toast.success('نمونه‌کار اضافه شد');
      setNewPortfolio({ title: '', mediaUrl: '' });
      void loadTabData();
      void loadDetail();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const togglePortfolioPublish = async (item: BusinessPortfolioRow) => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/portfolio/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      void loadTabData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const deletePortfolio = async (itemId: string) => {
    if (!businessId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/portfolio/${itemId}`, { method: 'DELETE' });
      toast.success('حذف شد');
      void loadTabData();
      void loadDetail();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const retryOutreach = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/outreach/${id}/retry`, { method: 'POST' });
      toast.success('retry اجرا شد');
      void loadTabData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const toggleReviewPublish = async (review: BusinessReviewRow) => {
    try {
      await apiFetch('/api/super-admin/business-reviews', {
        method: 'PATCH',
        body: JSON.stringify({ id: review.id, isPublished: !review.isPublished }),
      });
      void loadTabData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const setField = <K extends keyof BusinessProfileForm>(key: K, value: BusinessProfileForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-content-zone flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {detail?.name ?? 'کسب‌وکار'}
            {detail && (
              <>
                <AdminBadge variant={detail.status === 'ACTIVE' ? 'success' : 'neutral'}>{detail.status}</AdminBadge>
                {detail.verified ? (
                  <AdminBadge variant="success">تأیید شده</AdminBadge>
                ) : (
                  <AdminBadge variant="warning">تأیید نشده</AdminBadge>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap gap-1 border-b border-(--color-mainBorder) pb-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? 'default' : 'outline'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {isLoading || !detail ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-(--color-secondaryText)" />
            </div>
          ) : tab === 'overview' ? (
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 rounded-lg border border-(--color-mainBorder) p-3 sm:grid-cols-2">
                <p>پیشنهادها: {detail._count.offers}</p>
                <p>نمونه‌کار: {detail._count.portfolioItems}</p>
                <p>نظرات: {detail._count.profileReviews}</p>
                <p>Outreach: {detail._count.leadOutreach}</p>
                <p>اعضای تیم: {detail._count.members}</p>
                <p>امتیاز: {detail.rating.toFixed(1)} ({detail.reviewCount})</p>
              </div>
              <p>شهر: {detail.city ?? '—'} · استان: {detail.province ?? '—'}</p>
              <p className="text-(--color-secondaryText)">{detail.description || '—'}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/b/${detail.slug}`} target="_blank">
                    <ExternalLink className="size-4" />
                    پروفایل عمومی
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${ADMIN_SECTION_ROUTES.users}?q=${encodeURIComponent(detail.user.phone)}`}>
                    مالک در CRM
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-(--color-secondaryText)">
                ایجاد: {new Date(detail.createdAt).toLocaleString('fa-IR')} · به‌روزرسانی:{' '}
                {new Date(detail.updatedAt).toLocaleString('fa-IR')}
              </p>
              {!detail.onboardingCompletedAt && (
                <AdminBadge variant="warning">onboarding ناقص</AdminBadge>
              )}
            </div>
          ) : tab === 'edit' && form ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>نام</Label>
                  <Input className="admin-input" value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={!canWrite} />
                </div>
                <div className="space-y-1.5">
                  <Label>slug</Label>
                  <Input className="admin-input" dir="ltr" value={form.slug} onChange={(e) => setField('slug', e.target.value)} disabled={!canWrite} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>توضیحات</Label>
                <Textarea className="admin-input min-h-[80px]" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={!canWrite} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>شهر</Label>
                  <Input className="admin-input" value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={!canWrite} />
                </div>
                <div className="space-y-1.5">
                  <Label>استان</Label>
                  <Input className="admin-input" value={form.province} onChange={(e) => setField('province', e.target.value)} disabled={!canWrite} />
                </div>
                <div className="space-y-1.5">
                  <Label>وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setField('status', v)} disabled={!canWrite}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>آدرس</Label>
                <Input className="admin-input" value={form.address} onChange={(e) => setField('address', e.target.value)} disabled={!canWrite} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>تلفن</Label>
                  <Input className="admin-input" dir="ltr" value={form.phone} onChange={(e) => setField('phone', e.target.value)} disabled={!canWrite} />
                </div>
                <div className="space-y-1.5">
                  <Label>واتساپ</Label>
                  <Input className="admin-input" dir="ltr" value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} disabled={!canWrite} />
                </div>
                <div className="space-y-1.5">
                  <Label>ایمیل</Label>
                  <Input className="admin-input" dir="ltr" value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={!canWrite} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.verified} onCheckedChange={(v) => setField('verified', v)} disabled={!canWrite} />
                  تأیید شده
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.chatEnabled} onCheckedChange={(v) => setField('chatEnabled', v)} disabled={!canWrite} />
                  چت فعال
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.leadAlertsEnabled} onCheckedChange={(v) => setField('leadAlertsEnabled', v)} disabled={!canWrite} />
                  هشدار lead
                </label>
              </div>
              {canWrite && (
                <Button className="admin-btn-primary" disabled={isSaving} onClick={() => void saveProfile()}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : 'ذخیره تغییرات'}
                </Button>
              )}
            </div>
          ) : tab === 'team' ? (
            <div className="space-y-4 text-sm">
              {owner && (
                <div className="rounded-lg border border-(--color-mainBorder) p-3">
                  <p className="font-medium">مالک</p>
                  <p>{ownerLabel(owner)}</p>
                  <p dir="ltr" className="text-(--color-secondaryText)">{owner.phone}</p>
                </div>
              )}
              {members.length === 0 ? (
                <p className="text-(--color-secondaryText)">عضو تیمی ثبت نشده</p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--color-mainBorder) p-3">
                    <div>
                      <p className="font-medium">{ownerLabel(m.user)}</p>
                      <p dir="ltr" className="text-xs text-(--color-secondaryText)">{m.user.phone}</p>
                      <AdminBadge variant="info">{m.role}</AdminBadge>
                    </div>
                    {canWrite && m.role !== 'OWNER' && (
                      <div className="flex flex-wrap gap-2">
                        <Select value={m.role} onValueChange={(role) => void updateMemberRole(m.userId, role)}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANAGER">MANAGER</SelectItem>
                            <SelectItem value="STAFF">STAFF</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="destructive" onClick={() => void removeMember(m.userId)}>
                          حذف
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : tab === 'offers' ? (
            <div className="space-y-3">
              {canWrite && (
                <div className="space-y-2 rounded-lg border border-dashed border-(--color-mainBorder) p-3">
                  <Input placeholder="عنوان پیشنهاد" value={newOffer.title} onChange={(e) => setNewOffer((p) => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="توضیحات" value={newOffer.description} onChange={(e) => setNewOffer((p) => ({ ...p, description: e.target.value }))} />
                  <Input placeholder="بازه قیمت" value={newOffer.priceRange} onChange={(e) => setNewOffer((p) => ({ ...p, priceRange: e.target.value }))} />
                  <Button size="sm" onClick={() => void createOffer()}>افزودن پیشنهاد</Button>
                </div>
              )}
              {offers.map((o) => (
                <div key={o.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-(--color-mainBorder) p-3 text-sm">
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-(--color-secondaryText)">{o.priceRange ?? '—'}</p>
                    <AdminBadge variant={o.isPublished ? 'success' : 'warning'}>
                      {o.isPublished ? 'منتشر' : 'مخفی'}
                    </AdminBadge>
                  </div>
                  {canWrite && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void toggleOfferPublish(o)}>
                        {o.isPublished ? 'مخفی' : 'انتشار'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteOffer(o.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : tab === 'portfolio' ? (
            <div className="space-y-3">
              {canWrite && (
                <div className="space-y-2 rounded-lg border border-dashed border-(--color-mainBorder) p-3">
                  <Input placeholder="عنوان" value={newPortfolio.title} onChange={(e) => setNewPortfolio((p) => ({ ...p, title: e.target.value }))} />
                  <Input placeholder="/uploads/..." dir="ltr" value={newPortfolio.mediaUrl} onChange={(e) => setNewPortfolio((p) => ({ ...p, mediaUrl: e.target.value }))} />
                  <Button size="sm" onClick={() => void createPortfolio()}>افزودن نمونه‌کار</Button>
                </div>
              )}
              {portfolio.map((item) => (
                <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-(--color-mainBorder) p-3 text-sm">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p dir="ltr" className="truncate text-xs text-(--color-secondaryText)">{item.mediaUrl}</p>
                    <AdminBadge variant={item.isPublished ? 'success' : 'warning'}>
                      {item.isPublished ? 'منتشر' : 'مخفی'}
                    </AdminBadge>
                  </div>
                  {canWrite && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void togglePortfolioPublish(item)}>
                        {item.isPublished ? 'مخفی' : 'انتشار'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deletePortfolio(item.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : tab === 'outreach' ? (
            <div className="space-y-2 text-sm">
              {outreach.length === 0 ? (
                <p className="text-(--color-secondaryText)">رکورد outreach یافت نشد</p>
              ) : (
                outreach.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--color-mainBorder) p-3">
                    <div>
                      <p className="font-medium">{o.request.title}</p>
                      <p className="text-xs text-(--color-secondaryText)">{o.matchReasonFa}</p>
                      <AdminBadge variant={o.status === 'FAILED' ? 'danger' : 'neutral'}>{o.status}</AdminBadge>
                    </div>
                    {canOutreachWrite && o.status === 'FAILED' && (
                      <Button size="sm" variant="outline" onClick={() => void retryOutreach(o.id)}>Retry</Button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : tab === 'reviews' ? (
            <div className="space-y-2 text-sm">
              {reviews.length === 0 ? (
                <p className="text-(--color-secondaryText)">نظری ثبت نشده</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-(--color-mainBorder) p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{r.userName} · {r.rating}/5</span>
                      {canReviewModerate && (
                        <Button size="sm" variant="ghost" onClick={() => void toggleReviewPublish(r)}>
                          {r.isPublished ? 'مخفی' : 'انتشار'}
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-(--color-secondaryText)">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          ) : tab === 'ecosystem' && businessId ? (
            <BusinessEcosystemAdminTab businessId={businessId} canWrite={canWrite} />
          ) : tab === 'moderation' ? (
            <div className="space-y-3">
              <Textarea value={moderateReason} onChange={(e) => setModerateReason(e.target.value)} placeholder="دلیل (اختیاری)" rows={3} />
              {canModerate ? (
                <div className="flex flex-wrap gap-2">
                  <Button className="admin-btn-primary" onClick={() => void moderate('approve')}>تأیید و فعال‌سازی</Button>
                  <Button variant="destructive" onClick={() => void moderate('reject')}>رد</Button>
                  <Button variant="outline" onClick={() => void moderate('suspend')}>تعلیق</Button>
                </div>
              ) : (
                <p className="text-sm text-(--color-secondaryText)">مجوز moderation ندارید</p>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
