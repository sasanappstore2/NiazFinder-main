import { db } from '@/lib/db';

export interface AgentMemorySnapshot {
  preferredCity: string | null;
  interests: string[];
  notes: string | null;
  lastNeedHint: string | null;
  conversationSummary: string | null;
}

const EMPTY_MEMORY: AgentMemorySnapshot = {
  preferredCity: null,
  interests: [],
  notes: null,
  lastNeedHint: null,
  conversationSummary: null,
};

export async function loadAgentMemory(
  userId: string,
  conversationId?: string,
): Promise<AgentMemorySnapshot> {
  try {
    const [memory, summary] = await Promise.all([
      db.agentUserMemory.findUnique({ where: { userId } }),
      conversationId
        ? db.agentConversationSummary.findUnique({ where: { conversationId } })
        : Promise.resolve(null),
    ]);

    return {
      preferredCity: memory?.preferredCity ?? null,
      interests: memory?.interests ?? [],
      notes: memory?.notes ?? null,
      lastNeedHint: memory?.lastNeedHint ?? null,
      conversationSummary: summary?.summary ?? null,
    };
  } catch (err) {
    console.warn('[ai-agent/memory] loadAgentMemory failed', err);
    return EMPTY_MEMORY;
  }
}

export function formatMemoryForPrompt(mem: AgentMemorySnapshot): string {
  const lines: string[] = ['حافظه کاربر (برای شخصی‌سازی؛ اسرار حساس نیست):'];
  if (mem.preferredCity) lines.push(`- شهر ترجیحی: ${mem.preferredCity}`);
  if (mem.interests.length) lines.push(`- علاقه‌مندی/دسته‌ها: ${mem.interests.slice(0, 8).join('، ')}`);
  if (mem.lastNeedHint) lines.push(`- آخرین اشاره به نیاز: ${mem.lastNeedHint.slice(0, 200)}`);
  if (mem.notes) lines.push(`- یادداشت: ${mem.notes.slice(0, 300)}`);
  if (mem.conversationSummary) {
    lines.push(`- خلاصه مکالمه قبلی: ${mem.conversationSummary.slice(0, 600)}`);
  }
  if (lines.length === 1) lines.push('- هنوز حافظه‌ای ثبت نشده.');
  return lines.join('\n');
}

export async function getUserMemoryTool(userId: string) {
  return loadAgentMemory(userId);
}

export async function updateUserMemoryTool(
  userId: string,
  args: Record<string, unknown>,
) {
  const preferredCity =
    typeof args.preferredCity === 'string' ? args.preferredCity.trim().slice(0, 80) : undefined;
  const lastNeedHint =
    typeof args.lastNeedHint === 'string' ? args.lastNeedHint.trim().slice(0, 300) : undefined;
  const notes = typeof args.notes === 'string' ? args.notes.trim().slice(0, 500) : undefined;
  const interestsRaw = args.interests;
  const interests = Array.isArray(interestsRaw)
    ? interestsRaw
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim().slice(0, 64))
        .filter(Boolean)
        .slice(0, 12)
    : undefined;

  try {
    const existing = await db.agentUserMemory.findUnique({ where: { userId } });
    const mergedInterests = interests
      ? Array.from(new Set([...(existing?.interests ?? []), ...interests])).slice(0, 16)
      : undefined;

    const row = await db.agentUserMemory.upsert({
      where: { userId },
      create: {
        userId,
        preferredCity: preferredCity || null,
        interests: mergedInterests ?? [],
        notes: notes || null,
        lastNeedHint: lastNeedHint || null,
      },
      update: {
        ...(preferredCity !== undefined ? { preferredCity: preferredCity || null } : {}),
        ...(mergedInterests ? { interests: mergedInterests } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(lastNeedHint !== undefined ? { lastNeedHint: lastNeedHint || null } : {}),
      },
    });

    return {
      ok: true,
      preferredCity: row.preferredCity,
      interests: row.interests,
      notes: row.notes,
      lastNeedHint: row.lastNeedHint,
    };
  } catch (err) {
    console.warn('[ai-agent/memory] updateUserMemoryTool failed', err);
    return { ok: false, error: 'memory_write_failed' };
  }
}

/** Heuristic memory update from a successful turn (no extra LLM). */
export async function updateMemoryFromTurn(input: {
  userId: string;
  userText: string;
  toolNames: string[];
  toolPayloads: unknown[];
}): Promise<void> {
  const { userId, userText, toolNames, toolPayloads } = input;
  const patch: Record<string, unknown> = {};

  const cityHint = userText.match(
    /(?:در|از|برای)\s+([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیء\w]{2,20})/,
  );
  const knownCities = ['تهران', 'اصفهان', 'مشهد', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'قم'];
  for (const c of knownCities) {
    if (userText.includes(c)) {
      patch.preferredCity = c;
      break;
    }
  }
  if (!patch.preferredCity && cityHint?.[1] && knownCities.includes(cityHint[1])) {
    patch.preferredCity = cityHint[1];
  }

  if (/نیاز|می‌خوام|میخوام|دنبال|اجاره|خرید|فروش/.test(userText) && userText.length >= 8) {
    patch.lastNeedHint = userText.slice(0, 280);
  }

  const interests: string[] = [];
  for (const payload of toolPayloads) {
    if (!payload || typeof payload !== 'object') continue;
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p) || Array.isArray(p.categories)) {
      const list = (Array.isArray(p) ? p : p.categories) as unknown[];
      for (const item of list.slice(0, 5)) {
        if (item && typeof item === 'object' && 'slug' in item) {
          const slug = String((item as { slug?: string }).slug ?? '');
          if (slug) interests.push(slug);
        }
      }
    }
  }
  if (interests.length) patch.interests = interests;
  if (toolNames.includes('search_site_categories') && /خودرو|ماشین/.test(userText)) {
    patch.interests = [
      ...(Array.isArray(patch.interests) ? (patch.interests as string[]) : []),
      'vehicles',
      'car',
    ];
  }

  if (Object.keys(patch).length === 0) return;
  await updateUserMemoryTool(userId, patch).catch(() => undefined);
}

export async function summarizeConversationIfNeeded(input: {
  conversationId: string;
  userId: string;
  messageCount: number;
  recentLines: string[];
}): Promise<string | null> {
  const threshold = Number(process.env.AGENT_SUMMARY_MESSAGE_THRESHOLD ?? 20);
  if (input.messageCount < threshold) return null;

  try {
    const existing = await db.agentConversationSummary.findUnique({
      where: { conversationId: input.conversationId },
    });
    if (existing && existing.turnCount >= input.messageCount - 2) {
      return existing.summary;
    }

    const summary = input.recentLines
      .slice(-12)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' | ')
      .slice(0, 800);

    if (!summary) return existing?.summary ?? null;

    await db.agentConversationSummary.upsert({
      where: { conversationId: input.conversationId },
      create: {
        conversationId: input.conversationId,
        userId: input.userId,
        summary,
        turnCount: input.messageCount,
      },
      update: {
        summary,
        turnCount: input.messageCount,
      },
    });

    return summary;
  } catch (err) {
    console.warn('[ai-agent/memory] summarizeConversationIfNeeded failed', err);
    return null;
  }
}
