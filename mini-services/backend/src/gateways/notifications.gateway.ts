import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Notifications Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const { JwtService } = await import('@nestjs/jwt');
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-2024-production-key',
      });

      const payload = jwtService.verify(token);
      client.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      client.join(`user:${payload.sub}`);
      this.logger.log(`Notification client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.logger.log(`Notification client disconnected: ${user.id}`);
    }
  }

  // Send notification to a specific user
  async sendToUser(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Broadcast to all connected clients
  async broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
