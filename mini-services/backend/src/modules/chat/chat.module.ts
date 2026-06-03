import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

const socketGatewayEnabled = process.env.CHAT_SOCKET_GATEWAY_ENABLED === 'true';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ...(socketGatewayEnabled ? [ChatGateway] : []),
  ],
  exports: [ChatService, ...(socketGatewayEnabled ? [ChatGateway] : [])],
})
export class ChatModule {}
