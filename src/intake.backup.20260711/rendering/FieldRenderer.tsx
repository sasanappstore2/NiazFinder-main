'use client';

import type { FieldSchema } from '@/contracts/need-intake';
import {
  FIELD_REGISTRY,
  isRegistryFieldType,
  type FieldRendererProps,
} from '@/intake/rendering/fieldRegistry';
import type { IntakeRenderContext } from '@/intake/rendering/types';

export interface UnifiedFieldRendererProps {
  field: FieldSchema;
  value: string | number | boolean | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
  context: IntakeRenderContext;
  disabled?: boolean;
}

const CONTEXT_DRIVEN_TYPES = new Set([
  'category',
  'city',
  'neighborhood',
  'mapPin',
  'location',
]);

export function FieldRenderer({
  field,
  value,
  onChange,
  context,
  disabled,
}: UnifiedFieldRendererProps) {
  const props: FieldRendererProps = { field, value, onChange, context, disabled };

  if (CONTEXT_DRIVEN_TYPES.has(field.type) && isRegistryFieldType(field.type)) {
    const Component = FIELD_REGISTRY[field.type];
    return <Component {...props} />;
  }

  if (!isRegistryFieldType(field.type)) {
    const Fallback = FIELD_REGISTRY.text;
    return <Fallback {...props} />;
  }

  const Component = FIELD_REGISTRY[field.type];
  return <Component {...props} />;
}
