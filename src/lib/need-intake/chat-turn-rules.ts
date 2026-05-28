import type { ChatTurnResponse, NeedDraft } from '@/contracts/need-intake';
import { recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';
import { parseMoneyInput } from '@/lib/format/money';
import { buildReadiness } from '@/lib/need-intake/internal-orchestrator';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { extractSlotsFromRules } from '@/lib/need-intake/extract-slots-rules';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';

function mergeSlotUpdates(
  draft: NeedDraft,
  slots: Record<string, unknown>
): NeedDraft['parsedIntent'] {
  const parsed = { ...draft.parsedIntent };
  if (typeof slots.budget === 'number') {
    parsed.budgetMax = slots.budget as number;
  } else if (typeof slots.budget === 'string') {
    const n = parseMoneyInput(slots.budget);
    if (n !== null) parsed.budgetMax = n;
  }
  if (typeof slots.location === 'string' && slots.location.trim()) {
    parsed.city = slots.location.trim();
  }
  return parsed;
}

export function runChatTurnRules(
  draft: NeedDraft,
  userMessage: string
): ChatTurnResponse & { mergedIntent?: NeedDraft['parsedIntent'] } {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      assistantMessage: 'لطفاً پیام خود را بنویسید.',
      readinessScore: 0,
      readyToPreview: false,
    };
  }

  const reParsed = parseFromText(`${draft.parsedIntent.rawText}\n${trimmed}`);
  const seeded = seedAnswersFromParsed(reParsed, draft.leadPhone);
  const slotUpdates = extractSlotsFromRules(reParsed, {
    ...draft.answers,
    ...seeded,
  });

  const rentSignals = /رهن|ودیعه|اجاره/.test(trimmed);
  const mergedAnswers: NeedDraft['answers'] = {
    ...draft.answers,
    ...seeded,
    ...(slotUpdates as NeedDraft['answers']),
  };
  if (rentSignals && reParsed.entities?.dealType) {
    mergedAnswers.dealType = reParsed.entities.dealType;
  }
  if (reParsed.entities?.propertyKind) {
    mergedAnswers.propertyKind = reParsed.entities.propertyKind;
  }

  const mergedIntent =
    rentSignals ||
    Object.keys(slotUpdates).length > 0 ||
    reParsed.confidence > draft.parsedIntent.confidence
      ? reParsed
      : undefined;

  const readinessDraft: NeedDraft = recomputeNeedDraft({
    ...draft,
    parsedIntent: mergedIntent ?? draft.parsedIntent,
    answers: mergedAnswers,
  });
  const readiness = buildReadiness(readinessDraft);

  const hasCity = Boolean(
    readinessDraft.parsedIntent.city || mergedAnswers.location
  );
  const assistantMessage = readiness.readyToPreview
    ? 'عالی! جزئیات کافی جمع شد. می‌توانید پیش‌نمایش آگهی را ببینید.'
    : hasCity
      ? 'ممنون. اگر نکتهٔ دیگری هست بگویید؛ وگرنه می‌توانید پیش‌نمایش آگهی را ببینید.'
      : 'ممنون. لطفاً شهر یا محدودهٔ انجام کار را هم بگویید.';

  return {
    assistantMessage,
    slotUpdates,
    readinessScore: readiness.readinessScore,
    readyToPreview: readiness.readyToPreview,
    suggestedChips: readiness.readyToPreview
      ? [{ value: 'preview', label: 'ساخت پیش‌نمایش آگهی' }]
      : undefined,
    mergedIntent,
  };
}
