'use client';

import { Loader2, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import { IntakeNeighborhoodDisambiguationChips } from '@/components/need-intake/IntakeLocationAmbiguityPrompt';
import type { IntakeFieldMeta, TemplateSection } from '@/intake/template/types';
import { FieldRenderer } from '@/intake/rendering/FieldRenderer';
import { CategorySuggestions } from '@/intake/rendering/fieldRegistry';
import type { IntakeRenderContext } from '@/intake/rendering/types';
import { buildShowIfContext, fieldVisible, resolveFieldValue } from '@/intake/state/resolveFieldValue';
import { isFieldFilled } from '@/intake/state/isFieldFilled';
import { cn } from '@/lib/utils';

export interface SectionRendererProps {
  section: TemplateSection;
  fieldMap: Readonly<Record<string, IntakeFieldMeta>>;
  context: IntakeRenderContext;
}

function LocationSectionLayout({
  fields,
  fieldMap,
  context,
}: {
  fields: string[];
  fieldMap: Readonly<Record<string, IntakeFieldMeta>>;
  context: IntakeRenderContext;
}) {
  const showIfCtx = buildShowIfContext(
    context.answers,
    context.entities?.transactionType
  );

  const visibleKeys = fields.filter((key) => {
    const meta = fieldMap[key];
    return meta && fieldVisible(meta, showIfCtx);
  });

  const cityField = visibleKeys.map((k) => fieldMap[k]).find((f) => f?.type === 'city');
  const neighborhoodField = visibleKeys
    .map((k) => fieldMap[k])
    .find((f) => f?.type === 'neighborhood');
  const mapPinField = visibleKeys.map((k) => fieldMap[k]).find((f) => f?.type === 'mapPin');
  const otherFields = visibleKeys
    .map((k) => fieldMap[k])
    .filter((f) => f && f.type !== 'city' && f.type !== 'neighborhood' && f.type !== 'mapPin');

  const renderField = (meta: IntakeFieldMeta) => (
    <div
      key={meta.key}
      className={cn('space-y-2', meta.type === 'textarea' || meta.type === 'price' ? 'sm:col-span-2' : 'min-w-0')}
    >
      {meta.label && meta.type !== 'mapPin' ? (
        <label className="intake-field-label text-sm font-medium">{meta.label}</label>
      ) : null}
      <FieldRenderer
        field={meta}
        value={resolveFieldValue(
          meta,
          context.answers,
          context.entities,
          context.needDraft?.sourceText,
          context.needDraft?.parsedIntent?.entities?.brand
        )}
        onChange={(v) => context.onFieldChange(meta.key, v)}
        context={context}
        disabled={context.disabled}
      />
      {meta.helpText ? <p className="text-xs text-muted-foreground">{meta.helpText}</p> : null}
    </div>
  );

  if (!cityField && !neighborhoodField) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {otherFields.map((f) => f && renderField(f))}
      </div>
    );
  }

  return (
    <div className="intake-location-row flex flex-col gap-2">
      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        {cityField ? renderField(cityField) : null}
        {neighborhoodField ? (
          <div className="space-y-2 min-w-0">
            {renderField(neighborhoodField)}
            {context.neighborhoodDisambiguationChips.length >= 2 ? (
              <IntakeNeighborhoodDisambiguationChips
                options={context.neighborhoodDisambiguationChips}
                selectedValue={
                  context.entities?.neighborhoodSlug?.trim()
                    ? `neighborhood:${context.entities.neighborhoodSlug.trim()}`
                    : undefined
                }
                onSelect={(value) => context.onLocationSuggestionSelect?.(value)}
              />
            ) : null}
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 gap-1.5 px-3 text-sm"
          disabled={context.myLocationLoading}
          onClick={() => context.onMyLocation()}
        >
          {context.myLocationLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MapPinned className="size-4 shrink-0 text-primary" aria-hidden />
          )}
          موقعیت من
        </Button>
      </div>
      {mapPinField ? renderField(mapPinField) : null}
      {context.locationSuggestionChips && context.locationSuggestionChips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            پیشنهادهای مکان
          </p>
          <SuggestionChips
            options={context.locationSuggestionChips}
            onSelect={(v) => {
              const value = typeof v === 'string' ? v : (v[0] ?? '');
              if (value) context.onLocationSuggestionSelect?.(value);
            }}
          />
        </div>
      ) : null}
      {otherFields.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {otherFields.map((f) => f && renderField(f))}
        </div>
      ) : null}
    </div>
  );
}

export function SectionRenderer({ section, fieldMap, context }: SectionRendererProps) {
  const showIfCtx = buildShowIfContext(
    context.answers,
    context.entities?.transactionType
  );

  const fields = section.fields
    .map((key) => fieldMap[key])
    .filter((f): f is IntakeFieldMeta => Boolean(f))
    .filter((f) => f.type !== 'text' || f.key !== 'subcategory')
    .filter((f) => fieldVisible(f, showIfCtx));

  if (fields.length === 0 && section.layout !== 'category') return null;

  if (section.layout === 'location') {
    return (
      <div className="intake-section-fields flex flex-col gap-3">
        <LocationSectionLayout fields={section.fields} fieldMap={fieldMap} context={context} />
      </div>
    );
  }

  return (
    <div className="intake-section-fields flex flex-col gap-3">
      {section.layout === 'category' ? <CategorySuggestions context={context} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((meta) => {
          const fieldValue = resolveFieldValue(
            meta,
            context.answers,
            context.entities,
            context.needDraft?.sourceText,
            context.needDraft?.parsedIntent?.entities?.brand
          );
          const filled = isFieldFilled(meta, {
            entities: context.entities ?? null,
            answers: context.answers,
            selectedCategory: context.selectedLeafCategorySlug,
            selectedCity: context.selectedCity,
            selectedNeighborhood: context.selectedNeighborhood,
            sourceText: context.needDraft?.sourceText,
            parsedBrand: context.needDraft?.parsedIntent?.entities?.brand,
          });
          const isCritical = context.criticalFieldKeys?.has(meta.key);
          const suggestions =
            isCritical && !filled ? context.filterSuggestions?.[meta.key] : undefined;

          return (
          <div
            key={meta.key}
            className={cn(
              'space-y-2',
              meta.type === 'category' || meta.type === 'textarea' || meta.type === 'price'
                ? 'sm:col-span-2'
                : ''
            )}
          >
            {meta.label ? <label className="text-sm font-medium">{meta.label}</label> : null}
            <FieldRenderer
              field={meta}
              value={fieldValue}
              onChange={(v) => context.onFieldChange(meta.key, v)}
              context={context}
              disabled={context.disabled}
            />
            {suggestions && suggestions.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">پیشنهاد از متن نیاز</p>
                <SuggestionChips
                  options={suggestions}
                  onSelect={(v) => {
                    const value = typeof v === 'string' ? v : (v[0] ?? '');
                    if (value) context.onFilterSuggestionSelect?.(meta.key, value);
                  }}
                />
              </div>
            ) : null}
            {meta.helpText ? (
              <p className="text-xs text-muted-foreground">{meta.helpText}</p>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
}
