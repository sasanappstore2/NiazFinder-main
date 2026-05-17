import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';
export declare class CleanupProcessor extends WorkerHost {
    private readonly dataSource;
    private readonly redis;
    private readonly logger;
    constructor(dataSource: DataSource | null, redis: RedisService);
    process(job: Job): Promise<any>;
    private cleanExpiredOtps;
    private cleanSoftDeleted;
    private cleanOldNotifications;
    private resetStaleViewCounts;
}
