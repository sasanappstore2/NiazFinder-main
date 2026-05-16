import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplyReferralDto } from './dto/apply-referral.dto';

@ApiTags('Referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات دعوت من و آمار (محافظت شده)' })
  async getMyReferralInfo(@CurrentUser() user: any) {
    return this.referralsService.getMyReferralInfo(user.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحلیل آماری دعوت‌ها (محافظت شده)' })
  async getReferralStats(@CurrentUser() user: any) {
    return this.referralsService.getReferralStats(user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'جدول برترین دعوت‌کنندگان (عمومی)' })
  async getLeaderboard() {
    return this.referralsService.getLeaderboard();
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اعمال کد دعوت (محافظت شده)' })
  async applyReferralCode(
    @CurrentUser() user: any,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.referralsService.applyReferral(user.id, dto.code);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت پاداش دعوت (محافظت شده)' })
  @ApiParam({ name: 'id', description: 'شناسه رکورد دعوت' })
  async claimReward(
    @CurrentUser() user: any,
    @Param('id') referralId: string,
  ) {
    // Claim reward uses wallet integration - delegate to referrals service
    return this.referralsService.processReward(referralId);
  }
}
