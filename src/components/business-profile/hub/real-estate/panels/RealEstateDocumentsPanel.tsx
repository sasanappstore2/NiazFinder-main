'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VerificationDocument, VerificationDocumentType } from '@/lib/business/ecosystem/types';
import { useRealEstateHub } from '../RealEstateHubProvider';
import { HubMediaUpload } from '../shared/HubMediaUpload';

const DOC_TYPES: { value: VerificationDocumentType; label: string }[] = [
  { value: 'national_id', label: 'کارت ملی' },
  { value: 'real_estate_license', label: 'پروانه املاک' },
  { value: 'business_license', label: 'جواز کسب' },
  { value: 'union_membership', label: 'عضویت اتحادیه' },
  { value: 'certificate', label: 'گواهینامه' },
  { value: 'other', label: 'سایر' },
];

function newDocId(): string {
  return `doc_${Date.now().toString(36)}`;
}

export function RealEstateDocumentsPanel() {
  const { ecosystem, reLoading, saveEcosystem } = useRealEstateHub();
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [draft, setDraft] = useState({
    type: 'real_estate_license' as VerificationDocumentType,
    title: '',
    fileUrl: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDocuments(ecosystem.verification?.documents ?? []);
  }, [ecosystem]);

  if (reLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  const add = () => {
    if (!draft.title.trim() || !draft.fileUrl) {
      toast.error('عنوان و فایل الزامی است');
      return;
    }
    const doc: VerificationDocument = {
      id: newDocId(),
      type: draft.type,
      title: draft.title.trim(),
      fileUrl: draft.fileUrl,
      status: 'pending',
      uploadedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [...prev, doc]);
    setDraft({ type: 'real_estate_license', title: '', fileUrl: '' });
  };

  const remove = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveEcosystem({ verificationDocuments: documents });
      toast.success('مدارک ذخیره شد — پس از بررسی تأیید می‌شوند');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: VerificationDocument['status']) => {
    if (s === 'approved') return 'تأیید شده';
    if (s === 'rejected') return 'رد شده';
    return 'در انتظار بررسی';
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        تصویر مدارک خود را بارگذاری کنید. سطح احراز هویت پس از بررسی تیم نیازفایندر به‌روز
        می‌شود.
      </p>

      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <div>
            <p className="font-medium">{doc.title}</p>
            <p className="text-xs text-muted-foreground">{statusLabel(doc.status)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove(doc.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">بارگذاری مدرک جدید</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>نوع مدرک</Label>
            <Select
              value={draft.type}
              onValueChange={(v) => setDraft({ ...draft, type: v as VerificationDocumentType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>عنوان</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="مثلاً پروانه کسب ۱۴۰۳"
            />
          </div>
          <div className="sm:col-span-2">
            <HubMediaUpload
              label="تصویر مدرک"
              value={draft.fileUrl}
              onChange={(url) => setDraft({ ...draft, fileUrl: url })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={add} className="gap-1.5">
              <Plus className="size-4" />
              افزودن به لیست
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره مدارک
        </Button>
      </div>
    </div>
  );
}
