import type { ChatTurnResponse, NeedDraft } from '@/contracts/need-intake';
import { isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { chatCompletion, extractJsonObject } from '@/lib/ai/openai-compatible';
import {
  buildChatTurnSystemPrompt,
  buildChatTurnUserMessage,
} from '@/lib/need-intake/ai-prompts';

function mergeSlotUpdates(
  draft: NeedDraft,
  slots: Record<string, unknown>
): NeedDraft['parsedIntent'] {
  const parsed = { ...draft.parsedIntent };
  if (typeof slots.budget === 'number') {
    parsed.budgetMax = slots.budget as number;
  } else if (typeof slots.budget === 'string') {
    const n = Number(String(slots.budget).replace(/,/g, ''));
    if (!Number.isNaN(n)) parsed.budgetMax = n;
  }
  if (typeof slots.location === 'string' && slots.location.trim()) {
    parsed.city = slots.location.trim();
  }
  return parsed;
}

function fallbackChatTurn(draft: NeedDraft, message: string): ChatTurnResponse {
  const hasCity = Boolean(draft.parsedIntent.city || draft.answers.location);
  const hasScope = Boolean(
    draft.answers.serviceType ||
      draft.answers.details ||
      draft.parsedIntent.description
  );
  const score = hasCity && hasScope ? 0.88 : hasScope ? 0.65 : 0.45;
  return {
    assistantMessage: hasCity
      ? 'ممنون. اگر نکتهٔ دیگری هست بگویید؛ وگرنه می‌توانید پیش‌نمایش آگهی را ببینید.'
      : 'ممنون. لطفاً شهر یا محدودهٔ انجام کار را هم بگویید.',
    slotUpdates: {},
    readinessScore: score,
    readyToPreview: score >= 0.85,
    suggestedChips:
      score >= 0.85
        ? [{ value: 'preview', label: 'ساخت پیش‌نمایش آگهی' }]
        : undefined,
  };
}

export async function runChatTurn(
  draft: NeedDraft,
  userMessage: string
): Promise<ChatTurnResponse & { mergedIntent?: NeedDraft['parsedIntent'] }> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      assistantMessage: 'لطفاً پیام خود را بنویسید.',
      readinessScore: 0,
      readyToPreview: false,
    };
  }

  const hasLeadPhone = Boolean(draft.leadPhone || draft.answers._leadPhone);

  if (!isNeedIntakeAiEnabled()) {
    return fallbackChatTurn(draft, trimmed);
  }

  try {
    const { content } = await chatCompletion({
      messages: [
        { role: 'system', content: buildChatTurnSystemPrompt(hasLeadPhone) },
        {
          role: 'user',
          content: buildChatTurnUserMessage(draft, trimmed),
        },
      ],
      jsonMode: true,
      temperature: 0.35,
    });

    const json = extractJsonObject(content) as {
      assistantMessage?: string;
      slotUpdates?: Record<string, unknown>;
      readinessScore?: number;
      readyToPreview?: boolean;
      suggestedChips?: { value: string; label: string }[];
    };

    const readinessScore = Math.min(
      1,
      Math.max(0, Number(json.readinessScore ?? 0.5))
    );
    const readyToPreview =
      Boolean(json.readyToPreview) || readinessScore >= 0.85;
    const slotUpdates = json.slotUpdates ?? {};
    const mergedIntent =
      Object.keys(slotUpdates).length > 0
        ? mergeSlotUpdates(draft, slotUpdates)
        : undefined;

    return {
      assistantMessage:
        String(json.assistantMessage ?? '').trim() ||
        'متشکرم. اگر جزئیات دیگری دارید بگویید.',
      slotUpdates,
      readinessScore,
      readyToPreview,
      suggestedChips: json.suggestedChips,
      mergedIntent,
    };
  } catch (e) {
    console.warn('[need-intake] chat-turn failed:', e instanceof Error ? e.message : e);
    return fallbackChatTurn(draft, trimmed);
  }
}
