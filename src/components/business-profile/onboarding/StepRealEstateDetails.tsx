'use client';

import { getPrimaryRealEstateSubtypeFromSlugs } from '@/lib/business/is-real-estate-business';
import { getRealEstateOnboardingConfig } from '@/lib/business/real-estate-onboarding-config';
import type { RealEstateOnboardingDetails } from '@/lib/business/onboarding-schema';
import {
  RealEstateCoverageFields,
  type RealEstateCoverageFieldsValue,
} from '@/components/business-profile/shared/RealEstateCoverageFields';

const EMPTY: RealEstateCoverageFieldsValue = {
  serviceAreas: [],
  specializations: [],
  designStyles: [],
};

export function StepRealEstateDetails({
  occupationSlugs,
  cityName = '',
  values,
  onChange,
}: {
  occupationSlugs: string[];
  cityName?: string;
  values: RealEstateOnboardingDetails;
  onChange: (patch: RealEstateOnboardingDetails) => void;
}) {
  const subtype = getPrimaryRealEstateSubtypeFromSlugs(occupationSlugs);
  const config = getRealEstateOnboardingConfig(subtype);

  const fieldValue: RealEstateCoverageFieldsValue = {
    serviceAreas: values.serviceAreas ?? [],
    specializations: values.specializations ?? [],
    designStyles: values.designStyles ?? [],
  };

  return (
    <div className="space-y-[21px]">
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground">
        {config.hint} لوگو، آگهی‌ها و مدارک را بعد از انتشار از پیشخوان املاک تکمیل می‌کنید.
      </div>

      <RealEstateCoverageFields
        value={fieldValue}
        onChange={(next) => onChange(next)}
        config={{
          ...config.fields,
          maxAreas: 12,
          variant: 'plain',
          pinnedCityName: cityName,
        }}
      />

      {fieldValue.serviceAreas.length === 0 &&
        fieldValue.specializations.length === 0 &&
        fieldValue.designStyles.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            می‌توانید این مرحله را خالی رد کنید و بعداً تکمیل کنید.
          </p>
        )}
    </div>
  );
}
