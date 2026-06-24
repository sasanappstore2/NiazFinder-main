'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getRealEstateOnboardingConfig } from '@/lib/business/real-estate-onboarding-config';
import type { RealEstateSubtype } from '@/lib/business/widget-registry';
import {
  RealEstateCoverageFields,
  type RealEstateCoverageFieldsValue,
} from '@/components/business-profile/shared/RealEstateCoverageFields';
import { useRealEstateHub } from '../RealEstateHubProvider';

export function RealEstateCoveragePanel() {
  const { subtype, ecosystem, tags, reLoading, saveEcosystem, saveTags } = useRealEstateHub();
  const [value, setValue] = useState<RealEstateCoverageFieldsValue>({
    serviceAreas: [],
    specializations: [],
    designStyles: [],
  });
  const [saving, setSaving] = useState(false);

  const config = getRealEstateOnboardingConfig(subtype as RealEstateSubtype);

  useEffect(() => {
    setValue({
      serviceAreas: ecosystem.serviceArea?.areas ?? [],
      specializations: ecosystem.specializations ?? [],
      designStyles: tags,
    });
  }, [ecosystem, tags]);

  if (reLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await saveEcosystem({
        serviceArea: { areas: value.serviceAreas },
        specializations: value.specializations,
      });
      if (subtype === 'architect') {
        await saveTags(value.designStyles);
      }
      toast.success('ذخیره شد');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        محدوده خدمات و تخصص‌ها در ویجت‌های «محدوده خدمات» و «تخصص‌ها» صفحه عمومی نمایش داده
        می‌شوند.
      </p>

      <RealEstateCoverageFields
        value={value}
        onChange={setValue}
        config={{
          ...config.fields,
          variant: 'card',
        }}
      />

      <div className="flex justify-end">
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره
        </Button>
      </div>
    </div>
  );
}
