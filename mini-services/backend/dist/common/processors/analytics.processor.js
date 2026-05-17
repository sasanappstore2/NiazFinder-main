"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnalyticsProcessor_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let AnalyticsProcessor = AnalyticsProcessor_1 = class AnalyticsProcessor extends bullmq_1.WorkerHost {
    constructor(dataSource, redis) {
        super();
        this.dataSource = dataSource;
        this.redis = redis;
        this.logger = new common_1.Logger(AnalyticsProcessor_1.name);
    }
    async process(job) {
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
    async aggregateDailyStats(data) {
        const date = data?.date || new Date().toISOString().split('T')[0];
        this.logger.log(`📊 Aggregating daily stats for ${date}...`);
        try {
            if (!this.dataSource || !this.dataSource.isInitialized) {
                this.logger.warn('Database not available — using Redis-only stats');
                const cached = await this.redis.get(`analytics:daily:${date}`);
                return { date, stats: cached ? JSON.parse(cached) : null, source: 'redis_cache' };
            }
            const userRepo = this.dataSource.getRepository('User');
            const newUsers = userRepo
                ? await userRepo
                    .createQueryBuilder('user')
                    .where('DATE(user.createdAt) = :date', { date })
                    .getCount()
                : 0;
            const requestRepo = this.dataSource.getRepository('Request');
            const newRequests = requestRepo
                ? await requestRepo
                    .createQueryBuilder('request')
                    .where('DATE(request.createdAt) = :date', { date })
                    .getCount()
                : 0;
            const proposalRepo = this.dataSource.getRepository('Proposal');
            const newProposals = proposalRepo
                ? await proposalRepo
                    .createQueryBuilder('proposal')
                    .where('DATE(proposal.createdAt) = :date', { date })
                    .getCount()
                : 0;
            const activeUsers = await this.redis.get(`analytics:active_users:${date}`) || '0';
            const stats = {
                date,
                newUsers,
                newRequests,
                newProposals,
                activeUsers: parseInt(activeUsers),
                aggregatedAt: new Date().toISOString(),
            };
            await this.redis.set(`analytics:daily:${date}`, JSON.stringify(stats), 7 * 24 * 60 * 60);
            await this.redis.set('analytics:daily:latest', JSON.stringify(stats), 24 * 60 * 60);
            this.logger.log(`✅ Daily stats aggregated for ${date}`);
            return { date, stats, processed: true };
        }
        catch (err) {
            this.logger.error(`Daily stats aggregation error: ${err.message}`);
            return { date, processed: false, error: err.message };
        }
    }
    async updateSearchTrending(data) {
        const topN = data?.topN || 20;
        this.logger.log(`🔥 Updating trending search terms (top ${topN})...`);
        try {
            const allTerms = await this.redis.keys('search:term:*');
            const termCounts = [];
            for (const key of allTerms) {
                const count = await this.redis.get(key);
                if (count) {
                    const term = key.replace('search:term:', '');
                    termCounts.push({ term, count: parseInt(count) });
                }
            }
            termCounts.sort((a, b) => b.count - a.count);
            const trending = termCounts.slice(0, topN);
            await this.redis.set('search:trending', JSON.stringify(trending), 60 * 60);
            this.logger.log(`✅ Updated trending: ${trending.length} terms`);
            return { trending, processed: true };
        }
        catch (err) {
            this.logger.error(`Search trending error: ${err.message}`);
            return { processed: false, error: err.message };
        }
    }
    async calculateEngagement(data) {
        this.logger.log(`📈 Calculating engagement scores...`);
        try {
            if (!this.dataSource || !this.dataSource.isInitialized) {
                this.logger.warn('Database not available — skipping engagement calculation');
                return { processed: false, reason: 'no_database' };
            }
            const userId = data?.userId;
            if (userId) {
                const score = await this.calculateUserScore(userId);
                await this.redis.set(`engagement:${userId}`, JSON.stringify({ score, calculatedAt: new Date().toISOString() }), 24 * 60 * 60);
                return { userId, score, processed: true };
            }
            const userRepo = this.dataSource.getRepository('User');
            if (!userRepo)
                return { processed: false };
            const users = await userRepo
                .createQueryBuilder('user')
                .where('user.isActive = :active', { active: true })
                .select(['user.id'])
                .limit(1000)
                .getMany();
            let processed = 0;
            for (const user of users) {
                const score = await this.calculateUserScore(user.id);
                await this.redis.set(`engagement:${user.id}`, JSON.stringify({ score, calculatedAt: new Date().toISOString() }), 24 * 60 * 60);
                processed++;
            }
            this.logger.log(`✅ Engagement scores calculated for ${processed} users`);
            return { totalUsers: users.length, processed, processedAt: new Date().toISOString() };
        }
        catch (err) {
            this.logger.error(`Engagement calculation error: ${err.message}`);
            return { processed: false, error: err.message };
        }
    }
    async updateCategoryCounts(data) {
        this.logger.log('📂 Updating category request counts...');
        try {
            if (!this.dataSource || !this.dataSource.isInitialized) {
                this.logger.warn('Database not available — skipping category count update');
                return { processed: false };
            }
            const requestRepo = this.dataSource.getRepository('Request');
            if (!requestRepo)
                return { processed: false };
            const categoryCounts = await requestRepo
                .createQueryBuilder('request')
                .select('request.categoryId', 'categoryId')
                .addSelect('COUNT(*)', 'count')
                .where('request.status != :status', { status: 'DELETED' })
                .groupBy('request.categoryId')
                .getRawMany();
            for (const row of categoryCounts) {
                await this.redis.set(`category:requests:${row.categoryId}`, row.count.toString(), 6 * 60 * 60);
            }
            await this.redis.set('category:requests:all', JSON.stringify(categoryCounts), 6 * 60 * 60);
            this.logger.log(`✅ Updated counts for ${categoryCounts.length} categories`);
            return { categories: categoryCounts.length, processed: true };
        }
        catch (err) {
            this.logger.error(`Category count update error: ${err.message}`);
            return { processed: false, error: err.message };
        }
    }
    async calculateUserScore(userId) {
        if (!this.dataSource || !this.dataSource.isInitialized)
            return 0;
        let score = 0;
        const requestRepo = this.dataSource.getRepository('Request');
        if (requestRepo) {
            const requestCount = await requestRepo
                .createQueryBuilder('request')
                .where('request.userId = :userId', { userId })
                .getCount();
            score += requestCount * 3;
        }
        const proposalRepo = this.dataSource.getRepository('Proposal');
        if (proposalRepo) {
            const proposalCount = await proposalRepo
                .createQueryBuilder('proposal')
                .where('proposal.userId = :userId', { userId })
                .getCount();
            score += proposalCount * 4;
        }
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
};
exports.AnalyticsProcessor = AnalyticsProcessor;
exports.AnalyticsProcessor = AnalyticsProcessor = AnalyticsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('analytics'),
    __param(0, (0, common_1.Inject)('DATA_SOURCE')),
    __metadata("design:paramtypes", [Object, redis_service_1.RedisService])
], AnalyticsProcessor);
//# sourceMappingURL=analytics.processor.js.map