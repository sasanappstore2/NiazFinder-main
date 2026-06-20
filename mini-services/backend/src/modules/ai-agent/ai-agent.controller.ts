import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiAgentService } from './ai-agent.service';
import { AiChatDto } from './dto/ai-chat.dto';

@ApiTags('AI Agent')
@Controller('ai')
export class AiAgentController {
  private readonly logger = new Logger(AiAgentController.name);

  constructor(private readonly agentService: AiAgentService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer-auth')
  @ApiOperation({ summary: 'Pay-per-message platform AI assistant (SSE stream)' })
  async chat(
    @CurrentUser('id') userId: string,
    @Body() dto: AiChatDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      for await (const event of this.agentService.handleChatStream(userId, dto)) {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);
      }
    } catch (err) {
      this.logger.error('SSE chat stream error', err);
      const message = err instanceof Error ? err.message : 'خطای سرور';
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ code: 'AGENT_ERROR', message })}\n\n`);
    }

    res.end();
  }
}
