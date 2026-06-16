import { NextRequest, NextResponse } from 'next/server';
import { intakeAnalyzeRequestSchema } from '@/intake/api/intake.dto';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';

export const runtime = 'nodejs';

/** Rules-first intake analyze ? Intelligence Engine v1. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = intakeAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.text?.[0] ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { text, citySlug, cityName } = parsed.data;
    const result = await runIntakeIntelligence({
      text,
      citySlug,
      cityName,
    });

    const indexes = buildIntakeIndexesSync();
    const entities = result.draft.entities as Record<string, unknown>;

    return NextResponse.json({
      entities: {
        vertical: result.fields.vertical?.value ?? null,
        category: entities.category ?? null,
        categorySlug: result.fields.categorySlug?.value ?? null,
        subcategorySlug: result.fields.subcategorySlug?.value ?? null,
        city: result.fields.city?.value ?? null,
        citySlug: result.fields.citySlug?.value ?? null,
        province: result.fields.province?.value ?? null,
        neighborhood: result.fields.neighborhood?.value ?? null,
        neighborhoodSlug: result.fields.neighborhoodSlug?.value ?? null,
        area: result.fields.area?.value ?? null,
        budgetMin: result.fields.budgetMin?.value ?? null,
        budgetMax: result.fields.budgetMax?.value ?? null,
        rooms: result.fields.rooms?.value ?? null,
        transactionType: result.fields.transactionType?.value ?? null,
      },
      confidence: Object.fromEntries(
        Object.entries(result.trace.fieldMeta).map(([k, v]) => [k, v.confidence])
      ),
      fieldMeta: result.trace.fieldMeta,
      parseGaps: result.gaps,
      templateId: result.draft.templateId,
      templateVersion: result.draft.templateVersion,
      rootSlug: String(result.fields.vertical?.value ?? 'general'),
      categoryPath: [
        result.fields.categorySlug?.value,
        result.fields.subcategorySlug?.value,
      ].filter(Boolean),
      detectedVertical: result.fields.vertical?.value ?? null,
      detectedCategory: result.fields.subcategorySlug?.value ?? null,
      missingFields: result.missingFields,
      recommendedQuestions: result.recommendedQuestions,
      completionScore: result.draft.completionScore,
      matchabilityScore: result.draft.matchabilityScore,
      completionState: result.draft.completionState,
      sections: result.draft.sections,
      nextQuestion: result.nextQuestion,
      normalizedText: result.trace.normalizedText,
      latencyMs: result.meta.latencyMs,
      draft: result.draft,
      meta: {
        engine: result.meta.engine,
        aiInvoked: result.meta.aiInvoked,
        truthVerifyCorrected: result.meta.truthVerifyCorrected ?? [],
        traceId: result.trace.traceId,
        truthVerification: result.trace.truthVerification,
        indexStats: {
          categories: indexes.categories.size,
          cities: indexes.cities.size,
          neighborhoods: indexes.neighborhoods.size,
        },
      },
    });
  } catch (err) {
    console.error('[intake/analyze]', err);
    return NextResponse.json({ error: 'Analyze failed' }, { status: 500 });
  }
}
