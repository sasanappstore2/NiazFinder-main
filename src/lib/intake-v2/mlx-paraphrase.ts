import {
  getNeedIntakeLlmBaseUrl,
  isNeedIntakeLlmEnabled,
} from '@/lib/need-intake/llm-parse-client';
import { INTAKE_V2_PARAPHRASE_SYSTEM } from '@/lib/intake-v2/system-prompt';

export interface ParaphraseContext {
  templateQuestion: string;
  knownSlots?: string;
  lastUserMessage?: string;
}

export async function paraphraseIntakeQuestion(
  ctx: ParaphraseContext
): Promise<string | null> {
  if (!isNeedIntakeLlmEnabled()) return null;

  const userContent = [
    `سوال الگو: ${ctx.templateQuestion}`,
    ctx.knownSlots ? `اطلاعات جمع‌شده:\n${ctx.knownSlots}` : '',
    ctx.lastUserMessage ? `آخرین پیام کاربر: ${ctx.lastUserMessage}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const timeoutMs = Number(process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 12_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getNeedIntakeLlmBaseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5-2b',
        messages: [
          { role: 'system', content: INTAKE_V2_PARAPHRASE_SYSTEM },
          { role: 'user', content: userContent },
        ],
        max_tokens: 120,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw || raw.length < 4) return null;
    return raw.replace(/^["']|["']$/g, '').slice(0, 400);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
