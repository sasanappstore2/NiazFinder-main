import { apiFetch } from '@/lib/api-client';
import type { IntakeAnalyzeResponse } from '@/intake/api/intake.dto';

export interface AnalyzeIntakeTextOptions {
  citySlug?: string | null;
  cityName?: string | null;
}

export async function analyzeIntakeTextApi(
  text: string,
  options?: AnalyzeIntakeTextOptions
): Promise<IntakeAnalyzeResponse> {
  return apiFetch<IntakeAnalyzeResponse>('/api/intake/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      ...(options?.citySlug?.trim() ? { citySlug: options.citySlug.trim() } : {}),
      ...(options?.cityName?.trim() ? { cityName: options.cityName.trim() } : {}),
    }),
  });
}
