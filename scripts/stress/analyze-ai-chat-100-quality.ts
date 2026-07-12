import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';

function stripThink(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim();
}

function extractThink(content: string): string {
  const m = content.match(/<think>([\s\S]*?)<\/think>/i);
  return (m?.[1] ?? '').trim();
}

const summary = JSON.parse(readFileSync('./tmp/ai-chat-100-summary.json', 'utf8')) as {
  conversationId: string;
  userId: string;
};

async function main() {
  const p = new PrismaClient();

  const rows = await p.message.findMany({
    where: { conversationId: summary.conversationId, type: 'TEXT', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { senderId: true, content: true, clientTempId: true },
  });

  type Pair = { i: number; user: string; answer: string; thinking: string };
  const pairs: Pair[] = [];
  let i = 0;
  for (const m of rows) {
    if (m.senderId !== summary.userId) continue;
    if (!m.clientTempId || m.clientTempId.startsWith('agent-reply:')) continue;
    const asst = rows.find((r) => r.clientTempId === `agent-reply:${m.clientTempId}`);
    if (!asst) continue;
    i += 1;
    pairs.push({
      i,
      user: m.content,
      answer: stripThink(asst.content),
      thinking: extractThink(asst.content),
    });
  }

  type Issue = { i: number; user: string; flags: string[]; answer: string };
  const issues: Issue[] = [];

  for (const pair of pairs) {
    const flags: string[] = [];
    const a = pair.answer;
    const u = pair.user.trim();

    if (!a) flags.push('empty');
    if (a.includes('سرویس هوش مصنوعی موقتاً')) flags.push('unavailable_msg');
    if (/playstation|ps5|پلی.?استیشن/i.test(a) && !/playstation|ps5|پلی.?استیشن/i.test(u)) {
      flags.push('hallucinated_topic');
    }
    if (/\{"action"|tool_call|get_site_categories|search_needs_agent/i.test(a)) {
      flags.push('leaked_tool_json');
    }
    if (a.length < 25 && !/^(سلام|ممنون|خواهش)/.test(u)) flags.push('too_short');
    if (a.length > 550) flags.push('too_long');

    if (
      /چطور|راهنما|ثبت/.test(u) &&
      /داشبورد|ثبت نیاز/.test(a) &&
      !/\/post|نیازفایندر\.|دکمهٔ|از منو|مسیر/.test(a)
    ) {
      flags.push('vague_howto');
    }

    if (/^(سلام|سلام، خوبی\؟|ممنون)/.test(u) && a.length > 200) {
      flags.push('overlong_for_smalltalk');
    }

    if (
      /دسته/.test(u) &&
      !/املاک|خودرو|موبایل|لوازم|خدمات|استخدام|دیجیتال|خانه|آپارتمان|کالا|ورزش|پوشاک/.test(a)
    ) {
      flags.push('no_concrete_category');
    }

    if (/وضعیت حساب|کیف پول/.test(u) && !/\d|تومان|موجودی|نقش|تأیید|تایید|شارژ/.test(a)) {
      flags.push('no_account_facts');
    }

    if (/Thinking Process/i.test(pair.thinking)) flags.push('english_thinking');
    if (/خوشحال می‌شوم|در خدمتم|چطور می‌توانم امروز/.test(a)) flags.push('boilerplate');

    if (flags.length) {
      issues.push({ i: pair.i, user: u, flags, answer: a.slice(0, 220) });
    }
  }

  const flagCounts = issues.reduce(
    (acc, x) => {
      for (const f of x.flags) acc[f] = (acc[f] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const report = {
    conversationId: summary.conversationId,
    pairs: pairs.length,
    withThink: pairs.filter((x) => x.thinking).length,
    issueCount: issues.length,
    issueRate: pairs.length ? Number((issues.length / pairs.length).toFixed(2)) : 0,
    flagCounts,
    samples: [1, 2, 4, 6, 8, 9, 11, 20, 40, 60, 80, 100]
      .map((n) => pairs.find((p) => p.i === n))
      .filter(Boolean)
      .map((p) => ({
        i: p!.i,
        user: p!.user,
        thinking: p!.thinking.slice(0, 140),
        answer: p!.answer.slice(0, 280),
        flags: issues.find((x) => x.i === p!.i)?.flags ?? [],
      })),
    topIssues: issues.slice(0, 40),
  };

  writeFileSync('./tmp/ai-chat-100-quality-report.json', JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pairs: report.pairs,
        withThink: report.withThink,
        issueCount: report.issueCount,
        issueRate: report.issueRate,
        flagCounts: report.flagCounts,
      },
      null,
      2,
    ),
  );

  console.log('\n--- SAMPLES ---\n');
  for (const s of report.samples) {
    console.log(`#${s.i} Q: ${s.user}`);
    if (s.thinking) console.log(`  T: ${s.thinking}`);
    console.log(`  A: ${s.answer}`);
    if (s.flags.length) console.log(`  ! ${s.flags.join(', ')}`);
    console.log('');
  }

  console.log('\n--- ISSUES (40) ---\n');
  for (const x of report.topIssues) {
    console.log(`#${x.i} [${x.flags.join(', ')}]`);
    console.log(`  Q: ${x.user}`);
    console.log(`  A: ${x.answer}`);
    console.log('');
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
