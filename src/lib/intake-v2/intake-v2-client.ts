import type { ConversationTurn, NeedDraft } from '@/contracts/need-intake';
import type { IntakeV2TurnResult } from '@/lib/intake-v2/orchestrate-turn';
import { preferredCityFromScope } from '@/lib/intake-v2/preferred-city-from-scope';

export async function sendIntakeChatTurn(
  turns: ConversationTurn[],
  needDraft: NeedDraft,
  userMessage: string,
  opts?: {
    confirmedFields?: string[];
    chipFieldKey?: string;
    chipValue?: string;
    lastAskedField?: string | null;
    preferredCityId?: string | null;
    preferredCityName?: string | null;
  }
): Promise<IntakeV2TurnResult> {
  const scopeCity = preferredCityFromScope();
  const res = await fetch('/api/v2/intake-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      turns,
      needDraft,
      userMessage,
      confirmedFields: opts?.confirmedFields ?? [],
      chipFieldKey: opts?.chipFieldKey,
      chipValue: opts?.chipValue,
      lastAskedField: opts?.lastAskedField,
      preferredCityId: opts?.preferredCityId ?? scopeCity?.id ?? null,
      preferredCityName: opts?.preferredCityName ?? scopeCity?.name ?? null,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در پردازش پیام');
  }
  return data as IntakeV2TurnResult;
}
