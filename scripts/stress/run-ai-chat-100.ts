/**
 * Stress / QA: 100 platform-AI chat turns as SUPER_ADMIN (phone from SUPER_ADMIN_PHONES).
 *
 * Run: npx --yes tsx scripts/stress/run-ai-chat-100.ts [--count=100] [--base=http://127.0.0.1:3000]
 *
 * Writes progress to tmp/ai-chat-100-progress.jsonl and a summary to tmp/ai-chat-100-summary.json
 */
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateToken, daysFromNow } from '../../src/lib/auth';
import { ensurePlatformAiConversationForUser } from '../../src/lib/platform-ai/conversation';
import { getPlatformAiUserId } from '../../src/lib/platform-ai/user';
import { stripThinkTags, parseThinkContent } from '../../src/lib/ai-agent/think-tag-parser';
import {
  AI_CHAT_QA_PROMPTS,
  scoreAgentAnswer,
  type QualityFlag,
} from './ai-chat-quality-lib';

const prisma = new PrismaClient();

const PROMPTS = AI_CHAT_QA_PROMPTS;

type TurnResult = {
  i: number;
  prompt: string;
  ok: boolean;
  qualityOk: boolean;
  score: number;
  flags: QualityFlag[];
  error?: string;
  thinkingChars: number;
  answerChars: number;
  hasThinkTag: boolean;
  orderOk: boolean;
  ms: number;
  assistantPreview?: string;
};

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function ensureSuperAdminToken(): Promise<{ userId: string; token: string }> {
  const phone = (process.env.SUPER_ADMIN_PHONES ?? '09374333028').split(',')[0]!.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, { phone: phone.replace(/^0/, '+98') }, { role: 'SUPER_ADMIN' }],
    },
  });
  if (!user) throw new Error(`SUPER_ADMIN user not found for phone ${phone}`);

  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 99_999_000, frozen: 0 },
    update: { balance: 99_999_000, frozen: 0 },
  });

  const token = generateToken();
  await prisma.authToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: daysFromNow(2),
    },
  });
  return { userId: user.id, token };
}

async function maybeFreshConversation(conversationId: string, platformAiId: string, fresh: boolean) {
  if (!fresh) return;
  // Keep the earliest welcome from the bot; drop the rest so history isn't poisoned
  const welcome = await prisma.message.findFirst({
    where: { conversationId, senderId: platformAiId, type: 'TEXT' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  await prisma.message.deleteMany({
    where: {
      conversationId,
      ...(welcome ? { id: { not: welcome.id } } : {}),
    },
  });
  console.log('Fresh conversation: pruned prior messages');
}

async function parseSse(res: Response): Promise<{
  thinking: string;
  answer: string;
  doneContent: string;
  error?: string;
  messageId?: string;
}> {
  if (!res.body) return { thinking: '', answer: '', doneContent: '', error: 'NO_BODY' };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType: string | null = null;
  let thinking = '';
  let answer = '';
  let doneContent = '';
  let error: string | undefined;
  let messageId: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const block of parts) {
      eventType = null;
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
      }
      if (!eventType || !dataLine) continue;
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(dataLine) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (eventType === 'thinking' && typeof data.delta === 'string') thinking += data.delta;
      if (eventType === 'token' && typeof data.delta === 'string') answer += data.delta;
      if (eventType === 'done') {
        doneContent = String(data.content ?? '');
        messageId = String(data.messageId ?? '');
      }
      if (eventType === 'error') {
        error = String(data.message ?? data.code ?? 'error');
      }
    }
  }
  return { thinking, answer, doneContent, error, messageId };
}

async function checkOrder(
  conversationId: string,
  userId: string,
  platformAiId: string,
  userClientTempId: string,
): Promise<boolean> {
  const rows = await prisma.message.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, clientTempId: true, createdAt: true, content: true },
  });
  const userIdx = rows.findIndex(
    (m) => m.clientTempId === userClientTempId || (m.senderId === userId && m.clientTempId === userClientTempId),
  );
  // Prefer matching by reply key sibling
  const replyKey = `agent-reply:${userClientTempId}`;
  const asstIdx = rows.findIndex((m) => m.clientTempId === replyKey);
  if (userIdx < 0 || asstIdx < 0) {
    // Fallback: last user then last assistant
    let lastUser = -1;
    let lastAsst = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]!.senderId === userId) lastUser = i;
      if (rows[i]!.senderId === platformAiId) lastAsst = i;
    }
    return lastUser >= 0 && lastAsst > lastUser;
  }
  return asstIdx > userIdx;
}

