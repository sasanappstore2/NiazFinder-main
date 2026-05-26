'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { routeBuilder } from '@/config/routes';
import { ModerationRejectDialog } from './ModerationRejectDialog';
import type { ModerationDetail } from './useModerationQueue';

type FormState = {
  title: string;
  description: string;
  city: string;
  province: string;
  priority: string;
  status: string;
  moderationStatus: string;
  rejectionReason: string;
};

function userLabel(u: ModerationDetail['user']) {
  return u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.phone;
}

export function RequestAdminModal({
  requestId,
  open,
  onOpenChange,
  onChanged,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const { apiFetch, hasPermission } = useAdmin();
  const canWrite = hasPermission('market:requests:write');
  const canModerate = hasPermission('market:requests:moderate');

  const [detail, setDetail] = useState<ModerationDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    setIsLoading(true);
    try {
      const res = await apiFetch<{ request: ModerationDetail }>(
        `/api/super-admin/requests/${requestId}`
      );
      setDetail(res.request);
      setForm({
        title: res.request.title,
        description: res.request.description,
        city: res.request.city ?? '',
        province: res.request.province ?? '',
        priority: res.request.priority,
        status: res.request.status,
        moderationStatus: res.request.moderationStatus,
        rejectionReason: res.request.rejectionReason ?? '',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, onOpenChange, requestId]);

  useEffect(() => {
    if (open && requestId) void load();
    if (!open) {
      setDetail(null);
      setForm(null);
    }
  }, [open, requestId, load]);

  const save = async () => {
    if (!requestId || !form || !canWrite) return;
    setIsSaving(true);
    try {
      await apiFetch(`/api/super-admin/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          city: form.city,
          province: form.province,
          priority: form.priority,
          status: form.status,
          moderationStatus: form.moderationStatus,
          rejectionReason: form.rejectionReason,
        }),
      });
      toast.success('ذخیره شد');
      onChanged?.();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره');
    } finally {
      setIsSaving(false);
    }
  };

  const moderate = async (action: 'approve' | 'reject_soft' | 'reject_final', reason?: string) => {
    if (!requestId || !canModerate) return;
    try {
      await apiFetch(`/api/super-admin/requests/${requestId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      toast.success(action === 'approve' ? 'تأیید شد' : 'رد شد');
      onChanged?.();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const unpublish = async () => {
    if (!requestId || !canModerate) return;
    try {
      await apiFetch(`/api/super-admin/requests/${requestId}/unpublish`, { method: 'POST' });
      toast.success('از انتشار خارج شد');
      onChanged?.();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const remove = async () => {
    if (!requestId || !canWrite) return;
    try {
      await apiFetch(`/api/super-admin/requests/${requestId}`, { method: 'DELETE' });
      toast.success('حذف شد');
      setDeleteOpen(false);
      onOpenChange(false);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const isPublished = detail?.moderationStatus === 'APPROVED' && detail?.status === 'OPEN';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="admin-content-zone max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              مدیریت نیاز
              {detail && <AdminBadge variant="info">{detail.moderationStatus}</AdminBadge>}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !form || !detail ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-(--color-secondaryText)" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg)/40 p-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-(--color-secondaryText)">کاربر: </span>
                  {userLabel(detail.user)}
                </div>
                <div>
                  <span className="text-(--color-secondaryText)">دسته: </span>
                  {detail.subcategory?.name ?? detail.category?.name ?? '—'}
                </div>
                <div className="sm:col-span-2 font-mono text-xs" dir="ltr">
                  /{detail.slug}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>عنوان</Label>
                <Input
                  className="admin-input"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  disabled={!canWrite}
                />
              </div>

              <div className="space-y-1.5">
                <Label>توضیحات</Label>
                <Textarea
                  className="admin-input min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  disabled={!canWrite}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>شهر</Label>
                  <Input
                    className="admin-input"
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    disabled={!canWrite}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>استان</Label>
                  <Input
                    className="admin-input"
                    value={form.province}
                    onChange={(e) => setField('province', e.target.value)}
                    disabled={!canWrite}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>اولویت</Label>
                  <Select value={form.priority} onValueChange={(v) => setField('priority', v)} disabled={!canWrite}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setField('status', v)} disabled={!canWrite}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['PENDING_REVIEW', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>بازبینی</Label>
                  <Select
                    value={form.moderationStatus}
                    onValueChange={(v) => setField('moderationStatus', v)}
                    disabled={!canWrite}
                  >
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['PENDING', 'APPROVED', 'REJECTED_SOFT', 'REJECTED_FINAL'].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>دلیل رد</Label>
                <Textarea
                  className="admin-input min-h-[60px]"
                  value={form.rejectionReason}
                  onChange={(e) => setField('rejectionReason', e.target.value)}
                  disabled={!canWrite}
                  placeholder="در صورت رد..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {isPublished && (
                <Button variant="outline" size="sm" asChild>
                  <a href={routeBuilder.listing(detail?.id ?? '', detail?.title)} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    مشاهده در سایت
                  </a>
                </Button>
              )}
              {canWrite && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" />
                  حذف
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canModerate && detail?.moderationStatus === 'APPROVED' && (
                <Button variant="outline" size="sm" onClick={() => void unpublish()}>
                  برداشتن از انتشار
                </Button>
              )}
              {canModerate && detail?.moderationStatus !== 'APPROVED' && (
                <Button variant="outline" size="sm" className="admin-btn-primary" onClick={() => void moderate('approve')}>
                  تأیید
                </Button>
              )}
              {canModerate && detail?.moderationStatus !== 'REJECTED_FINAL' && (
                <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}>
                  رد
                </Button>
              )}
              {canWrite && (
                <Button size="sm" className="admin-btn-primary" disabled={isSaving} onClick={() => void save()}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : 'ذخیره'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModerationRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={async (action, reason) => moderate(action, reason)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="admin-content-zone">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نیاز</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل آگهی را لغو می‌کند و از انتشار خارج می‌کند. ادامه می‌دهید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
