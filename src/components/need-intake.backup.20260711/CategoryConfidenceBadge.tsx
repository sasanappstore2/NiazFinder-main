'use client';

import { Badge } from '@/components/ui/badge';
import { getCategoryPath } from '@/config/categories';
import type { ParsedIntent } from '@/contracts/need-intake';

const VERTICAL_LABELS: Record<string, string> = {
  'real-estate': 'املاک',
  vehicles: 'خودرو',
  products: 'کالا',
  services: 'خدمات',
  jobs: 'استخدام',
  social: 'اجتماعی',
};

interface CategoryConfidenceBadgeProps {
  parsed: ParsedIntent;
  verticalCertainty?: number;
  vertical?: string;
  onConfirm?: () => void;
}

export function CategoryConfidenceBadge({
  parsed,
  verticalCertainty = 0,
  vertical,
  onConfirm,
}: CategoryConfidenceBadgeProps) {
  const path = getCategoryPath(parsed.categorySlug);
  const categoryTitle =
    path[path.length - 1]?.title ?? parsed.categorySlug;
  const verticalLabel = vertical ? (VERTICAL_LABELS[vertical] ?? vertical) : null;
  const pct = Math.round(parsed.confidence * 100);
  const lowConfidence = parsed.confidence < 0.65 || verticalCertainty < 0.3;

  if (!lowConfidence && parsed.confidence >= 0.8) {
    return (
      <Badge variant="secondary" className="text-xs font-normal">
        {categoryTitle} · {pct}%
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant={lowConfidence ? 'outline' : 'secondary'}>
        {verticalLabel ? `${verticalLabel} → ` : ''}
        {categoryTitle} · {pct}%
      </Badge>
      {lowConfidence && onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          درست است — ادامه
        </button>
      )}
    </div>
  );
}
