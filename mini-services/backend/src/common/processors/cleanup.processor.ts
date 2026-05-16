import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

/**
 * Cleanup processor for periodic maintenance jobs.
 *
 * Jobs:
 * - clean_expired_otps: Remove OTP codes older than 24 hours
 * - clean_soft_deleted: Remove soft-deleted records older than 30 days
 * - clean_old_notifications: Clean read notifications older than 90 days
 * - reset_stale_view_counts: Reset view counts not updated recently
 */
@Processor('cleanup')
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource | null,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'clean_expired_otps':
        return this.cleanExpiredOtps();
      case 'clean_soft_deleted':
        return this.cleanSoftDeleted();
      case 'clean_old_notifications':
        return this.cleanOldNotifications();
      case 'reset_stale_view_counts':
        return this.resetStaleViewCounts();
      default:
        this.logger.warn(`⚠️ Unknown cleanup job: ${job.name}`);
        return { cleaned: 0 };
    }
  }

  /**
   * Remove OTP codes older than 24 hours from Redis.
   */
  private async cleanExpiredOtps(): Promise<{ cleaned: number }> {
    this.logger.log('🧹 Starting expired OTP cleanup...');
    let cleaned = 0;

    try {
      const otpKeys = await this.redis.keys('otp:*');
      for (const key of otpKeys) {
        const ttl = await this.redis.getTtl(key);
        if (ttl === -2) {
          continue; // Already expired
        }
        const raw = await this.redis.get(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const createdAt = new Date(data.createdAt || data.timestamp || 0);
            const ageMs = Date.now() - createdAt.getTime();
            if (ageMs > 24 * 60 * 60 * 1000) {
              await this.redis.del(key);
              cleaned++;
            }
          } catch {
            // Not JSON — skip
          }
        }
      }
    } catch (err) {
      this.logger.error(`OTP cleanup error: ${(err as Error).message}`);
    }

    this.logger.log(`✅ OTP cleanup complete: ${cleaned} expired OTPs removed`);
    return { cleaned };
  }

  /**
   * Clean soft-deleted records older than 30 days from the database.
   */
  private async cleanSoftDeleted(): Promise<{ cleaned: number }> {
    this.logger.log('🧹 Starting soft-deleted records cleanup...');
    let cleaned = 0;

    if (!this.dataSource || !this.dataSource.isInitialized) {
      this.logger.warn('Database not available — skipping soft-delete cleanup');
      return { cleaned };
    }

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean soft-deleted users
      const userRepo = this.dataSource.getRepository('User');
      if (userRepo) {
        const result = await userRepo
          .createQueryBuilder('user')
          .where('user.deletedAt IS NOT NULL AND user.deletedAt < :date', { date: thirtyDaysAgo })
          .delete()
          .execute();
        cleaned += result.affected || 0;
      }

      // Clean soft-deleted requests
      const requestRepo = this.dataSource.getRepository('Request');
      if (requestRepo) {
        const result = await requestRepo
          .createQueryBuilder('request')
          .where('request.deletedAt IS NOT NULL AND request.deletedAt < :date', { date: thirtyDaysAgo })
          .delete()
          .execute();
        cleaned += result.affected || 0;
      }
    } catch (err) {
      this.logger.error(`Soft-delete cleanup error: ${(err as Error).message}`);
    }

    this.logger.log(`✅ Soft-delete cleanup complete: ${cleaned} records removed`);
    return { cleaned };
  }

  /**
   * Clean read notifications older than 90 days.
   */
  private async cleanOldNotifications(): Promise<{ cleaned: number }> {
    this.logger.log('🧹 Starting old notifications cleanup...');
    let cleaned = 0;

    if (!this.dataSource || !this.dataSource.isInitialized) {
      this.logger.warn('Database not available — skipping notification cleanup');
      return { cleaned };
    }

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const notifRepo = this.dataSource.getRepository('Notification');
      if (notifRepo) {
        const result = await notifRepo
          .createQueryBuilder('notification')
          .where('notification.isRead = :read AND notification.createdAt < :date', {
            read: true,
            date: ninetyDaysAgo,
          })
          .delete()
          .execute();
        cleaned += result.affected || 0;
      }
    } catch (err) {
      this.logger.error(`Notification cleanup error: ${(err as Error).message}`);
    }

    this.logger.log(`✅ Notification cleanup complete: ${cleaned} notifications removed`);
    return { cleaned };
  }

  /**
   * Reset view counts that haven't been updated recently (stale counters).
   * View counts cached in Redis that haven't been written back in 24h get flushed.
   */
  private async resetStaleViewCounts(): Promise<{ cleaned: number }> {
    this.logger.log('🧹 Starting stale view count reset...');
    let cleaned = 0;

    try {
      const viewCountKeys = await this.redis.keys('views:*');
      for (const key of viewCountKeys) {
        const raw = await this.redis.get(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const lastUpdated = new Date(data.lastSyncAt || data.updatedAt || 0);
            const ageMs = Date.now() - lastUpdated.getTime();
            if (ageMs > 24 * 60 * 60 * 1000) {
              await this.redis.del(key);
              cleaned++;
            }
          } catch {
            await this.redis.del(key);
            cleaned++;
          }
        }
      }
    } catch (err) {
      this.logger.error(`View count cleanup error: ${(err as Error).message}`);
    }

    this.logger.log(`✅ Stale view count cleanup complete: ${cleaned} keys removed`);
    return { cleaned };
  }
}
