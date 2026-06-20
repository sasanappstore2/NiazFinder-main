import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { InternalSecretGuard } from '../guards/internal-secret.guard';
import { VipBroadcastService } from '../services/vip-broadcast.service';
import { NeedVisibilityService } from '../services/need-visibility.service';

@Controller('smart-matching/internal/needs')
@UseGuards(InternalSecretGuard)
export class SmartMatchingInternalController {
  constructor(
    private readonly vipBroadcast: VipBroadcastService,
    private readonly visibility: NeedVisibilityService,
  ) {}

  @Post(':id/vip-broadcast')
  async vipBroadcast(@Param('id') id: string) {
    return this.vipBroadcast.run(id);
  }

  @Post(':id/schedule-expiry')
  async scheduleExpiry(@Param('id') id: string) {
    await this.visibility.scheduleExpiry(id);
    return { ok: true };
  }
}
