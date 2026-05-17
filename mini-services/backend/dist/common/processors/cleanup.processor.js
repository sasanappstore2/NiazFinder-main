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
var CleanupProcessor_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let CleanupProcessor = CleanupProcessor_1 = class CleanupProcessor extends bullmq_1.WorkerHost {
    constructor(dataSource, redis) {
        super();
        this.dataSource = dataSource;
        this.redis = redis;
        this.logger = new common_1.Logger(CleanupProcessor_1.name);
    }
    async process(job) {
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
    async cleanExpiredOtps() {
        this.logger.log('🧹 Starting expired OTP cleanup...');
        let cleaned = 0;
        try {
            const otpKeys = await this.redis.keys('otp:*');
            for (const key of otpKeys) {
                const ttl = await this.redis.getTtl(key);
                if (ttl === -2) {
                    continue;
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
                    }
                    catch {
                    }
                }
            }
        }
        catch (err) {
            this.logger.error(`OTP cleanup error: ${err.message}`);
        }
        this.logger.log(`✅ OTP cleanup complete: ${cleaned} expired OTPs removed`);
        return { cleaned };
    }
    async cleanSoftDeleted() {
        this.logger.log('🧹 Starting soft-deleted records cleanup...');
        let cleaned = 0;
        if (!this.dataSource || !this.dataSource.isInitialized) {
            this.logger.warn('Database not available — skipping soft-delete cleanup');
            return { cleaned };
        }
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const userRepo = this.dataSource.getRepository('User');
            if (userRepo) {
                const result = await userRepo
                    .createQueryBuilder('user')
                    .where('user.deletedAt IS NOT NULL AND user.deletedAt < :date', { date: thirtyDaysAgo })
                    .delete()
                    .execute();
                cleaned += result.affected || 0;
            }
            const requestRepo = this.dataSource.getRepository('Request');
            if (requestRepo) {
                const result = await requestRepo
                    .createQueryBuilder('request')
                    .where('request.deletedAt IS NOT NULL AND request.deletedAt < :date', { date: thirtyDaysAgo })
                    .delete()
                    .execute();
                cleaned += result.affected || 0;
            }
        }
        catch (err) {
            this.logger.error(`Soft-delete cleanup error: ${err.message}`);
        }
        this.logger.log(`✅ Soft-delete cleanup complete: ${cleaned} records removed`);
        return { cleaned };
    }
    async cleanOldNotifications() {
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
        }
        catch (err) {
            this.logger.error(`Notification cleanup error: ${err.message}`);
        }
        this.logger.log(`✅ Notification cleanup complete: ${cleaned} notifications removed`);
        return { cleaned };
    }
    async resetStaleViewCounts() {
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
                    }
                    catch {
                        await this.redis.del(key);
                        cleaned++;
                    }
                }
            }
        }
        catch (err) {
            this.logger.error(`View count cleanup error: ${err.message}`);
        }
        this.logger.log(`✅ Stale view count cleanup complete: ${cleaned} keys removed`);
        return { cleaned };
    }
};
exports.CleanupProcessor = CleanupProcessor;
exports.CleanupProcessor = CleanupProcessor = CleanupProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('cleanup'),
    __param(0, (0, common_1.Inject)('DATA_SOURCE')),
    __metadata("design:paramtypes", [Object, redis_service_1.RedisService])
], CleanupProcessor);
//# sourceMappingURL=cleanup.processor.js.map