# نحوه اتصال OpenClaw Agent به پروژه

## تغییر ۱: اضافه کردن config flag

**فایل:** `src/intake/rules/config.ts`

در انتهای فایل اضافه کنید:

```typescript
export function isOpenClawAgentEnabled(): boolean {
  if (isIntakeAiGloballyDisabled()) return false;
  return process.env.OPENCLAW_INTAKE_AGENT_ENABLED === 'true';
}
```

## تغییر ۲: dispatch در orchestrator

**فایل:** `src/intake/intelligence-engine/orchestrator.ts`

در ابتدای تابع `runIntakeIntelligence`، بعد از cache check و قبل از `isProposeValidateEnabled()`:

```typescript
// بعد از خط: if (isProposeValidateEnabled()) { ... }

if (isOpenClawAgentEnabled()) {
  const { runOpenClawIntakeAgent } = await import('@/intake/openclaw-agent');
  const agentResult = await runOpenClawIntakeAgent(input);
  if (agentResult) {
    // استفاده از validators موجود برای اعتبارسنجی
    const { validateProposedCategories } = await import(
      '@/intake/intelligence-engine/propose-validate/validate-categories'
    );
    const { validateProposedLocation } = await import(
      '@/intake/intelligence-engine/propose-validate/validate-location'
    );

    const [validatedCat, validatedLoc] = await Promise.all([
      validateProposedCategories(
        text,
        [
          agentResult.fields.subcategorySlug?.value as string,
          agentResult.fields.categorySlug?.value as string,
        ].filter(Boolean),
        []
      ),
      validateProposedLocation(text, {
        categories: [],
        city: agentResult.fields.city?.value as string | null,
        province: agentResult.fields.province?.value as string | null,
        neighborhoods: agentResult.fields.neighborhood?.value
          ? [agentResult.fields.neighborhood.value as string]
          : [],
        confidence: agentResult.confidence,
      }, {
        citySlug: input.citySlug,
        cityName: input.cityName,
      }),
    ]);

    // اعمال نتایج اعتبارسنجی
    if (validatedCat.top && !agentResult.fields.categorySlug?.lockedByUser) {
      setField(agentResult.fields, 'categorySlug', {
        value: validatedCat.top.categorySlug,
        confidence: validatedCat.top.confidence,
        source: 'ai',
      });
      if (validatedCat.top.subcategorySlug) {
        setField(agentResult.fields, 'subcategorySlug', {
          value: validatedCat.top.subcategorySlug,
          confidence: validatedCat.top.confidence,
          source: 'ai',
        });
      }
    }

    if (validatedLoc.citySlug) {
      setField(agentResult.fields, 'citySlug', {
        value: validatedLoc.citySlug,
        confidence: 0.85,
        source: 'ai',
      });
    }
    if (validatedLoc.neighborhoodSlug) {
      setField(agentResult.fields, 'neighborhoodSlug', {
        value: validatedLoc.neighborhoodSlug,
        confidence: 0.8,
        source: 'ai',
      });
    }

    // ساخت نتیجه نهایی
    const { buildNeedFromFields } = await import(
      '@/intake/intelligence-engine/need-builder/need-builder'
    );
    const { detectGaps } = await import(
      '@/intake/intelligence-engine/gaps/gap-detector'
    );
    const { scoreFieldConfidence } = await import(
      '@/intake/intelligence-engine/scoring/field-confidence-engine'
    );
    const { buildIntelligenceTrace } = await import(
      '@/intake/intelligence-engine/trace/intake-trace-builder'
    );
    const { getNextQuestion } = await import(
      '@/lib/need-intake/question-engine'
    );
    const { inferCriticalFilterSuggestions } = await import(
      '@/intake/intelligence-engine/suggestions/critical-filter-suggestions'
    );

    scoreFieldConfidence(agentResult.fields);

    const built = buildNeedFromFields({
      sourceText: text,
      fields: agentResult.fields,
      gaps: [],
      formHints: input.formHints,
      existingDraft: opts?.existingDraft,
      locationScope: { citySlug: input.citySlug, cityName: input.cityName },
    });

    const gaps = detectGaps(
      agentResult.fields,
      built.parsedIntent,
      built.missingFields,
      text
    );

    const draft = buildNeedFromFields({
      sourceText: text,
      fields: agentResult.fields,
      gaps,
      formHints: input.formHints,
      existingDraft: opts?.existingDraft,
      locationScope: { citySlug: input.citySlug, cityName: input.cityName },
    }).draft;

    const nextQ = getNextQuestion(
      draft.parsedIntent.intentType,
      draft.parsedIntent,
      draft.answers as Record<string, unknown>
    );

    const categorySlug = String(
      agentResult.fields.subcategorySlug?.value ??
      agentResult.fields.categorySlug?.value ?? ''
    );

    const suggestedFilters = inferCriticalFilterSuggestions({
      categorySlug,
      fieldBag: agentResult.fields,
      existingAnswers: draft.answers as Record<string, unknown>,
    });

    const result: IntakeIntelligenceResult = {
      fields: agentResult.fields,
      gaps,
      trace: buildIntelligenceTrace({
        inputText: text,
        normalizedText: text,
        steps: [{
          name: 'openclaw-agent',
          latencyMs: agentResult.latencyMs,
          resolver: agentResult.provider,
          summary: agentResult.summary,
        }],
        fieldMeta: fieldBagToRecord(agentResult.fields),
        aiInvoked: true,
        aiProvider: agentResult.provider,
        aiLatencyMs: agentResult.latencyMs,
      }),
      draft,
      missingFields: draft.missingFields,
      nextQuestion: draft.nextQuestion ?? null,
      recommendedQuestions: nextQ.done
        ? gaps.map((g) => g.messageFa).filter(Boolean) as string[]
        : [nextQ.question ?? ''].filter(Boolean),
      parsedIntent: draft.parsedIntent,
      suggestedFilters,
      meta: {
        engine: 'openclaw-gemma4',
        aiInvoked: true,
        latencyMs: Math.round(performance.now() - started),
      },
    };

    await setIntelligenceCache(cacheKey, result);
    return result;
  }
  // اگر OpenClaw fail کرد → fallback به مسیرهای فعلی
}
```

## تغییر ۳: کپی فایل‌ها

```bash
# کپی agent code به src
cp openclaw/openclaw-intake-agent.ts src/intake/openclaw-agent/openclaw-intake-agent.ts
cp openclaw/index.ts src/intake/openclaw-agent/index.ts

# یا ایجاد symlink (توصیه می‌شود برای توسعه):
mkdir -p src/intake/openclaw-agent
ln -sf ../../openclaw/openclaw-intake-agent.ts src/intake/openclaw-agent/openclaw-intake-agent.ts
ln -sf ../../openclaw/index.ts src/intake/openclaw-agent/index.ts
```

## تغییر ۴: متغیرهای محیطی

**فایل:** `.env.local`

```env
OPENCLAW_INTAKE_AGENT_ENABLED=true
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
NEED_INTAKE_LLM_MODEL=gemma-4-e2b-q4_0-it
NEED_INTAKE_HYBRID_ENABLED=false
NEED_INTAKE_PROPOSE_VALIDATE_ENABLED=false
```

## تغییر ۵: نصب به عنوان OpenClaw Skill

```bash
cp -r openclaw/ ~/.openclaw-autoclaw/skills/niazfinder-intake/
```
