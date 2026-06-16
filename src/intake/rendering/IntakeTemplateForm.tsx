'use client';

import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { IntakeTemplate } from '@/intake/template/types';
import { SectionRenderer } from '@/intake/rendering/SectionRenderer';
import { IntakeSectionMenus } from '@/components/need-intake/IntakeSectionMenus';
import type { IntakeRenderContext } from '@/intake/rendering/types';
import { isFieldFilled } from '@/intake/state/isFieldFilled';
import type { TemplateSection } from '@/intake/template/types';
import { cn } from '@/lib/utils';

export interface IntakeTemplateFormProps {
  template: IntakeTemplate;
  context: IntakeRenderContext;
  enabledSections: Set<string>;
  onEnabledSectionsChange: (keys: Set<string>) => void;
}

function toSectionDef(section: TemplateSection) {
  return {
    key: section.key,
    label: section.label,
    fields: [...section.fields],
  };
}

export function IntakeTemplateForm({
  template,
  context,
  enabledSections,
  onEnabledSectionsChange,
}: IntakeTemplateFormProps) {
  const sections = useMemo(
    () => template.sections.map(toSectionDef),
    [template.sections]
  );

  const filledCtx = useMemo(
    () => ({
      entities: context.entities,
      answers: context.answers,
      selectedCategory: context.selectedLeafCategorySlug,
      selectedCity: context.selectedCity,
      selectedNeighborhood: context.selectedNeighborhood,
      sourceText: context.needDraft?.sourceText,
      parsedBrand: context.needDraft?.parsedIntent?.entities?.brand,
    }),
    [context]
  );

  const isSectionFilled = (section: { fields: readonly string[] }) =>
    section.fields.some((key) => {
      const meta = template.fieldMap[key];
      return meta ? isFieldFilled(meta, filledCtx) : false;
    });

  const specsSection = template.sections.find((s) => s.key === 'specs');
  const specsFields = specsSection?.fields ?? [];
  const hasSpecs =
    specsFields.length > 0 &&
    specsFields.some((key) => {
      const meta = template.fieldMap[key];
      if (!meta) return false;
      return meta.sectionKey === 'specs';
    });

  const visibleSpecs = hasSpecs
    ? specsFields
        .map((k) => template.fieldMap[k])
        .filter(Boolean)
    : [];

  const specsFilledCount = visibleSpecs.filter((meta) =>
    meta ? isFieldFilled(meta, filledCtx) : false
  ).length;

  return (
    <>
      {sections.some((s) => s.key !== 'specs') ? (
        <IntakeSectionMenus
          className="intake-section-menus"
          sections={sections.filter((s) => s.key !== 'specs')}
          enabledKeys={enabledSections}
          mandatoryKeys={template.mandatorySectionKeys}
          onEnabledKeysChange={onEnabledSectionsChange}
          isSectionFilled={isSectionFilled}
          renderSectionFields={(section) => {
            const templateSection = template.sections.find((s) => s.key === section.key);
            if (!templateSection) return null;
            return (
              <SectionRenderer
                section={templateSection}
                fieldMap={template.fieldMap}
                context={context}
              />
            );
          }}
        />
      ) : null}

      {hasSpecs ? (
        <details className="intake-category-filters group rounded-xl border border-dashed border-border/70 bg-muted/20">
          <summary
            className={cn(
              'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5',
              '[&::-webkit-details-marker]:hidden'
            )}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              فیلترهای پیشرفته
              {specsFilledCount > 0 ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {specsFilledCount} مورد
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
                  اختیاری
                </span>
              )}
            </span>
          </summary>
          <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
            {specsSection ? (
              <SectionRenderer
                section={specsSection}
                fieldMap={template.fieldMap}
                context={context}
              />
            ) : null}
          </div>
        </details>
      ) : null}
    </>
  );
}
