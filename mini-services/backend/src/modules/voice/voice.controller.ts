import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { VoiceService } from './voice.service';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Get('credentials')
  credentials(@Query('conversationId') conversationId: string, @Req() req: { user?: { id: string } }) {
    const userId = req.user?.id || 'anonymous';
    const turn = this.voice.generateTurnCredentials(userId);
    return {
      conversationId,
      janusRoomId: conversationId ? this.voice.getJanusRoomForConversation(conversationId) : null,
      turn,
      janusWsUrl: process.env.JANUS_WS_URL || null,
    };
  }
}
