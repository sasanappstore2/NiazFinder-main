import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis/redis.service';
import { IntakeTypingService } from './intake-typing.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', '*'],
    credentials: true,
  },
  namespace: '/intake-typing',
})
export class IntakeTypingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IntakeTypingGateway.name);

  constructor(
    private readonly typing: IntakeTypingService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {
    this.setupRedisPubSub();
  }

  private async setupRedisPubSub() {
    try {
      await this.redis.subscribe('ws:intake-typing', (message: { event?: string; payload?: unknown }) => {
        if (message?.event && message?.payload) {
          this.server.emit(message.event, message.payload);
        }
      });
      this.logger.log('Redis pub/sub enabled for intake-typing');
    } catch (err) {
      this.logger.warn(`Redis pub/sub intake-typing: ${(err as Error).message}`);
    }
  }

  afterInit() {
    this.logger.log('IntakeTyping WebSocket gateway ready');
  }

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const payload = this.jwt.verify<{ sub?: string }>(token);
        client.data.userId = payload.sub;
      } catch {
        client.disconnect(true);
        return;
      }
    }
    client.data.sessionId = client.handshake.query?.sessionId as string | undefined;
    this.logger.debug(`intake-typing connect ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`intake-typing disconnect ${client.id}`);
  }

  @SubscribeMessage('typing.join')
  handleJoin(
    @MessageBody() body: { sessionId: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = body?.sessionId || client.data.sessionId || client.id;
    client.data.sessionId = sessionId;
    client.join(`typing:${sessionId}`);
    return { ok: true, sessionId };
  }

  @SubscribeMessage('typing.analyze')
  async handleAnalyze(
    @MessageBody() body: { sessionId: string; text: string; seq?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = body?.sessionId || client.data.sessionId || client.id;
    const ip = client.handshake.address || 'unknown';
    const limited = await this.typing.checkRateLimit(`${ip}:${sessionId}`);
    if (!limited.ok) {
      client.emit('typing.error', {
        code: 'RATE_LIMIT',
        message: 'تعداد درخواست زیاد است',
        retryAfterMs: limited.retryAfterMs,
      });
      return;
    }

    if (!body?.text || body.text.length > 2000) {
      client.emit('typing.error', { code: 'INVALID', message: 'متن نامعتبر' });
      return;
    }

    try {
      const result = await this.typing.analyze(sessionId, body.text, body.seq);
      client.emit('typing.result', result);
      if (result.suggestions?.length) {
        client.emit('typing.suggestions', { items: result.suggestions });
      }
    } catch (e) {
      this.logger.warn(`analyze failed: ${(e as Error).message}`);
      client.emit('typing.error', {
        code: 'ANALYZE_FAILED',
        message: 'تحلیل موقت در دسترس نیست',
      });
    }
  }

  @SubscribeMessage('typing.cancel')
  handleCancel(@ConnectedSocket() client: Socket) {
    client.data.cancelled = true;
    return { ok: true };
  }
}
