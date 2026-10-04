import { db } from '@/lib/db';
import { publishMessageNew } from '@/lib/communication/redis-publish';
import { getPlatformAiUserId } from '@/lib/platform-ai/user';
import { isAiAgentEnabled, agentMessageFeeToman } from '@/lib/ai-agent/env';
import { buildAiAgentSystemPrompt } from '@/lib/ai-agent/prompt';
import { AiAgentError, AI_AGENT_CODES, AI_AGENT_USER_MESSAGES } from '@/lib/ai-agent/errors';
import { deductAgentMessageFee, refundAgentMessageFee } from '@/lib/ai-agent/wallet-agent-fee';
import { executeAgentTool } from '@/lib/ai-agent/tools';
import { buildWalletStatusReply, buildCategoryLookupReply, buildPostGuideReply, buildGreetingReply, buildIdentityReply, buildProductFaqReply, buildGeoLookupReply, buildNeedSearchReply, buildBusinessSearchReply, buildSiteKnowledgeReply, extractGeoPlaceQuery, extractMarketplaceLinkRequest, buildMarketplaceLinkReply } from '@/lib/ai-agent/knowledge/site-pack';
import {
  runGemma4AgentRound,
  streamGemma4AgentRound,
  streamTextDeltas,
  type GemmaAgentMessage,
  type GemmaAgentRoundResult,
} from '@/lib/ai-agent/gemma4-agent';
import {
  composePersistedThinkContent,
  parseThinkContent,
  stripThinkTags,
} from '@/lib/ai-agent/think-tag-parser';
import { looksLikeToolCallPayload } from '@/lib/ai-agent/tool-call-parser';
import {
  AGENT_EMPTY_AFTER_SANITIZE,
  sanitizeAgentStreamChunk,
  sanitizeAgentVisibleText,
  sanitizePersistedAgentContent,
  containsToolLeakage,
} from '@/lib/ai-agent/output-sanitizer';
import { routeAgentIntent } from '@/lib/ai-agent/intent-router';
import {
  formatMemoryForPrompt,
  loadAgentMemory,
  summarizeConversationIfNeeded,
  updateMemoryFromTurn,
} from '@/lib/ai-agent/memory/user-memory';

export type LocalAiSseEvent = {
  type: 'fee_deducted' | 'thinking' | 'token' | 'tool_start' | 'done' | 'error';
  data: Record<string, unknown>;
};

type ChatDto = {
  conversationId: string;
  content: string;
  clientTempId: string;
  replyToId?: string;
};

async function* emitAnswerWithThink(persisted: string): AsyncGenerator<LocalAiSseEvent> {
  const clean = sanitizePersistedAgentContent(persisted);
  const { thinking, answer } = parseThinkContent(clean);
  if (thinking) {
    for await (const delta of streamTextDeltas(thinking)) {
      yield { type: 'thinking', data: { delta } };
    }
  }
  const visible = sanitizeAgentVisibleText(answer) || AGENT_EMPTY_AFTER_SANITIZE;
  for await (const delta of streamTextDeltas(visible)) {
    yield { type: 'token', data: { delta } };
  }
}

function isUsableHistoryContent(role: 'user' | 'assistant', content: string): boolean {
  const t = content.trim();
  if (!t) return false;
  if (role === 'assistant') {
    if (t.startsWith('[tool_call:') || t.startsWith('[tool:')) return false;
    if (looksLikeToolCallPayload(t)) return false;
    if (containsToolLeakage(t) && sanitizeAgentVisibleText(t).length < 8) return false;
    if (t === AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE) return false;
  }
  return true;
}

function toPersistedAnswer(result: GemmaAgentRoundResult): string {
  const raw = result.persistedContent?.trim()
    ? result.persistedContent.trim()
    : composePersistedThinkContent(result.thinking ?? '', result.text).trim();
  const clean = sanitizePersistedAgentContent(raw);
  const { answer } = parseThinkContent(clean);
  if (!sanitizeAgentVisibleText(answer)) {
    return AGENT_EMPTY_AFTER_SANITIZE;
  }
  return clean;
}

