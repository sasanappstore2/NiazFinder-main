import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

/**
 * Analytics processor for background aggregation jobs.
 *
 * Jobs:
 * - aggregate_daily_stats: Compile daily platform statistics
 * - update_search_trending: Update trending search terms
 * - calculate_engagement: Compute user engagement scores
 * - update_category_counts: Refresh category request counts
 */
@Processor('analytics')
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource | null,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'aggregate_daily_stats':
        return this.aggregateDailyStats(job.data);
      case 'update_search_trending':
        return this.updateSearchTrending(job.data);
      case 'calculate_engagement':
        return this.calculateEngagement(job.data);
      case 'update_category_counts':
        return this.updateCategoryCounts(job.data);
      default:
        this.logger.warn(`⚠️ Unknown analytics job: ${job.name}`);
        return { processed: false };
    }
  }

  /**
   * Aggregate daily platform statistics and cache in Redis.
   */
  private async aggregateDailyStats(data?: { date?: string }): Promise<any> {
    const date = data?.date || new Date().toISOString().split('T')[0];
    this.logger.log(`📊 Aggregating daily stats for ${date}...`);

    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        this.logger.warn('Database not available — using Redis-only stats');
        const cached = await this.redis.get(`analytics:daily:${date}`);
        return { date, stats: cached ? JSON.parse(cached) : null, source: 'redis_cache' };
      }

      // Count new users today
      const userRepo = this.dataSource.getRepository('User');
      const newUsers = userRepo
        ? await userRepo
            .createQueryBuilder('user')
            .where('DATE(user.createdAt) = :date', { date })
            .getCount()
        : 0;

      // Count new requests today
      const requestRepo = this.dataSource.getRepository('Request');
      const newRequests = requestRepo
        ? await requestRepo
            .createQueryBuilder('request')
            .where('DATE(request.createdAt) = :date', { date })
            .getCount()
        : 0;

      // Count new proposals today
      const proposalRepo = this.dataSource.getRepository('Proposal');
      const newProposals = proposalRepo
        ? await proposalRepo
            .createQueryBuilder('proposal')
            .where('DATE(proposal.createdAt) = :date', { date })
            .getCount()
        : 0;

      // Count active users (users who logged in today — from Redis)
      const activeUsers = await this.redis.get(`analytics:active_users:${date}`) || '0';

      const stats = {
        date,
        newUsers,
        newRequests,
        newProposals,
        activeUsers: parseInt(activeUsers),
        aggregatedAt: new Date().toISOString(),
      };

      // Cache for 7 days
      await this.redis.set(
        `analytics:daily:${date}`,
        JSON.stringify(stats),
        7 * 24 * 60 * 60,
      );

      // Also cache as latest
      await this.redis.set(
        'analytics:daily:latest',
        JSON.stringify(stats),
        24 * 60 * 60,
      );

      this.logger.log(`✅ Daily stats aggregated for ${date}`);
      return { date, stats, processed: true };
    } catch (err) {
      this.logger.error(`Daily stats aggregation error: ${(err as Error).message}`);
      return { date, processed: false, error: (err as Error).message };
    }
  }

  /**
   * Update trending search terms based on recent search activity.
   */
  private async updateSearchTrending(data?: { topN?: number }): Promise<any> {
    const topN = data?.topN || 20;
    this.logger.log(`🔥 Updating trending search terms (top ${topN})...`);

    try {
      // Fetch search counts from Redis keys
      const allTerms = await this.redis.keys('search:term:*');
      const termCounts: { term: string; count: number }[] = [];

      for (const key of allTerms) {
        const count = await this.redis.get(key);
        if (count) {
          const term = key.replace('search:term:', '');
          termCounts.push({ term, count: parseInt(count) });
        }
      }

      // Sort by count descending, take top N
      termCounts.sort((a, b) => b.count - a.count);
      const trending = termCounts.slice(0, topN);

      // Cache trending list for 1 hour
      await this.redis.set(
        'search:trending',
        JSON.stringify(trending),
        60 * 60,
      );

      this.logger.log(`✅ Updated trending: ${trending.length} terms`);
      return { trending, processed: true };
    } catch (err) {
      this.logger.error(`Search trending error: ${(err as Error).message}`);
      return { processed: false, error: (err as Error).message };
    }
  }

  /**
   * Calculate user engagement scores based on activity.
   *
   * Score components:
   * - Requests created (weight: 3)
   * - Proposals submitted (weight: 4)
   * - Reviews written (weight: 5)
   * - Login frequency (weight: 2)
   */
  private async calculateEngagement(data?: { userId?: string }): Promise<any> {
    this.logger.log(`📈 Calculating engagement scores...`);

    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        this.logger.warn('Database not available — skipping engagement calculation');
        return { processed: false, reason: 'no_database' };
      }

      const userId = data?.userId;

      if (userId) {
        // Calculate for a specific user
        const score = await this.calculateUserScore(userId);
        await this.redis.set(
          `engagement:${userId}`,
          JSON.stringify({ score, calculatedAt: new Date().toISOString() }),
          24 * 60 * 60,
        );
        return { userId, score, processed: true };
      }

      // Calculate for all active users (batch)
      const userRepo = this.dataSource.getRepository('User');
      if (!userRepo) return { processed: false };

      const users = await userRepo
        .createQueryBuilder('user')
        .where('user.isActive = :active', { active: true })
        .select(['user.id'])
        .limit(1000)
        .getMany();

      let processed = 0;
      for (const user of users) {
        const score = await this.calculateUserScore(user.id);
        await this.redis.set(
          `engagement:${user.id}`,
          JSON.stringify({ score, calculatedAt: new Date().toISOString() }),
          24 * 60 * 60,
        );
        processed++;
      }

      this.logger.log(`✅ Engagement scores calculated for ${processed} users`);
      return { totalUsers: users.length, processed, processedAt: new Date().toISOString() };
    } catch (err) {
      this.logger.error(`Engagement calculation error: ${(err as Error).message}`);
      return { processed: false, error: (err as Error).message };
    }
  }

  /**
   * Update category request counts.
   */
  private async updateCategoryCounts(data?: any): Promise<any> {
    this.logger.log('📂 Updating category request counts...');

    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        this.logger.warn('Database not available — skipping category count update');
        return { processed: false };
      }

      const requestRepo = this.dataSource.getRepository('Request');
      if (!requestRepo) return { processed: false };

      // Count requests per category
      const categoryCounts = await requestRepo
        .createQueryBuilder('request')
        .select('request.categoryId', 'categoryId')
        .addSelect('COUNT(*)', 'count')
        .where('request.status != :status', { status: 'DELETED' })
        .groupBy('request.categoryId')
        .getRawMany();

      // Cache each category count
      for (const row of categoryCounts) {
        await this.redis.set(
          `category:requests:${row.categoryId}`,
          row.count.toString(),
          6 * 60 * 60, // 6 hours TTL
        );
      }

      // Cache the full list
      await this.redis.set(
        'category:requests:all',
        JSON.stringify(categoryCounts),
        6 * 60 * 60,
      );

      this.logger.log(`✅ Updated counts for ${categoryCounts.length} categories`);
      return { categories: categoryCounts.length, processed: true };
    } catch (err) {
      this.logger.error(`Category count update error: ${(err as Error).message}`);
      return { processed: false, error: (err as Error).message };
    }
  }

  /**
   * Calculate engagement score for a single user.
   */
  private async calculateUserScore(userId: string): Promise<number> {
    if (!this.dataSource || !this.dataSource.isInitialized) return 0;

    let score = 0;

    // Requests created (weight: 3)
    const requestRepo = this.dataSource.getRepository('Request');
    if (requestRepo) {
      const requestCount = await requestRepo
        .createQueryBuilder('request')
        .where('request.userId = :userId', { userId })
        .getCount();
      score += requestCount * 3;
    }

    // Proposals submitted (weight: 4)
    const proposalRepo = this.dataSource.getRepository('Proposal');
    if (proposalRepo) {
      const proposalCount = await proposalRepo
        .createQueryBuilder('proposal')
        .where('proposal.userId = :userId', { userId })
        .getCount();
      score += proposalCount * 4;
    }

    // Reviews written (weight: 5)
    const reviewRepo = this.dataSource.getRepository('Review');
    if (reviewRepo) {
      const reviewCount = await reviewRepo
        .createQueryBuilder('review')
        .where('review.userId = :userId', { userId })
        .getCount();
      score += reviewCount * 5;
    }

    return score;
  }
}
