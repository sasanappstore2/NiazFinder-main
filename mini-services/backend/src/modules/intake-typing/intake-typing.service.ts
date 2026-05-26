import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '../../common/redis/redis.service';

export interface TypingAnalysisPayload {
  sessionId: string;
  textHash: string;
  intent: string;
  categorySlug: string;
  subcategorySlug?: string;
  confidence: number;
  tags: string[];
  keywords: string[];
  suggestions: string[];
  spam: { isSpam: boolean; reason?: string };
  duplicate: { likely: boolean; matchIds?: string[] };
  preloads?: { specialists?: boolean; requests?: boolean };
  latencyMs: number;
  source: 'rules' | 'cache';
  seq?: number;
}

@Injectable()
export class IntakeTypingService {
  private readonly logger = new Logger(IntakeTypingService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private hashText(text: string): string {
    return createHash('sha256')
      .update(text.trim().toLowerCase().replace(/\s+/g, ' '))
      .digest('hex')
      .slice(0, 16);
  }

  private cacheKey(sessionId: string, textHash: string): string {
    return `typing:v1:${sessionId}:${textHash}`;
  }

  async getCached(sessionId: string, text: string): Promise<TypingAnalysisPayload | null> {
    const textHash = this.hashText(text);
    const raw = await this.redis.get(this.cacheKey(sessionId, textHash));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as TypingAnalysisPayload;
      return { ...parsed, source: 'cache', latencyMs: 0 };
    } catch {
      return null;
    }
  }

  async setCached(result: TypingAnalysisPayload, text: string): Promise<void> {
    const textHash = this.hashText(text);
    await this.redis.set(
      this.cacheKey(result.sessionId, textHash),
      JSON.stringify({ ...result, textHash }),
      600,
    );
  }

  async checkRateLimit(key: string): Promise<{ ok: boolean; retryAfterMs?: number }> {
    const redisKey = `ratelimit:typing:${key}`;
    const count = await this.redis.increment(redisKey);
    if (count === 1) {
      await this.redis.expire(redisKey, 60);
    }
    if (count > 30) {
      return { ok: false, retryAfterMs: 60_000 };
    }
    return { ok: true };
  }

  async analyze(
    sessionId: string,
    text: string,
    seq?: number,
  ): Promise<TypingAnalysisPayload> {
    const cached = await this.getCached(sessionId, text);
    if (cached) {
      return { ...cached, seq };
    }

    const baseUrl =
      this.config.get<string>('NEXT_TYPING_ANALYZE_URL') ||
      'http://127.0.0.1:3000/api/need-intake/typing-analyze';
    const secret = this.config.get<string>('TYPING_INTERNAL_SECRET') || '';

    const started = Date.now();
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-typing-internal-secret': secret } : {}),
      },
      body: JSON.stringify({ sessionId, text, seq }),
    });

    if (!res.ok) {
      this.logger.warn(`Next typing-analyze failed: ${res.status}`);
      throw new Error('typing_analyze_failed');
    }

    const json = (await res.json()) as { ok: boolean; result?: TypingAnalysisPayload };
    if (!json.ok || !json.result) {
      throw new Error('typing_analyze_invalid');
    }

    const result = { ...json.result, seq, latencyMs: Date.now() - started };
    if (!result.spam?.isSpam) {
      await this.setCached(result, text);
    }
    return result;
  }
}
