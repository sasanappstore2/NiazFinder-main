import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NeedChatSessionService } from '../services/need-chat-session.service';
import { NeedResolutionService } from '../services/need-resolution.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('smart-matching/business')
export class SmartMatchingBusinessController {
  constructor(
    private readonly sessions: NeedChatSessionService,
    private readonly resolution: NeedResolutionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('private-leads')
  @UseGuards(JwtAuthGuard)
  async privateLeads(@CurrentUser('id') userId: string) {
    const [leads, wallet] = await Promise.all([
      this.sessions.listPrivateLeads(userId),
      this.prisma.wallet.findUnique({ where: { userId } }),
    ]);
    return {
      leads,
      wallet: { balance: wallet?.balance ?? 0, frozen: wallet?.frozen ?? 0 },
    };
  }

  @Post('leads/:outreachId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptLead(
    @Param('outreachId') outreachId: string,
    @CurrentUser('id') userId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const session = await this.sessions.acceptLead(outreachId, userId, idempotencyKey);
    return { session };
  }

  @Post('needs/:id/report-completion')
  @UseGuards(JwtAuthGuard)
  async reportCompletion(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.resolution.reportCompletion(id, userId);
  }
}
