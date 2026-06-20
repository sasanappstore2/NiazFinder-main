import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SmartMatchingNeedsController } from './controllers/smart-matching-needs.controller';
import { SmartMatchingBusinessController } from './controllers/smart-matching-business.controller';
import { SmartMatchingInternalController } from './controllers/smart-matching-internal.controller';
import { WalletLeadFeeService } from './services/wallet-lead-fee.service';
import { VipBroadcastService } from './services/vip-broadcast.service';
import { NeedVisibilityService } from './services/need-visibility.service';
import { NeedChatSessionService } from './services/need-chat-session.service';
import { NeedResolutionService } from './services/need-resolution.service';
import { TrustScoreService } from './services/trust-score.service';
import { NeedExpiryProcessor } from './processors/need-expiry.processor';
import { InternalSecretGuard } from './guards/internal-secret.guard';

@Module({
  imports: [BullModule.registerQueue({ name: 'need-expiry' })],
  controllers: [
    SmartMatchingNeedsController,
    SmartMatchingBusinessController,
    SmartMatchingInternalController,
  ],
  providers: [
    WalletLeadFeeService,
    VipBroadcastService,
    NeedVisibilityService,
    NeedChatSessionService,
    NeedResolutionService,
    TrustScoreService,
    NeedExpiryProcessor,
    InternalSecretGuard,
  ],
  exports: [VipBroadcastService, NeedVisibilityService],
})
export class SmartMatchingModule {}
