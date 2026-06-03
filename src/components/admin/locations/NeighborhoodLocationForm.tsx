'use client';

import { MapPin, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AdminPanel, AdminPanelActions, AdminToggleRow } from '@/components/admin/ui';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-(--color-secondaryText)">{label}</span>
      {children}
    </label>
  );
}

export type NeighborhoodFormValues = {
  id?: string;
  name: string;
  nameEn: string;
  order: string;
  isActive: boolean;
  areasText: string;
};

export function NeighborhoodLocationForm({
  cityName,
  values,
  onChange,
  onSave,
  onCancel,
}: {
  cityName: string;
  values: NeighborhoodFormValues;
  onChange: (patch: Partial<NeighborhoodFormValues>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <AdminPanel
      variant="form"
      icon={MapPin}
      title={values.id ? 'ویرایش محله' : 'افزودن محله'}
      description={`شهر ${cityName} — پس از ذخیره در لیست پایین نمایش داده می‌شود.`}
      className="mb-5"
    >
      <div className="space-y-4">
        <Field label="نام فارسی">
          <Input
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </Field>
        <Field label="نام انگلیسی">
          <Input
            dir="ltr"
            value={values.nameEn}
            onChange={(event) => onChange({ nameEn: event.target.value })}
          />
        </Field>
        <Field label="ترتیب">
          <PersianDigitInput
            variant="plain"
            value={values.order}
            onChange={(order) => onChange({ order })}
          />
        </Field>
        <Field label="زیرمحدوده‌ها (هر خط یا با ویرگول)">
          <Textarea
            value={values.areasText}
            onChange={(event) => onChange({ areasText: event.target.value })}
            placeholder={'بهارستان\nارغوان\nرضاشهر'}
            className="min-h-[100px]"
          />
        </Field>
        <AdminToggleRow label="فعال باشد">
          <Switch
            checked={values.isActive}
            onCheckedChange={(checked) => onChange({ isActive: checked })}
          />
        </AdminToggleRow>
        <AdminPanelActions>
          <Button type="button" onClick={onSave} className="admin-btn-save flex-1">
            <Save className="size-4" />
            ذخیره
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="size-4" />
            انصراف
          </Button>
        </AdminPanelActions>
      </div>
    </AdminPanel>
  );
}
