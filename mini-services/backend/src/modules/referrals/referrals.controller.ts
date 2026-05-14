import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplyReferralDto } from './dto/apply-referral.dto';

@ApiTags('Referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات دعوت من و آمار' })
  async getMyReferralInfo(@CurrentUser('id') userId: string) {
    return this.referralsService.getMyReferralInfo(userId);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست افراد دعوت شده' })
  async getMyReferrals(
    @CurrentUser('id') userId: string,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.referralsService.getMyReferrals(userId, {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت پاداش دعوت' })
  async claimReward(
    @CurrentUser('id') userId: string,
    @Param('id') referralId: string,
  ) {
    return this.referralsService.claimReward(userId, referralId);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اعمال کد دعوت' })
  async applyReferralCode(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.referralsService.applyReferralCode(userId, dto.code);
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جدول برترین دعوت‌کنندگان' })
  async getTopReferrers() {
    return this.referralsService.getTopReferrers();
  }
}
