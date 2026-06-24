'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { routeBuilder } from '@/config/routes';
import { useBusinessHub } from '../BusinessHubContext';

const DELETED_ITEMS = [
  'پروفایل، لوگو، کاور و توضیحات',
  'آگهی‌ها، نمونه‌کارها و محصولات/خدمات',
  'محدوده خدمات، ویجت‌ها و مدارک',
  'اعضای تیم، مخاطبین و تنظیمات صفحه عمومی',
  'فایل‌های آپلودشده در پوشه کسب‌وکار',
];

export function BusinessDeletePanel() {
  const router = useRouter();
  const { profile } = useBusinessHub();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  const nameMatch = confirmName.trim() === profile.name.trim();

  const deleteBusiness = async () => {
    if (!nameMatch) {
      toast.error('نام واردشده با نام کسب‌وکار مطابقت ندارد');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/business/me', {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ confirmName: confirmName.trim() }),
      });
      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'حذف ناموفق بود');
        return;
      }

      toast.success(data.message ?? 'کسب‌وکار حذف شد');
      setOpen(false);
      router.replace(routeBuilder.dashboard());
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-destructive">حذف کامل کسب‌وکار</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              این عملیات برگشت‌ناپذیر است. پس از حذف، صفحه عمومی شما از دسترس خارج می‌شود و
              می‌توانید از ابتدا پروفایل جدید بسازید. فقط <strong>مالک حساب</strong> اجازه حذف
              دارد.
            </p>
          </div>

          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            {DELETED_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <AlertDialog open={open} onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmName('');
          }}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="size-4" />
                حذف کامل کسب‌وکار
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف دائمی «{profile.name}»؟</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      تمام اطلاعات کسب‌وکار، آگهی‌ها، نمونه‌کارها، تنظیمات ویجت، مدارک و فایل‌های
                      مرتبط برای همیشه پاک می‌شوند.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-business-name">
                        برای تأیید، نام کسب‌وکار را بنویسید:{' '}
                        <span className="font-semibold text-foreground">{profile.name}</span>
                      </Label>
                      <Input
                        id="confirm-business-name"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={profile.name}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!nameMatch || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    void deleteBusiness();
                  }}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      در حال حذف...
                    </>
                  ) : (
                    'بله، حذف شود'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
