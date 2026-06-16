import type { IntakeTemplate } from '@/intake/template/types';

export interface AnalyticsSegment {
  templateId: string;
  templateVersion: number;
  rootSlug: string;
  categoryPath: readonly string[];
  vertical: string;
}

/** Canonical analytics grouping key ? use instead of legacy needType. */
export function getAnalyticsSegment(template: IntakeTemplate): AnalyticsSegment {
  return {
    templateId: template.id,
    templateVersion: template.schemaVersion,
    rootSlug: template.rootSlug,
    categoryPath: template.categoryPath,
    vertical: template.vertical,
  };
}