function isGoodAnswer(result: GemmaAgentRoundResult | null | undefined): boolean {
  if (!result) return false;
  if (result.toolCalls.length > 0) return false;
  const t = sanitizeAgentVisibleText(result.text);
  return Boolean(t) && t !== AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE && !containsToolLeakage(t);
}

async function* streamFinalAnswer(
  systemPrompt: string,
  agentMessages: GemmaAgentMessage[],
): AsyncGenerator<LocalAiSseEvent, string> {
  let streamedLive = false;
  let liveResult: GemmaAgentRoundResult | null = null;

  try {
    for await (const ev of streamGemma4AgentRound(systemPrompt, agentMessages, {
      allowTools: false,
    })) {
      if (ev.type === 'thinking') {
        streamedLive = true;
        yield { type: 'thinking', data: { delta: ev.delta } };
      } else if (ev.type === 'token') {
        // Do not trim stream chunks — spaces between Persian words would be dropped.
        const clean = sanitizeAgentStreamChunk(ev.delta);
        if (!clean) continue;
        streamedLive = true;
        yield { type: 'token', data: { delta: clean } };
      } else if (ev.type === 'complete') {
        liveResult = ev.result;
      }
    }
  } catch (err) {
    console.warn('[ai-agent] live final stream failed', err);
  }

  if (isGoodAnswer(liveResult) && liveResult!.toolCalls.length === 0) {
    const persisted = toPersistedAnswer(liveResult!);
    if (!streamedLive) yield* emitAnswerWithThink(persisted);
    return persisted;
  }

  // Recovery if model leaked tools into "final" round
  const fallback = await runGemma4AgentRound(
    `${systemPrompt}\n\nالان فقط پاسخ نهایی فارسی بده. دیگر ابزار صدا نزن. هرگز call یا tool_call ننویس.`,
    [
      ...agentMessages,
      { role: 'user', content: 'فقط پاسخ کوتاه و مفید فارسی بده؛ ابزار صدا نزن.' },
    ],
    { allowTools: false },
  );

  if (!isGoodAnswer(fallback)) {
    if (fallback.toolCalls.length > 0) {
      return AGENT_EMPTY_AFTER_SANITIZE;
    }
    return '';
  }

  const persisted = toPersistedAnswer(fallback);
  yield* emitAnswerWithThink(persisted);
  return persisted;
}

