import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
export declare class NotificationProcessor extends WorkerHost {
    private readonly logger;
    process(job: Job): Promise<any>;
}
