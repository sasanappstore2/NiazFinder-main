'use client';

import type { FieldSchema } from '@/contracts/need-intake';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldRenderer } from './FieldRenderer';
import { Button } from '@/components/ui/button';

interface QuestionCardProps {
  question: string;
  field?: FieldSchema;
  value?: string | number | boolean;
  onChange: (value: string | number) => void;
  onSubmit: () => void;
  /** Chips/select: advance immediately on pick */
  onChipSelect?: (value: string) => void;
  submitLabel?: string;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  field,
  value,
  onChange,
  onSubmit,
  onChipSelect,
  submitLabel = 'ادامه',
  disabled,
}: QuestionCardProps) {
  const isChipField = field?.type === 'chips' || field?.type === 'select';

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-h3 font-semibold leading-relaxed">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {field?.helpText && (
          <p className="text-xs text-muted-foreground leading-relaxed">{field.helpText}</p>
        )}
        {field && (
          <FieldRenderer
            field={field}
            value={value}
            onChange={onChange}
            onChipSelect={onChipSelect}
            disabled={disabled}
          />
        )}
        {!isChipField && (
          <Button
            type="button"
            className="w-full h-11"
            onClick={onSubmit}
            disabled={disabled}
          >
            {submitLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
