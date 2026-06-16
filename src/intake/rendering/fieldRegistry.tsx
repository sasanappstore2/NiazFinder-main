'use client';

import type { FieldSchema } from '@/contracts/need-intake';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { toAsciiDigits, toPersianDigits } from '@/lib/format/digits';
import { Textarea } from '@/components/ui/textarea';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import { PriceInput } from '@/components/need-intake/PriceInput';
import { IntakeCategoryMegaMenuPicker } from '@/components/need-intake/IntakeCategoryMegaMenuPicker';
import { IntakeCityPicker } from '@/components/need-intake/IntakeCityPicker';
import { IntakeNeighborhoodPicker } from '@/components/need-intake/IntakeNeighborhoodPicker';
import { NeedMapPinPicker } from '@/components/need-intake/NeedMapPinPicker';
import { Shapes } from 'lucide-react';
import type { IntakeRenderContext } from '@/intake/rendering/types';

export interface FieldRendererProps {
  field: FieldSchema;
  value: string | number | boolean | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
  context: IntakeRenderContext;
  disabled?: boolean;
}

function TextInput({ field, value, onChange, disabled }: FieldRendererProps) {
  return (
    <Input
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className="h-12 text-base"
    />
  );
}

function NumberInput({ field, value, onChange, disabled }: FieldRendererProps) {
  const ascii =
    value !== undefined && value !== null && value !== ''
      ? toAsciiDigits(String(value))
      : '';
  return (
    <PersianDigitInput
      variant="plain"
      value={ascii}
      onChange={(digits) => {
        if (!digits) onChange('');
        else onChange(Number(digits));
      }}
      placeholder={field.placeholder ? toPersianDigits(field.placeholder) : undefined}
      disabled={disabled}
      className="h-12 text-base"
    />
  );
}

function SelectInput({ field, value, onChange, disabled }: FieldRendererProps) {
  return (
    <select
      className="h-11 w-full rounded-md border bg-background px-3 text-sm"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">انتخاب کنید</option>
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ChipSelector({ field, value, onChange, disabled }: FieldRendererProps) {
  if (!field.options) return null;
  const isMulti = field.type === 'multi_select';
  const chipValue = isMulti
    ? Array.isArray(value)
      ? value
      : typeof value === 'string' && value.trim()
        ? value.split(',').map((v) => v.trim()).filter(Boolean)
        : []
    : String(value ?? '');

  return (
    <SuggestionChips
      options={field.options}
      value={chipValue}
      multiple={isMulti}
      disabled={disabled}
      onSelect={(v) => onChange(v)}
    />
  );
}

function TextAreaInput({ field, value, onChange, disabled }: FieldRendererProps) {
  return (
    <Textarea
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className="min-h-[100px] text-base"
    />
  );
}

function CategoryPicker({ context }: FieldRendererProps) {
  return (
    <IntakeCategoryMegaMenuPicker
      value={context.selectedLeafCategorySlug}
      onChange={(payload) => context.onCategoryChange(payload)}
    />
  );
}

function CityPicker({ context, disabled }: FieldRendererProps) {
  return (
    <IntakeCityPicker
      cityName={context.selectedCity}
      onCityChange={context.onCityChange}
      disabled={disabled}
    />
  );
}

function NeighborhoodPicker({ context, disabled }: FieldRendererProps) {
  return (
    <IntakeNeighborhoodPicker
      cityName={context.selectedCity}
      value={context.selectedNeighborhood}
      neighborhoods={context.neighborhoodOptions}
      isLoading={context.neighborhoodsLoading}
      disabled={disabled || !context.selectedCity.trim()}
      onChange={(name, id, opts) => context.onNeighborhoodChange(name, id, opts)}
      autoOpenWhenEmpty={context.promptNeighborhoodPick}
      onAutoOpenHandled={context.onPromptNeighborhoodHandled}
    />
  );
}

function MapPinPicker({ context }: FieldRendererProps) {
  if (!context.selectedCity.trim()) return null;

  const selectedSlug = context.entities?.neighborhoodSlug?.trim();
  const disambiguation =
    context.neighborhoodDisambiguationChips.length >= 2
      ? {
          options: context.neighborhoodDisambiguationChips,
          selectedValue: selectedSlug ? `neighborhood:${selectedSlug}` : undefined,
          onSelect: (value: string) => {
            if (!value.startsWith('neighborhood:')) return;
            const slug = value.slice('neighborhood:'.length);
            const hood = context.neighborhoodOptions.find((n) => n.id === slug);
            const hit = context.needDraft?.parsedIntent.neighborhoodCandidates?.find(
              (n) => n.slug === slug
            );
            const label = (hood?.name ?? hit?.label ?? slug).trim();
            if (label) context.onNeighborhoodChange(label, slug, { fromUser: true });
          },
        }
      : undefined;

  return (
    <NeedMapPinPicker
      city={context.selectedCity}
      categorySlug={context.selectedLeafCategorySlug || context.entities?.categorySlug}
      lat={context.entities?.lat ?? null}
      lng={context.entities?.lng ?? null}
      onChange={context.onMapPinChange}
      neighborhoodDisambiguation={disambiguation}
      neighborhoodSlug={
        selectedSlug ||
        context.neighborhoodOptions.find((n) => n.name === context.selectedNeighborhood.trim())?.id ||
        null
      }
      neighborhoodName={context.selectedNeighborhood}
      neighborhoods={context.neighborhoodOptions}
    />
  );
}

function PriceField({ field, value, onChange, disabled }: FieldRendererProps) {
  return (
    <PriceInput
      value={value as string | number | undefined}
      onChange={onChange}
      placeholder={field.placeholder}
      disabled={disabled}
    />
  );
}

export function CategorySuggestions({ context }: { context: IntakeRenderContext }) {
  if (!context.categorySuggestions.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Shapes className="size-3.5" />
        پیشنهاد دسته‌بندی (اختیاری)
      </p>
      <SuggestionChips
        value={context.selectedLeafCategorySlug}
        options={context.categorySuggestions}
        onSelect={(v) =>
          context.onCategoryChange(typeof v === 'string' ? v : (v[0] ?? ''), {
            userInitiated: true,
          })
        }
      />
    </div>
  );
}

export const FIELD_REGISTRY = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  chips: ChipSelector,
  multi_select: ChipSelector,
  textarea: TextAreaInput,
  price: PriceField,
  category: CategoryPicker,
  city: CityPicker,
  neighborhood: NeighborhoodPicker,
  mapPin: MapPinPicker,
  location: CityPicker,
} as const;

export type RegistryFieldType = keyof typeof FIELD_REGISTRY;

export function isRegistryFieldType(type: string): type is RegistryFieldType {
  return type in FIELD_REGISTRY;
}
