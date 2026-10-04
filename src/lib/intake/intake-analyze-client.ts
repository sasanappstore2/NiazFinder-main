import { apiFetch } from '@/lib/api-client';
import {
  intakeAnalyzeResponseSchema,
  type IntakeAnalyzeResponse,
} from '@/intake/api/intake.dto';
import type { IntakeIntelligenceInput } from '@/intake/intelligence-engine/types';

export interface AnalyzeIntakeTextOptions {
  draftRevision?: number;
  citySlug?: string | null;
  cityName?: string | null;
  formHints?: IntakeIntelligenceInput['formHints'];
  forceAi?: boolean;
  signal?: AbortSignal;
}

export async function analyzeIntakeTextApi(
  text: string,
  options?: AnalyzeIntakeTextOptions
): Promise<IntakeAnalyzeResponse> {
  const formHints = options?.formHints;
  const hasFormHints =
    formHints &&
    (formHints.categoryLockedByUser ||
      formHints.categorySlug ||
      formHints.subcategorySlug ||
      formHints.city ||
      formHints.neighborhood);

  const raw = await apiFetch<unknown>('/api/intake/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      text,
      ...(options?.draftRevision != null ? { draftRevision: options.draftRevision } : {}),
      ...(options?.citySlug?.trim() ? { citySlug: options.citySlug.trim() } : {}),
      ...(options?.cityName?.trim() ? { cityName: options.cityName.trim() } : {}),
      ...(hasFormHints ? { formHints } : {}),
      ...(options?.forceAi ? { forceAi: true } : {}),
    }),
  });
  const parsed = intakeAnalyzeResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('پاسخ تحلیل هوش مصنوعی معتبر نیست؛ لطفاً دوباره تلاش کنید');
  }
  return parsed.data as IntakeAnalyzeResponse;
}
