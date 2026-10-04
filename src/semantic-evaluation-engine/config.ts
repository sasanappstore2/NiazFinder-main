/**
 * SEE wiring configuration — the concrete `FieldSpec` registry, `OntologyProvider` map, and
 * version identifiers for TODAY's two active fields (category, location). §1/§6/§12
 * (`PLAN/semantic-comparator-architecture.md`). A real consumer (the publish route, Step 6) reads
 * this rather than constructing its own ad hoc field list — one registry, one place to extend when
 * a third field is ready.
 */
import type { FieldSpec, OntologyProvider } from './types';
import { categoryOntologyProvider } from './ontology/category-ontology-provider';

export const SEE_FIELD_SPECS: FieldSpec[] = [
  { fieldId: 'category', displayName: 'Category', strategy: { kind: 'scalar-ontology', ontologyNamespace: 'category' } },
  { fieldId: 'location', displayName: 'Location', strategy: { kind: 'scalar-geo' } },
];

export const SEE_ONTOLOGY_PROVIDERS: Record<string, OntologyProvider> = {
  category: categoryOntologyProvider,
};

export const SEE_COMPARATOR_ENGINE_VERSION = '1.0.0';
export const SEE_EVALUATION_REPORT_VERSION = '1.0.0';