export async function* handleLocalAiAgentChatStream(
  userId: string,
  dto: ChatDto,
): AsyncGenerator<LocalAiSseEvent> {
  if (!isAiAgentEnabled()) {
    yield {
      type: 'error',
      data: { code: AI_AGENT_CODES.AI_AGENT_DISABLED, message: AI_AGENT_USER_MESSAGES.DISABLED },
    };
    return;
  }

  const platformAiId = await getPlatformAiUserId();
  const idempotencyKey = `agent-msg:${dto.conversationId}:${dto.clientTempId}`;
  let feeDuplicate = false;
  let feeDeducted = false;
  const fee = agentMessageFeeToman();

  try {
    const conversation = await db.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { userId1: true, userId2: true },
    });
    if (!conversation) throw new AiAgentError(AI_AGENT_USER_MESSAGES.NOT_FOUND, 'NOT_FOUND', 404);

    const isParticipant =
      conversation.userId1 === userId || conversation.userId2 === userId;
    if (!isParticipant) throw new AiAgentError(AI_AGENT_USER_MESSAGES.FORBIDDEN, 'FORBIDDEN', 403);

    const otherId =
      conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
    if (otherId !== platformAiId) {
      throw new AiAgentError(AI_AGENT_USER_MESSAGES.NOT_PLATFORM_BOT, AI_AGENT_CODES.NOT_PLATFORM_BOT, 400);
    }

    let userMsg = await db.message.findFirst({
      where: { conversationId: dto.conversationId, clientTempId: dto.clientTempId },
    });
    if (!userMsg) {
      const content = dto.content.trim();
      userMsg = await db.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            conversationId: dto.conversationId,
            senderId: userId,
            content,
            type: 'TEXT',
            clientTempId: dto.clientTempId,
            replyToId: dto.replyToId ?? null,
          },
        });
        await tx.conversation.update({
          where: { id: dto.conversationId },
          data: { lastMessage: content.slice(0, 200), lastMessageAt: new Date() },
        });
        return created;
      });
      await publishMessageNew({
        id: userMsg.id,
        conversationId: dto.conversationId,
        senderId: userId,
        content: userMsg.content,
        type: userMsg.type,
        attachmentUrls: [],
        isRead: userMsg.isRead,
        createdAt: userMsg.createdAt.toISOString(),
        clientTempId: dto.clientTempId,
      }).catch(() => undefined);
    }

    const feeResult = await db.$transaction(
      async (tx) =>
        deductAgentMessageFee(tx, {
          userId,
          amount: fee,
          idempotencyKey,
          referenceId: dto.conversationId,
        }),
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
    );
    feeDuplicate = feeResult.duplicate;
    feeDeducted = true;

    yield {
      type: 'fee_deducted',
      data: {
        transactionId: feeResult.transaction.id,
        amount: fee,
        duplicate: feeResult.duplicate,
      },
    };

    const replyKey = `agent-reply:${dto.clientTempId}`;
    const existingAssistant = feeDuplicate
      ? await db.message.findFirst({
          where: { conversationId: dto.conversationId, clientTempId: replyKey },
        })
      : null;

    if (existingAssistant) {
      yield* emitAnswerWithThink(existingAssistant.content);
      yield {
        type: 'done',
        data: {
          messageId: existingAssistant.id,
          content: sanitizePersistedAgentContent(existingAssistant.content),
          userMessageId: userMsg.id,
        },
      };
      return;
    }

    yield { type: 'thinking', data: { delta: '…' } };

    const intent = routeAgentIntent(dto.content);
    const maxRounds = Number(process.env.AGENT_LLM_MAX_TOOL_ROUNDS ?? 3);
    const historyRows = await db.message.findMany({
      where: { conversationId: dto.conversationId, type: 'TEXT', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 40,
      select: { senderId: true, content: true },
    });

    await summarizeConversationIfNeeded({
      conversationId: dto.conversationId,
      userId,
      messageCount: historyRows.length,
      recentLines: historyRows.map((m) => {
        const role = m.senderId === platformAiId ? 'دستیار' : 'کاربر';
        return `${role}: ${stripThinkTags(m.content).slice(0, 120)}`;
      }),
    }).catch(() => null);

    const memory = await loadAgentMemory(userId, dto.conversationId);
    const systemWithSummary = buildAiAgentSystemPrompt({
      memoryBlock: formatMemoryForPrompt(memory),
      intentHint: intent.systemHint,
    });

    const agentMessages: GemmaAgentMessage[] = [];
    for (const m of historyRows) {
      const role = m.senderId === platformAiId ? ('assistant' as const) : ('user' as const);
      let content =
        role === 'assistant' ? stripThinkTags(m.content) || m.content : m.content;
      if (role === 'assistant') content = sanitizeAgentVisibleText(content);
      if (!isUsableHistoryContent(role, content)) continue;
      const prev = agentMessages[agentMessages.length - 1];
      if (prev && prev.role === role) {
        // Merge consecutive same-role turns (welcome + prior assistant, etc.)
        prev.content = `${prev.content}\n${content}`.slice(0, 2000);
        continue;
      }
      agentMessages.push({ role, content });
    }
    // llama-server rejects trailing assistant-only tails without a user turn
    while (agentMessages.length > 0 && agentMessages[agentMessages.length - 1]!.role === 'assistant') {
      agentMessages.pop();
    }
    const trimmed = agentMessages.slice(-12);

    let assistantText = '';
    let llmUnavailable = false;
    let usedTools = false;
    const usedToolNames: string[] = [];
    const usedToolPayloads: unknown[] = [];

    const runForcedFinal = async function* (
      prompt: string,
    ): AsyncGenerator<LocalAiSseEvent, string> {
      const gen = streamFinalAnswer(prompt, trimmed);
      let next = await gen.next();
      while (!next.done) {
        yield next.value;
        next = await gen.next();
      }
      return next.value || '';
    };

    if (intent.intent === 'greeting') {
      assistantText = buildGreetingReply(dto.content);
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'product_faq') {
      assistantText = buildProductFaqReply(dto.content) ?? buildIdentityReply();
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.skipTools) {
      assistantText = yield* runForcedFinal(systemWithSummary);
      if (!assistantText.trim()) llmUnavailable = true;
    } else if (intent.intent === 'account_wallet') {
      // Deterministic wallet path — avoid generic/wrong LLM FAQ loops.
      yield { type: 'tool_start', data: { name: 'check_user_account_status' } };
      usedTools = true;
      usedToolNames.push('check_user_account_status');
      let status: unknown;
      try {
        status = await executeAgentTool('check_user_account_status', {}, { userId });
      } catch (err) {
        status = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(status);

      const wantsBalance = /موجودی|چقدر|چقدره|balance|وضعیت|تومان/i.test(dto.content);
      if (status && typeof status === 'object' && !('error' in (status as object))) {
        if (wantsBalance || /کیف\s*پول|شارژ|هزینه\s*پیام/i.test(dto.content)) {
          assistantText = buildWalletStatusReply(
            status as Parameters<typeof buildWalletStatusReply>[0],
          );
          // For "how does wallet work" add one clarifying sentence
          if (!wantsBalance) {
            assistantText = `${assistantText} هزینه لید را کسب‌وکار می‌پردازد، نه مشتری.`;
          }
          yield* emitAnswerWithThink(assistantText);
        } else {
          assistantText = buildWalletStatusReply(
            status as Parameters<typeof buildWalletStatusReply>[0],
          );
          yield* emitAnswerWithThink(assistantText);
        }
      } else {
        assistantText = yield* runForcedFinal(
          `${systemWithSummary}\n\nوضعیت حساب در دسترس نبود. کوتاه توضیح بده و به داشبورد کیف پول ارجاع بده. ابزار صدا نزن.`,
        );
      }
    } else if (intent.intent === 'category_lookup') {
      const query = dto.content
        .replace(/دست[هه‌]‌?(بندی)?(‌های)?\s*(سایت|مربوط\s*به|چیه|چیست)?/gi, ' ')
        .replace(/کتگوری|category|پیدا\s*کن|بگو|چیه|چیست|\?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || dto.content.trim();
      yield { type: 'tool_start', data: { name: 'search_site_categories' } };
      usedTools = true;
      usedToolNames.push('search_site_categories');
      let hits: unknown = [];
      try {
        hits = await executeAgentTool(
          'search_site_categories',
          { query, limit: 8 },
          { userId },
        );
      } catch (err) {
        hits = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(hits);
      const list = Array.isArray(hits) ? hits : [];
      assistantText = buildCategoryLookupReply(query, list as Array<{ name?: string; slug?: string; path?: string }>);
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'marketplace_link') {
      const req = extractMarketplaceLinkRequest(dto.content);
      yield { type: 'tool_start', data: { name: 'search_site_cities' } };
      usedTools = true;
      usedToolNames.push('search_site_cities');
      let cityHits: unknown = [];
      try {
        cityHits = await executeAgentTool(
          'search_site_cities',
          { query: req.cityQuery || dto.content, limit: 5 },
          { userId },
        );
      } catch (err) {
        cityHits = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(cityHits);
      const cities = Array.isArray(cityHits)
        ? (cityHits as Array<{ name?: string; slug?: string; id?: string }>)
        : [];
      const city = cities[0];

      let categoryName: string | null = null;
      let categorySlug: string | null = null;
      if (req.categoryQuery) {
        yield { type: 'tool_start', data: { name: 'search_site_categories' } };
        usedToolNames.push('search_site_categories');
        let catHits: unknown = [];
        try {
          catHits = await executeAgentTool(
            'search_site_categories',
            { query: req.categoryQuery, limit: 5 },
            { userId },
          );
        } catch (err) {
          catHits = { error: err instanceof Error ? err.message : 'tool_failed' };
        }
        usedToolPayloads.push(catHits);
        const cats = Array.isArray(catHits)
          ? (catHits as Array<{ name?: string; slug?: string; path?: string; level?: number }>)
          : [];
        // Prefer shallow vehicle/car over repair services when user said خودرویی
        const preferred =
          cats.find((c) => c.slug === 'car' || c.slug === 'vehicles') ||
          cats.find((c) => (c.level ?? 99) <= 2) ||
          cats[0];
        if (preferred) {
          categoryName = preferred.path || preferred.name || null;
          categorySlug = preferred.slug || null;
        }
      }

      assistantText = buildMarketplaceLinkReply({
        cityName: city?.name,
        citySlug: city?.slug || city?.id,
        categoryName,
        categorySlug,
        cityMissing: !city,
      });
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'geo_lookup') {
      const parsed = extractGeoPlaceQuery(dto.content);
      const kind = parsed?.kind ?? (/محله|neighborhood/i.test(dto.content) ? 'neighborhood' : 'city');
      const query =
        parsed?.query ||
        dto.content
          .replace(/جستجوی\s*شهر|شهر\s+رو\s+پیدا\s*کن|پیدا\s*کن|محله|جستجو|بگو|چیه|\?/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim() ||
        dto.content.trim();
      const toolName = kind === 'city' ? 'search_site_cities' : 'search_site_neighborhoods';
      yield { type: 'tool_start', data: { name: toolName } };
      usedTools = true;
      usedToolNames.push(toolName);
      let hits: unknown = [];
      try {
        if (kind === 'city') {
          hits = await executeAgentTool(toolName, { query, limit: 8 }, { userId });
        } else {
          hits = await executeAgentTool(
            toolName,
            {
              query,
              limit: kind === 'nationwide_neighborhood' ? 40 : 8,
              ...(parsed?.cityHint ? { cityName: parsed.cityHint } : {}),
              ...(kind === 'nationwide_neighborhood' ? { nationwide: true } : {}),
            },
            { userId },
          );
        }
      } catch (err) {
        hits = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(hits);

      let list: Array<{ name?: string; slug?: string; cityName?: string }> = [];
      let cityCount: number | undefined;
      let cities: string[] | undefined;
      if (Array.isArray(hits)) {
        list = hits as typeof list;
      } else if (hits && typeof hits === 'object') {
        const obj = hits as {
          neighborhoods?: Array<{ name?: string; cityName?: string; cityId?: string }>;
          cities?: string[];
          cityCount?: number;
          name?: string;
          slug?: string;
        };
        if (Array.isArray(obj.neighborhoods)) {
          list = obj.neighborhoods.map((n) => ({
            name: n.name,
            cityName: n.cityName,
            slug: n.cityId,
          }));
        }
        if (typeof obj.cityCount === 'number') cityCount = obj.cityCount;
        if (Array.isArray(obj.cities)) cities = obj.cities;
      }

      assistantText = buildGeoLookupReply(query, kind, list, { cityCount, cities });
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'need_search') {
      const query = dto.content
        .replace(/جستجو\s*کن|نیازهای?\s*مشابه|پیدا\s*کن|نیاز|آگهی|\?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || dto.content.trim();
      yield { type: 'tool_start', data: { name: 'search_needs_agent' } };
      usedTools = true;
      usedToolNames.push('search_needs_agent');
      let hits: unknown = [];
      try {
        hits = await executeAgentTool('search_needs_agent', { query, limit: 5 }, { userId });
      } catch (err) {
        hits = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(hits);
      const list = Array.isArray(hits)
        ? hits
        : hits && typeof hits === 'object' && Array.isArray((hits as { needs?: unknown }).needs)
          ? (hits as { needs: unknown[] }).needs
          : hits && typeof hits === 'object' && Array.isArray((hits as { results?: unknown }).results)
            ? (hits as { results: unknown[] }).results
            : [];
      assistantText = buildNeedSearchReply(
        query,
        list as Array<{ title?: string; city?: string; category?: string; categoryName?: string }>,
      );
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'business_search') {
      const query = dto.content
        .replace(/جستجو\s*کن|کسب.?وکار|فروشنده|شرکت|مغازه|پیدا\s*کن|پروفایل|\?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || dto.content.trim();
      yield { type: 'tool_start', data: { name: 'search_businesses_agent' } };
      usedTools = true;
      usedToolNames.push('search_businesses_agent');
      let hits: unknown = {};
      try {
        hits = await executeAgentTool('search_businesses_agent', { query, limit: 5 }, { userId });
      } catch (err) {
        hits = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(hits);
      const list =
        hits && typeof hits === 'object' && Array.isArray((hits as { businesses?: unknown }).businesses)
          ? (hits as { businesses: unknown[] }).businesses
          : [];
      assistantText = buildBusinessSearchReply(
        query,
        list as Array<{ name?: string; city?: string; href?: string; slug?: string; verified?: boolean }>,
      );
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'section_help') {
      yield { type: 'tool_start', data: { name: 'search_site_knowledge' } };
      usedTools = true;
      usedToolNames.push('search_site_knowledge');
      let hits: unknown = {};
      try {
        hits = await executeAgentTool(
          'search_site_knowledge',
          { query: dto.content.trim(), limit: 3 },
          { userId },
        );
      } catch (err) {
        hits = { error: err instanceof Error ? err.message : 'tool_failed' };
      }
      usedToolPayloads.push(hits);
      const list =
        hits && typeof hits === 'object' && Array.isArray((hits as { chunks?: unknown }).chunks)
          ? (hits as { chunks: unknown[] }).chunks
          : [];
      assistantText = buildSiteKnowledgeReply(
        dto.content.trim(),
        list as Array<{ title?: string; content?: string; route?: string | null }>,
      );
      yield* emitAnswerWithThink(assistantText);
    } else if (intent.intent === 'post_guide' || intent.intent === 'need_help') {
      if (/چه\s*کمکی|درباره\s*خودت|کی\s*هستی|چیکار\s*می‌کنی/i.test(dto.content)) {
        assistantText = buildIdentityReply();
        yield* emitAnswerWithThink(assistantText);
      } else {
        yield { type: 'tool_start', data: { name: 'get_site_help' } };
        usedTools = true;
        usedToolNames.push('get_site_help');
        const topic = intent.intent === 'post_guide' ? 'ثبت نیاز' : 'general';
        let help: unknown;
        try {
          help = await executeAgentTool('get_site_help', { topic }, { userId });
        } catch (err) {
          help = { error: err instanceof Error ? err.message : 'tool_failed' };
        }
        usedToolPayloads.push(help);
        if (intent.intent === 'post_guide') {
          assistantText = buildPostGuideReply();
        } else if (help && typeof help === 'object' && 'answer' in (help as object)) {
          const h = help as { answer: string; links?: Array<{ label: string; href: string }> };
          const links = (h.links ?? []).map((l) => `${l.label}: ${l.href}`).join(' | ');
          assistantText = links ? `${h.answer} (${links})` : h.answer;
        } else {
          assistantText = buildPostGuideReply();
        }
        yield* emitAnswerWithThink(assistantText);
      }
    } else {
      for (let round = 0; round < maxRounds; round++) {
        const completion = await runGemma4AgentRound(systemWithSummary, trimmed);

        if (completion.text === AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE) {
          if (usedTools) break;
          llmUnavailable = true;
          break;
        }

        if (completion.toolCalls.length === 0) {
          if (usedTools) {
            assistantText = yield* runForcedFinal(
              `${systemWithSummary}\n\nفقط پاسخ نهایی فارسی با <think> کوتاه. ابزار صدا نزن.`,
            );
          } else {
            assistantText = toPersistedAnswer(completion);
            if (containsToolLeakage(assistantText)) {
              assistantText = yield* runForcedFinal(
                `${systemWithSummary}\n\nپاسخ قبلی آلوده به ابزار بود. فقط متن فارسی تمیز بده.`,
              );
            } else {
              yield* emitAnswerWithThink(assistantText);
            }
          }
          break;
        }

        usedTools = true;
        for (const call of completion.toolCalls) {
          yield { type: 'tool_start', data: { name: call.name } };
          usedToolNames.push(call.name);
          let result: unknown;
          try {
            result = await executeAgentTool(call.name, call.arguments, { userId });
          } catch (err) {
            result = {
              error: err instanceof Error ? err.message : 'tool_failed',
            };
          }
          usedToolPayloads.push(result);
          let payload = JSON.stringify(result);
          if (payload.length > 3500) {
            payload = `${payload.slice(0, 3500)}…[truncated]`;
          }
          trimmed.push(
            { role: 'assistant', content: `[tool_call:${call.name}]` },
            { role: 'tool', name: call.name, content: payload },
          );
        }

        assistantText = yield* runForcedFinal(
          `${systemWithSummary}\n\nبا توجه به نتایج ابزار، فقط پاسخ نهایی فارسی با <think> کوتاه بده. ابزار صدا نزن و syntax ابزار ننویس.`,
        );
        if (assistantText.trim()) break;
      }
    }

    if (!assistantText.trim() && usedTools) {
      assistantText = yield* runForcedFinal(
        `${systemWithSummary}\n\nفقط پاسخ نهایی فارسی. ابزار ممنوع.`,
      );
      if (assistantText.trim()) llmUnavailable = false;
    }

    assistantText = sanitizePersistedAgentContent(assistantText);
    if (!sanitizeAgentVisibleText(parseThinkContent(assistantText).answer)) {
      if (llmUnavailable || !assistantText.trim()) {
        /* fall through to error */
      } else {
        assistantText = AGENT_EMPTY_AFTER_SANITIZE;
      }
    }

    if (llmUnavailable || !assistantText.trim()) {
      if (feeDeducted && !feeDuplicate) {
        await db
          .$transaction(
            async (tx) => {
              await refundAgentMessageFee(tx, {
                userId,
                amount: fee,
                idempotencyKey,
                referenceId: dto.conversationId,
              });
            },
            { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
          )
          .catch(() => undefined);
      }

      yield {
        type: 'error',
        data: {
          code: 'LLM_UNAVAILABLE',
          message: AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE,
        },
      };
      return;
    }

    await updateMemoryFromTurn({
      userId,
      userText: dto.content,
      toolNames: usedToolNames,
      toolPayloads: usedToolPayloads,
    }).catch(() => undefined);

    const preview = stripThinkTags(assistantText) || assistantText;
    const saved = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: platformAiId,
          content: assistantText,
          type: 'TEXT',
          clientTempId: replyKey,
        },
      });
      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessage: preview.slice(0, 200), lastMessageAt: new Date() },
      });
      return created;
    });

    await publishMessageNew({
      id: saved.id,
      conversationId: dto.conversationId,
      senderId: platformAiId,
      content: saved.content,
      type: saved.type,
      attachmentUrls: [],
      isRead: saved.isRead,
      createdAt: saved.createdAt.toISOString(),
      clientTempId: replyKey,
    }).catch(() => undefined);

    yield {
      type: 'done',
      data: { messageId: saved.id, content: assistantText, userMessageId: userMsg.id },
    };
  } catch (err) {
    if (err instanceof AiAgentError && err.code === AI_AGENT_CODES.INSUFFICIENT_BALANCE) {
      yield { type: 'error', data: { code: err.code, message: err.message } };
      return;
    }

    if (feeDeducted && !feeDuplicate) {
      await db
        .$transaction(
          async (tx) => {
            await refundAgentMessageFee(tx, {
              userId,
              amount: fee,
              idempotencyKey,
              referenceId: dto.conversationId,
            });
          },
          { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
        )
        .catch(() => undefined);
    }

    const message = err instanceof Error ? err.message : AI_AGENT_USER_MESSAGES.SERVER_ERROR;
    yield { type: 'error', data: { code: 'AGENT_ERROR', message } };
  }
}

export { executeAgentTool };
