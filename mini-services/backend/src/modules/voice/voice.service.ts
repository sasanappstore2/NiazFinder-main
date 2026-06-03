import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

@Injectable()
export class VoiceService {
  generateTurnCredentials(userId: string, ttlSec = 86400) {
    const secret = process.env.TURN_STATIC_AUTH_SECRET || 'change-me-turn-secret';
    const epoch = Math.floor(Date.now() / 1000) + ttlSec;
    const username = `${epoch}:${userId}`;
    const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
    return { username, credential, ttlSec };
  }

  getJanusRoomForConversation(conversationId: string): number {
    return (conversationId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 900000) + 100000;
  }
}
