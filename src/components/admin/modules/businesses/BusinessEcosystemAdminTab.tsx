'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VerificationDocument, VerificationLevel } from '@/lib/business/ecosystem/types';

const LEVELS: VerificationLevel[] = ['basic', 'verified', 'professional', 'enterprise'];

const LEVEL_LABELS: Record<VerificationLevel, string> = {
  basic: 'پایه',
  verified: 'تأیید‌شده',
  professional: 'حرفه‌ای',
  enterprise: 'سازمانی',
};

export function BusinessEcosystemAdminTab({
  businessId,
  canWrite,
}: {
  businessId: string;
  canWrite: boolean;
}) {
  const { apiFetch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<VerificationLevel>('basic');
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ ecosystem: { verification?: { level?: VerificationLevel; documents?: VerificationDocument[] } } }>(
        `/api/super-admin/businesses/${businessId}/ecosystem`
      );
      setLevel(res.ecosystem.verification?.level ?? 'basic');
      setDocuments(res.ecosystem.verification?.documents ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری اکوسیستم');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDocStatus = (id: string, status: VerificationDocument['status']) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              reviewedAt: new Date().toISOString(),
            }
          : d
      )
    );
  };

  const save = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      await apiFetch(`/api/super-admin/businesses/${businessId}/ecosystem`, {
        method: 'PATCH',
        body: JSON.stringify({
          verificationLevel: level,
          documents,
        }),
      });
      toast.success('اکوسیستم ذخیره شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        بارگذاری مدارک و سطح احراز…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">سطح احراز هویت</p>
        <Select
          value={level}
          onValueChange={(v) => setLevel(v as VerificationLevel)}
          disabled={!canWrite}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {LEVEL_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">مدارک ارسالی ({documents.length})</p>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">مدرکی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.type}</p>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline"
                  >
                    مشاهده فایل
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      doc.status === 'approved'
                        ? 'default'
                        : doc.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {doc.status === 'approved'
                      ? 'تأیید'
                      : doc.status === 'rejected'
                        ? 'رد'
                        : 'در انتظار'}
                  </Badge>
                  {canWrite && (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="تأیید"
                        onClick={() => setDocStatus(doc.id, 'approved')}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="رد"
                        onClick={() => setDocStatus(doc.id, 'rejected')}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canWrite && (
        <Button onClick={() => void save()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          ذخیره تغییرات اکوسیستم
        </Button>
      )}
    </div>
  );
}
