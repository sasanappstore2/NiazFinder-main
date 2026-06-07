import type { ConversationTurn } from '@/contracts/need-intake';
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { orchestrateIntakeV2Turn, type IntakeV2TurnResult } from '@/lib/intake-v2/orchestrate-turn';
import { INTAKE_V2_WELCOME } from '@/lib/intake-v2/system-prompt';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import type { ConversationPersona } from '@/lib/intake-v2/sim/persona-matrix';
import {
  auditConversationEnd,
  auditTurn,
  judgeHumanQuality,
  type AuditFinding,
} from '@/lib/intake-v2/sim/conversation-auditor';
import type { ConversationRecord } from '@/lib/intake-v2/sim/conversation-transcript';
import {
  simulateUserTurn,
} from '@/lib/intake-v2/sim/user-simulator-llm';

export interface RunConversationOptions {
  maxTurns?: number;
  skipJudge?: boolean;
}

export async function runConversation(
  persona: ConversationPersona,
  opts?: RunConversationOptions
): Promise<ConversationRecord> {
  const maxTurns = opts?.maxTurns ?? Number(process.env.V2_CONV_QA_TURNS ?? 7);
  const startedAt = new Date().toISOString();

  let draft = legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
  let turns: ConversationTurn[] = draft.turns ?? [];
  let confirmedFields: string[] = [];
  let lastAsked: string | null = null;
  let lastResult: IntakeV2TurnResult | null = null;
  let priorConfirmedCount = 0;
  let priorActiveFieldKey: string | null = null;
  const repeatFieldCounts = new Map<string, number>();
  const turnRecords: ConversationRecord['turns'] = [];
  const allFindings: AuditFinding[] = [];

  for (let t = 0; t < maxTurns; t++) {
    const sim = await simulateUserTurn({
      persona,
      turnIndex: t,
      lastAssistantMessage: lastResult?.assistantMessage ?? INTAKE_V2_WELCOME,
      activeFieldKey: lastResult?.activeFieldKey ?? null,
      activeFieldLabel: lastResult?.activeFieldLabel ?? null,
      suggestedChips: lastResult?.suggestedChips ?? [],
      isFirstTurn: t === 0,
    });

    const result = await orchestrateIntakeV2Turn(draft, turns, sim.message, {
      confirmedFields,
      chipFieldKey: sim.chipFieldKey,
      chipValue: sim.chipValue,
      lastAskedField: lastAsked,
    });

    const turnFindings = auditTurn({
      turn: t,
      persona,
      userMessage: sim.message,
      result,
      priorActiveFieldKey,
      priorConfirmedCount,
      repeatFieldCounts,
    });

    if (!opts?.skipJudge && result.assistantMessage && t > 0) {
      const judge = await judgeHumanQuality(
        result.assistantMessage,
        result.activeFieldLabel ?? null
      );
      if (judge.finding) {
        judge.finding.turn = t;
        turnFindings.push(judge.finding);
      }
    }

    turnRecords.push({
      turn: t,
      userMessage: sim.message,
      assistantMessage: result.assistantMessage,
      activeFieldKey: result.activeFieldKey ?? null,
      activeFieldLabel: result.activeFieldLabel ?? null,
      suggestedChips: result.suggestedChips ?? [],
      readyToPreview: result.readyToPreview,
      confirmedFields: result.confirmedFields ?? [],
      confirmedCount: result.confirmedCount ?? 0,
      categorySlug: result.needDraft.parsedIntent.categorySlug,
      dealType: String(result.needDraft.answers.dealType ?? ''),
      findings: turnFindings,
      userSimSource: sim.source,
    });

    allFindings.push(...turnFindings);

    draft = result.needDraft;
    turns = draft.turns ?? [];
    confirmedFields = result.confirmedFields ?? [];
    priorConfirmedCount = result.confirmedCount ?? 0;
    priorActiveFieldKey = result.activeFieldKey ?? null;
    lastAsked = result.activeFieldKey ?? null;
    lastResult = result;

    if (result.readyToPreview) {
      break;
    }
  }

  const readyToPreview = lastResult?.readyToPreview ?? false;
  const endFindings = auditConversationEnd(draft, persona, readyToPreview);
  allFindings.push(...endFindings);

  const publish = validateNeedDraftForPublish(draft);

  return {
    id: persona.id,
    batch: persona.batch,
    personaId: persona.id,
    expectedCategorySlug: persona.categorySlug,
    expectedCity: persona.city,
    expectedDealType: persona.dealType,
    turns: turnRecords,
    completed: turnRecords.length >= 1,
    readyToPreview,
    publishValid: publish.success,
    turnCount: turnRecords.length,
    findings: allFindings,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

export async function replayGoldenConversation(
  golden: import('@/lib/intake-v2/sim/conversation-transcript').GoldenConversation,
  opts?: {
    maxTurns?: number;
    runAuditor?: boolean;
    assertMetadata?: boolean;
  }
): Promise<{
  ok: boolean;
  error?: string;
  readyToPreview: boolean;
  publishValid: boolean;
  auditorErrors?: string[];
}> {
  const persona: ConversationPersona = {
    id: golden.personaId,
    batch: 0,
    index: 0,
    categorySlug: golden.expectedCategorySlug,
    dealType: golden.expectedDealType as ConversationPersona['dealType'],
    city: golden.expectedCity,
    district: golden.expectedCity,
    archetype: 'family_residence',
    propertyKind: 'apartment',
    openingHint: '',
    areaHint: '50',
    budgetHint: '3',
    depositHint: '200',
    rentHint: '20',
    noise: 'none',
  };

  let draft = legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
  let turns: ConversationTurn[] = draft.turns ?? [];
  let confirmedFields: string[] = [];
  let lastAsked: string | null = null;
  let priorConfirmedCount = 0;
  let priorActiveFieldKey: string | null = null;
  const repeatFieldCounts = new Map<string, number>();
  const auditorErrors: string[] = [];

  const limit = opts?.maxTurns ?? golden.userMessages.length;
  for (let t = 0; t < limit; t++) {
    const msg = golden.userMessages[t];
    if (!msg) break;
    const chipMeta = golden.chipTurns?.find((c) => c.turn === t);
    const result = await orchestrateIntakeV2Turn(draft, turns, msg, {
      confirmedFields,
      chipFieldKey: chipMeta?.chipFieldKey,
      chipValue: chipMeta?.chipValue,
      lastAskedField: lastAsked,
    });

    if (opts?.runAuditor !== false) {
      const turnFindings = auditTurn({
        turn: t,
        persona,
        userMessage: msg,
        result,
        priorActiveFieldKey,
        priorConfirmedCount,
        repeatFieldCounts,
      });
      for (const f of turnFindings) {
        if (f.severity === 'error') {
          auditorErrors.push(`${golden.id} turn ${t}: ${f.ruleId} — ${f.message}`);
        }
      }
    }

    draft = result.needDraft;
    turns = draft.turns ?? [];
    confirmedFields = result.confirmedFields ?? [];
    priorConfirmedCount = result.confirmedCount ?? 0;
    priorActiveFieldKey = result.activeFieldKey ?? null;
    lastAsked = result.activeFieldKey ?? null;
  }

  const publish = validateNeedDraftForPublish(draft);
  const endFindings = auditConversationEnd(draft, persona, publish.success);
  for (const f of endFindings) {
    if (f.severity === 'error') {
      auditorErrors.push(`${golden.id}: ${f.ruleId} — ${f.message}`);
    }
  }

  if (opts?.assertMetadata !== false) {
    const slug = draft.parsedIntent.categorySlug;
    if (golden.expectedCategorySlug && slug !== golden.expectedCategorySlug) {
      if (
        !slug.includes(golden.expectedCategorySlug.split('-')[0] ?? '') &&
        golden.expectedCategorySlug !== slug
      ) {
        auditorErrors.push(
          `${golden.id}: category expected ${golden.expectedCategorySlug}, got ${slug}`
        );
      }
    }
    const city =
      draft.parsedIntent.city ??
      String(draft.answers.location ?? '').split('،').pop()?.trim();
    if (
      golden.expectedCity &&
      city &&
      !String(city).includes(golden.expectedCity) &&
      !golden.expectedCity.includes(String(city))
    ) {
      auditorErrors.push(`${golden.id}: city expected ${golden.expectedCity}, got ${city}`);
    }
    const deal = String(draft.answers.dealType ?? '');
    if (golden.expectedDealType && deal && deal !== golden.expectedDealType) {
      auditorErrors.push(
        `${golden.id}: deal expected ${golden.expectedDealType}, got ${deal}`
      );
    }
  }

  const publishValid = publish.success;
  const ok = publishValid && auditorErrors.length === 0;

  return {
    ok,
    readyToPreview: publishValid,
    publishValid,
    auditorErrors: auditorErrors.length ? auditorErrors : undefined,
    error: ok
      ? undefined
      : auditorErrors[0] ?? publish.errors[0]?.message ?? 'publish failed',
  };
}
