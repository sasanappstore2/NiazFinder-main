import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Email queue processor with retry logic and rate limiting.
 *
 * Features:
 * - Exponential backoff on failure (handled by BullMQ default job options)
 * - Per-recipient rate limiting (max 5 emails per minute)
 * - Deduplication of identical emails within a 30-second window
 * - Graceful error handling with categorized failure reasons
 */
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  /** In-memory rate limit counters: recipient → { count, windowStart } */
  private rateLimits: Map<string, { count: number; windowStart: number }> = new Map();

  /** In-memory dedup set: hash → timestamp */
  private dedupCache: Map<string, number> = new Map();

  /** Max emails per recipient per window */
  private readonly RATE_LIMIT_MAX = 5;

  /** Rate limit window in ms */
  private readonly RATE_LIMIT_WINDOW_MS = 60_000;

  /** Dedup window in ms */
  private readonly DEDUP_WINDOW_MS = 30_000;

  async process(job: Job): Promise<any> {
    const { to, subject, template, context } = job.data;

    // 1) Dedup check — skip if identical email sent recently
    const dedupKey = this.hashEmail(to, subject, template);
    const now = Date.now();
    if (this.dedupCache.has(dedupKey)) {
      const prevTime = this.dedupCache.get(dedupKey)!;
      if (now - prevTime < this.DEDUP_WINDOW_MS) {
        this.logger.warn(`⏭️ Duplicate email skipped: ${to} - ${subject}`);
        return { sent: false, reason: 'duplicate' };
      }
    }
    this.dedupCache.set(dedupKey, now);

    // 2) Rate limit check
    if (!this.checkRateLimit(to)) {
      this.logger.warn(`⏳ Email rate limited for ${to}`);
      // Retry after a delay — throw to trigger BullMQ retry
      throw new Error(`Rate limit exceeded for ${to}. Retrying later...`);
    }

    // 3) Send email (placeholder — integrate with SendGrid/SES in production)
    try {
      this.logger.log(`📧 Sending email to ${to}: ${subject} (template: ${template || 'none'})`);

      // Simulate sending
      await this.simulateSend(to, subject);

      this.logger.log(`✅ Email sent successfully to ${to}: ${subject}`);
      return {
        sent: true,
        to,
        subject,
        template: template || null,
        sentAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}: ${(err as Error).message}`);
      throw err; // Re-throw to trigger BullMQ retry
    }
  }

  /**
   * Check rate limit for a recipient.
   * Returns true if under limit, false if exceeded.
   */
  private checkRateLimit(recipient: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(recipient);

    if (!entry || now - entry.windowStart > this.RATE_LIMIT_WINDOW_MS) {
      // New window
      this.rateLimits.set(recipient, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Simple hash for deduplication.
   */
  private hashEmail(to: string, subject: string, template?: string): string {
    return `${to}:${subject}:${template || ''}`.toLowerCase();
  }

  /**
   * Simulate email send — replace with actual provider integration.
   */
  private async simulateSend(_to: string, _subject: string): Promise<void> {
    // In production: await this.sendGridService.send({ to, subject, ... });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Periodically clean up stale dedup and rate-limit entries.
   * Call this from a scheduled job or on module init.
   */
  cleanup(): void {
    const now = Date.now();

    // Clean dedup cache
    for (const [key, ts] of this.dedupCache) {
      if (now - ts > this.DEDUP_WINDOW_MS * 2) {
        this.dedupCache.delete(key);
      }
    }

    // Clean rate limits
    for (const [key, entry] of this.rateLimits) {
      if (now - entry.windowStart > this.RATE_LIMIT_WINDOW_MS * 2) {
        this.rateLimits.delete(key);
      }
    }
  }
}