async function main() {
  const count = Number(arg('count', '100'));
  const base = arg('base', 'http://127.0.0.1:3000').replace(/\/$/, '');
  const fresh = process.argv.includes('--fresh');
  const { userId, token } = await ensureSuperAdminToken();
  const { conversation } = await ensurePlatformAiConversationForUser(userId);
  const platformAiId = await getPlatformAiUserId();
  await maybeFreshConversation(conversation.id, platformAiId, fresh);

  const fs = await import('fs');
  const path = await import('path');
  const outDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const progressPath = path.join(outDir, 'ai-chat-100-progress.jsonl');
  const summaryPath = path.join(outDir, 'ai-chat-100-summary.json');
  fs.writeFileSync(progressPath, '');

  const results: TurnResult[] = [];
  let okCount = 0;
  let qualityOkCount = 0;

  console.log(`AI chat stress: ${count} turns as ${userId} on ${conversation.id}`);

  for (let i = 0; i < count; i++) {
    const prompt = PROMPTS[i % PROMPTS.length]!;
    const clientTempId = randomUUID();
    const started = Date.now();
    let turn: TurnResult = {
      i: i + 1,
      prompt,
      ok: false,
      qualityOk: false,
      score: 0,
      flags: [],
      thinkingChars: 0,
      answerChars: 0,
      hasThinkTag: false,
      orderOk: false,
      ms: 0,
    };

    try {
      const res = await fetch(`${base}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: prompt,
          clientTempId,
        }),
      });

      const parsed = await parseSse(res);
      const content = parsed.doneContent || parsed.answer;
      const { thinking, answer: parsedAnswer } = parseThinkContent(content);
      const answer = stripThinkTags(content) || parsedAnswer;
      turn.thinkingChars = (parsed.thinking || thinking).length;
      turn.answerChars = answer.length;
      turn.hasThinkTag = /<think>/i.test(content);
      turn.assistantPreview = answer.slice(0, 160);
      turn.ms = Date.now() - started;

      const scored = scoreAgentAnswer({
        user: prompt,
        answer,
        thinking: parsed.thinking || thinking,
      });
      turn.flags = scored.flags;
      turn.score = scored.score;
      turn.qualityOk = scored.flags.length === 0;

      if (parsed.error || !answer.trim()) {
        turn.ok = false;
        turn.error = parsed.error || 'EMPTY_ANSWER';
      } else {
        turn.orderOk = await checkOrder(conversation.id, userId, platformAiId, clientTempId);
        turn.ok =
          turn.orderOk &&
          turn.qualityOk &&
          !/سرویس هوش مصنوعی موقتاً/.test(answer);
        if (!turn.orderOk) turn.error = 'ORDER_INVERTED';
        else if (!turn.qualityOk) turn.error = `QUALITY:${turn.flags.join(',')}`;
      }
    } catch (e) {
      turn.ms = Date.now() - started;
      turn.error = e instanceof Error ? e.message : String(e);
      turn.ok = false;
    }

    if (turn.ok) okCount++;
    if (turn.qualityOk) qualityOkCount++;
    results.push(turn);
    fs.appendFileSync(progressPath, `${JSON.stringify(turn)}\n`);
    console.log(
      `[${turn.i}/${count}] ${turn.ok ? 'OK' : 'FAIL'} score=${turn.score} ${turn.ms}ms flags=${turn.flags.join('|') || '-'} ${turn.error ?? ''} | ${prompt}`,
    );
  }

  const flagCounts = results.reduce(
    (acc, r) => {
      for (const f of r.flags) acc[f] = (acc[f] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const avgScore =
    results.length === 0
      ? 0
      : Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);

  const summary = {
    total: count,
    ok: okCount,
    fail: count - okCount,
    qualityOk: qualityOkCount,
    avgScore,
    flagCounts,
    conversationId: conversation.id,
    userId,
    finishedAt: new Date().toISOString(),
    failSamples: results.filter((r) => !r.ok).slice(0, 30),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log('SUMMARY', summary);
  await prisma.$disconnect();
  if (okCount < count * 0.85 || avgScore < 80) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
