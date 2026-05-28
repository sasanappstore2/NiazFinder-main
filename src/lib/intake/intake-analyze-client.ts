import { apiFetch } from '@/lib/api-client';
import type { IntakeAnalyzeResponse } from '@/intake/api/intake.dto';

export async function analyzeIntakeTextApi(text: string): Promise<IntakeAnalyzeResponse> {
  return apiFetch<IntakeAnalyzeResponse>('/api/intake/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
