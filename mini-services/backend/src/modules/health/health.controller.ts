import { Controller, Get, Inject, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private redis: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'سیستم سلامت', description: 'وضعیت سرویس‌ها و بررسی سلامت' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      {
        id: 'redis',
        name: 'Redis',
      } as any,
    ] as any);
  }
}
