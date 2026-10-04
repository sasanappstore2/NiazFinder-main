import { NextResponse } from 'next/server';
import {
  getLocalLlmBaseUrl,
  getLocalLlmModelId,
  getLocalLlmParallelSlots,
} from '@/lib/local-llm/config';
import { getIntakeAnalysisMode, isRulesOnlyIntakeMode } from '@/lib/intake/rules-only-mode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Honest local-LLM health for /post UI.
 * Lightweight: does not import the chat client graph.
 */
export async function GET() {
  const baseUrl = getLocalLlmBaseUrl();
  const model = getLocalLlmModelId();
  const parallelSlots = getLocalLlmParallelSlots();
  const analysisMode = getIntakeAnalysisMode();
  const rulesOnly = isRulesOnlyIntakeMode();

  if (rulesOnly || analysisMode === 'rules') {
    return NextResponse.json({
      ok: false,
      online: false,
      mode: 'rules' as const,
      labelFa: 'قوانین جایگزین؛ مدل آفلاین',
      parallelSlots,
      url: baseUrl,
      model,
      reason: 'rules_only_or_llm_disabled',
    });
  }

  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        online: false,
        mode: 'rules_fallback' as const,
        labelFa: 'قوانین جایگزین؛ مدل آفلاین',
        parallelSlots,
        url: baseUrl,
        model,
        loadError: `HTTP ${res.status}`,
        reason: 'llm_unreachable',
      });
    }
    const data = (await res.json()) as {
      data?: Array<{ id?: string }>;
      models?: Array<{ id?: string; name?: string; model?: string }>;
    };
    const fromData = (data.data ?? []).map((m) => m.id).filter(Boolean) as string[];
    const fromModels = (data.models ?? [])
      .map((m) => m.id || m.model || m.name)
      .filter(Boolean) as string[];
    const models = fromData.length ? fromData : fromModels;
    const online = models.length > 0;
    return NextResponse.json({
      ok: online,
      online,
      mode: online ? ('ai' as const) : ('rules_fallback' as const),
      labelFa: online ? 'AI فعال' : 'قوانین جایگزین؛ مدل آفلاین',
      parallelSlots,
      url: baseUrl,
      model: models.includes(model) ? model : models[0] ?? model,
      models,
      reason: online ? null : 'empty_model_list',
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      online: false,
      mode: 'rules_fallback' as const,
      labelFa: 'قوانین جایگزین؛ مدل آفلاین',
      parallelSlots,
      url: baseUrl,
      model,
      loadError: e instanceof Error ? e.message : 'unreachable',
      reason: 'llm_unreachable',
    });
  }
}
