import type { FieldSchema, NeedDraftSection } from '@/contracts/need-intake';
import type { ProposalMode } from '@/intake/template/proposalMode';

export type FieldStorage = 'entity' | 'answers' | 'form';

export interface IntakeFieldMeta extends FieldSchema {
  sectionKey?: string;
  storage: FieldStorage;
}

export type SectionLayout = 'default' | 'location' | 'category';

export interface TemplatePublishRules {
  requiredFields: readonly string[];
  requiresMapPin: boolean;
}

export interface TemplateLocationRules {
  requiresMapPin: boolean;
}

export interface TemplateRules {
  publish: TemplatePublishRules;
  location: TemplateLocationRules;
}

export interface TemplateSection extends NeedDraftSection {
  layout?: SectionLayout;
}

export interface IntakeTemplate {
  id: string;
  schemaVersion: number;
  rootSlug: string;
  categoryPath: readonly string[];
  vertical: string;
  category: string;
  proposalMode: ProposalMode;
  sections: TemplateSection[];
  requiredFields: readonly string[];
  optionalFields: readonly string[];
  mandatorySectionKeys: ReadonlySet<string>;
  fieldMap: Readonly<Record<string, IntakeFieldMeta>>;
  rules: TemplateRules;
}

export interface ResolveTemplateInput {
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  vertical?: string | null;
  category?: string | null;
  transactionType?: string | null;
}
