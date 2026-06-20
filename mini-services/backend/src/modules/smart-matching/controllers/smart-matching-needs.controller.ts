import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NeedResolutionService } from '../services/need-resolution.service';
import { NeedChatSessionService } from '../services/need-chat-session.service';
import { NeedVisibilityService } from '../services/need-visibility.service';

@Controller('smart-matching/needs')
export class SmartMatchingNeedsController {
  constructor(
    private readonly resolution: NeedResolutionService,
    private readonly sessions: NeedChatSessionService,
    private readonly visibility: NeedVisibilityService,
  ) {}

  @Get(':id/active-businesses')
  @UseGuards(JwtAuthGuard)
  async activeBusinesses(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const data = await this.sessions.getActiveBusinesses(id, userId);
    return { data };
  }

  @Get(':id/visibility')
  @UseGuards(JwtAuthGuard)
  async visibility(@Param('id') id: string) {
    return this.visibility.getVisibility(id);
  }

  @Post(':id/resolve')
  @UseGuards(JwtAuthGuard)
  async resolve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { businessProfileId: string; rating: number; comment?: string },
  ) {
    return this.resolution.resolveNeed(userId, {
      requestId: id,
      businessProfileId: body.businessProfileId,
      rating: body.rating,
      comment: body.comment,
    });
  }
}
