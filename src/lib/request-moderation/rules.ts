import { db } from '@/lib/db';

export type ModerationRuleResult = {
  pass: boolean;
  flags: string[];
  score: number;
};

const BANNED_WORDS = ['spam', 'کلاهبرداری', 'فیشینگ'];

export async function evaluateRequestModeration(requestId: string): Promise<ModerationRuleResult> {
  const request = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      title: true,
      description: true,
      userId: true,
      createdAt: true,
    },
  });

  if (!request) {
    return { pass: false, flags: ['not_found'], score: 0 };
  }

  const flags: string[] = [];
  let score = 100;
  const text = `${request.title} ${request.description}`.toLowerCase();

  for (const word of BANNED_WORDS) {
    if (text.includes(word.toLowerCase())) {
      flags.push(`banned_word:${word}`);
      score -= 40;
    }
  }

  if (request.title.trim().length < 5) {
    flags.push('title_too_short');
    score -= 20;
  }

  if (request.description.trim().length < 20) {
    flags.push('description_too_short');
    score -= 15;
  }

  // Duplicate title by same user in last hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const dupCount = await db.serviceRequest.count({
    where: {
      userId: request.userId,
      title: request.title,
      createdAt: { gte: hourAgo },
      id: { not: request.id },
    },
  });
  if (dupCount > 0) {
    flags.push('duplicate_title');
    score -= 30;
  }

  // Rate limit: >10 submissions per hour per user
  const recentCount = await db.serviceRequest.count({
    where: {
      userId: request.userId,
      createdAt: { gte: hourAgo },
    },
  });
  if (recentCount > 10) {
    flags.push('rate_limit');
    score -= 25;
  }

  return {
    pass: score >= 70 && flags.length === 0,
    flags,
    score: Math.max(0, score),
  };
}
