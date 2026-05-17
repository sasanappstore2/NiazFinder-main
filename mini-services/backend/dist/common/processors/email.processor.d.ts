import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
export declare class EmailProcessor extends WorkerHost {
    private readonly logger;
    private rateLimits;
    private dedupCache;
    private readonly RATE_LIMIT_MAX;
    private readonly RATE_LIMIT_WINDOW_MS;
    private readonly DEDUP_WINDOW_MS;
    process(job: Job): Promise<any>;
    private checkRateLimit;
    private hashEmail;
    private simulateSend;
    cleanup(): void;
}
