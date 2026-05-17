import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { RedisService } from '../../common/redis/redis.service';
export declare class HealthController {
    private health;
    private redis;
    private readonly logger;
    constructor(health: HealthCheckService, redis: RedisService);
    check(): Promise<HealthCheckResult>;
}
