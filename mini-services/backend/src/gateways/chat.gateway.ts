import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
  ) {
    // Setup Redis pub/sub for horizontal scaling
    this.setupRedisPubSub();
  }

  private async setupRedisPubSub() {
    try {
      await this.redis.subscribe('ws:chat', (message: any) => {
        if (message?.event && message?.payload) {
          this.server.emit(message.event, message.payload);
        }
      });
      this.logger.log('Redis pub/sub enabled for WebSocket scaling');
    } catch (err) {
      this.logger.warn(`Redis pub/sub setup failed: ${(err as Error).message}`);
    }
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Chat Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided (socket: ${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-2024-production-key',
      });

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      // Track connected users
      const userId = payload.sub;
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Join user's personal room
      client.join(`user:${userId}`);

      this.logger.log(`User ${userId} connected (${client.id})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token (socket: ${client.id})`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      const sockets = this.connectedUsers.get(user.id);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(user.id);
          // Notify others that user went offline
          this.server.emit('user:offline', { userId: user.id });
        }
      }
      this.logger.log(`User ${user.id} disconnected (${client.id})`);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: { conversationId: string; content: string; type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    const message = {
      id: crypto.randomUUID(),
      conversationId: data.conversationId,
      content: data.content,
      type: data.type || 'TEXT',
      senderId: user.id,
      createdAt: new Date().toISOString(),
    };

    // Emit to conversation room
    this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);

    // Publish via Redis for multi-instance scaling
    await this.redis.publish('ws:chat', {
      event: 'message:new',
      payload: message,
    });

    return message;
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`User ${user.id} joined conversation ${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      userId: user.id,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      userId: user.id,
      conversationId: data.conversationId,
    });
  }

  // Helper: Check if a user is online
  isUserOnline(userId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  // Helper: Get online status for multiple users
  getOnlineStatus(userIds: string[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const userId of userIds) {
      result[userId] = this.isUserOnline(userId);
    }
    return result;
  }

  // Helper: Send notification to a specific user
  async sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
    await this.redis.publish('ws:chat', {
      event,
      payload: data,
      targetUserId: userId,
    });
  }
}
