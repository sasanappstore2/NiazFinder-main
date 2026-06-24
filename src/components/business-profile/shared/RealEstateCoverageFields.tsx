'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SPECIALIZATION_LABELS,
  SPECIALIZATION_TAGS,
} from '@/lib/business/ecosystem/specialization';
import type { ServiceAreaEntry, SpecializationTag } from '@/lib/business/ecosystem/types';
import type { RealEstateOnboardingFieldFlags } from '@/lib/business/real-estate-onboarding-config';
import { ServiceAreaOnboardingFields } from '@/components/business-profile/shared/ServiceAreaOnboardingFields';
import { IncompleteFieldHighlight } from '@/components/business-profile/hub/real-estate/IncompleteFieldHighlight';

export type RealEstateCoverageFieldsValue = {
  serviceAreas: ServiceAreaEntry[];
  specializations: SpecializationTag[];
  designStyles: string[];
};

const EMPTY_AREA: ServiceAreaEntry = { city: '', district: '', neighborhood: '', strength: 3 };

export type RealEstateCoverageFieldsConfig = RealEstateOnboardingFieldFlags & {
  maxAreas?: number;
  variant?: 'card' | 'plain';
  /** Onboarding: city from contact step — only district/neighborhood inputs. */
  pinnedCityName?: string;
};

function Section({
  title,
  variant,
  children,
}: {
  title: string;
  variant: 'card' | 'plain';
  children: ReactNode;
}) {
  if (variant === 'plain') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function RealEstateCoverageFields({
  value,
  onChange,
  config,
}: {
  value: RealEstateCoverageFieldsValue;
  onChange: (next: RealEstateCoverageFieldsValue) => void;
  config: RealEstateCoverageFieldsConfig;
}) {
  const [draftArea, setDraftArea] = useState<ServiceAreaEntry>(EMPTY_AREA);
  const [newStyle, setNewStyle] = useState('');
  const variant = config.variant ?? 'card';
  const maxAreas = config.maxAreas;

  const toggleSpec = (tag: SpecializationTag) => {
    const next = value.specializations.includes(tag)
      ? value.specializations.filter((t) => t !== tag)
      : [...value.specializations, tag].slice(0, 8);
    onChange({ ...value, specializations: next });
  };

  const addArea = () => {
    if (!draftArea.city.trim()) {
      toast.error('نام شهر الزامی است');
      return;
    }
    if (maxAreas != null && value.serviceAreas.length >= maxAreas) {
      toast.message(`حداکثر ${maxAreas} منطقه می‌توانید اضافه کنید`);
      return;
    }
    onChange({
      ...value,
      serviceAreas: [
        ...value.serviceAreas,
        { ...draftArea, city: draftArea.city.trim() },
      ],
    });
    setDraftArea(EMPTY_AREA);
  };

  const removeArea = (index: number) => {
    onChange({
      ...value,
      serviceAreas: value.serviceAreas.filter((_, i) => i !== index),
    });
  };

  const addStyle = () => {
    const v = newStyle.trim();
    if (!v || value.designStyles.includes(v)) return;
    onChange({
      ...value,
      designStyles: [...value.designStyles, v].slice(0, 12),
    });
    setNewStyle('');
  };

  const removeStyle = (style: string) => {
    onChange({
      ...value,
      designStyles: value.designStyles.filter((s) => s !== style),
    });
  };

  return (
    <div className="space-y-6">
      {config.serviceArea &&
        (config.pinnedCityName !== undefined ? (
          <IncompleteFieldHighlight itemId="serviceArea">
            <ServiceAreaOnboardingFields
              cityName={config.pinnedCityName}
              areas={value.serviceAreas}
              maxAreas={maxAreas}
              onChange={(serviceAreas) => onChange({ ...value, serviceAreas })}
            />
          </IncompleteFieldHighlight>
        ) : (
        <IncompleteFieldHighlight itemId="serviceArea">
        <Section title="محدوده خدمات" variant={variant}>
          {value.serviceAreas.map((area, index) => (
            <div
              key={`${area.city}-${index}`}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                variant === 'plain' && 'bg-muted/20'
              )}
            >
              <div className="text-sm">
                <span className="font-medium">{area.city}</span>
                {area.district && (
                  <span className="text-muted-foreground"> · {area.district}</span>
                )}
                {area.neighborhood && (
                  <span className="text-muted-foreground"> · {area.neighborhood}</span>
                )}
              </div>
              <Button variant="ghost" size="icon" type="button" onClick={() => removeArea(index)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>شهر</Label>
              <Input
                value={draftArea.city}
                onChange={(e) => setDraftArea({ ...draftArea, city: e.target.value })}
                placeholder="تهران"
              />
            </div>
            <div className="space-y-1">
              <Label>منطقه</Label>
              <Input
                value={draftArea.district ?? ''}
                onChange={(e) => setDraftArea({ ...draftArea, district: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>محله</Label>
              <Input
                value={draftArea.neighborhood ?? ''}
                onChange={(e) => setDraftArea({ ...draftArea, neighborhood: e.target.value })}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addArea}
            className="gap-1.5"
            disabled={maxAreas != null && value.serviceAreas.length >= maxAreas}
          >
            <Plus className="size-4" />
            افزودن منطقه
          </Button>
        </Section>
        </IncompleteFieldHighlight>
        ))}

      {config.specializations && (
        <IncompleteFieldHighlight itemId="specializations">
        <Section title="تخصص‌های املاک" variant={variant}>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATION_TAGS.map((tag) => {
              const active = value.specializations.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSpec(tag)}
                  className="rounded-full focus:outline-none"
                >
                  <Badge
                    variant={active ? 'default' : 'outline'}
                    className={active ? 'bg-primary' : ''}
                  >
                    {SPECIALIZATION_LABELS[tag]}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Section>
        </IncompleteFieldHighlight>
      )}

      {config.designStyles && (
        <IncompleteFieldHighlight itemId="designStyles">
        <Section
          title={config.designStylesTitle ?? 'سبک‌های طراحی'}
          variant={variant}
        >
          <div className="flex flex-wrap gap-2">
            {value.designStyles.map((style) => (
              <Badge key={style} variant="secondary" className="gap-1">
                {style}
                <button type="button" onClick={() => removeStyle(style)}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newStyle}
              onChange={(e) => setNewStyle(e.target.value)}
              placeholder={config.designStylesPlaceholder ?? 'افزودن…'}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStyle())}
            />
            <Button type="button" variant="outline" onClick={addStyle}>
              افزودن
            </Button>
          </div>
        </Section>
        </IncompleteFieldHighlight>
      )}
    </div>
  );
}
