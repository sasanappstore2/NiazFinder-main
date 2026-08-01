'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RealEstateCoverageFields,
  type RealEstateCoverageFieldsValue,
} from '@/components/business-profile/shared/RealEstateCoverageFields';
import { getClientAuthHeaders, getClientAuthJsonHeaders } from '@/lib/auth/client-auth';
import type { EcosystemExtension } from '@/lib/business/ecosystem';
import type { ServiceAreaEntry, WorkspaceFilingPreferences } from '@/lib/business/ecosystem/types';
import { emptyWorkspaceFilingPreferences } from '@/lib/business/workspace/filing-preferences';
import { WorkspaceFilingPreferenceFields } from './WorkspaceFilingPreferenceFields';

export function WorkspaceServiceAreaDialog({
  open,
  onOpenChange,
  businessCity,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessCity?: string;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<RealEstateCoverageFieldsValue>({
    serviceAreas: [],
    specializations: [],
    designStyles: [],
  });
  const [filingPreferences, setFilingPreferences] = useState<WorkspaceFilingPreferences>(
    emptyWorkspaceFilingPreferences()
  );

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    fetch('/api/business/me/ecosystem', { headers: getClientAuthHeaders() })
      .then((res) => res.json())
      .then((body: { ecosystem?: EcosystemExtension }) => {
        const serviceArea = body.ecosystem?.serviceArea;
        setValue({
          serviceAreas: serviceArea?.areas ?? [],
          specializations: [],
          designStyles: [],
        });
        setFilingPreferences(
          serviceArea?.filingPreferences ?? emptyWorkspaceFilingPreferences()
        );
      })
      .catch(() => {
        toast.error('بارگذاری محدوده‌ها ناموفق بود');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const save = async () => {
    const areas: ServiceAreaEntry[] = value.serviceAreas.filter((a) => a.city.trim());
    if (areas.length === 0) {
      toast.error('حداقل یک منطقه اضافه کنید');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business/me/ecosystem', {
        method: 'PATCH',
        headers: getClientAuthJsonHeaders(),
        body: JSON.stringify({
          serviceArea: {
            areas,
            filingPreferences,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((body as { error?: string }).error ?? 'ذخیره ناموفق بود');
        return;
      }
      toast.success('تنظیمات میزکار به‌روز شد');
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  const pinnedCity = businessCity?.trim() || undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>مناطق فعالیت و فیلتر فایلینگ</DialogTitle>
          <DialogDescription>
            محله‌های تحت پوشش و نوع فایل‌هایی که در میزکار می‌بینید را مشخص کنید.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : (
          <div className="space-y-5">
            <RealEstateCoverageFields
              value={value}
              onChange={setValue}
              config={{
                serviceArea: true,
                specializations: false,
                designStyles: false,
                variant: 'plain',
                pinnedCityName: pinnedCity,
                maxAreas: 12,
              }}
            />
            <WorkspaceFilingPreferenceFields
              value={filingPreferences}
              onChange={setFilingPreferences}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={() => void save()} disabled={loading || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'ذخیره'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
