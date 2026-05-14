import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'لیست مکالمات کاربر', description: 'دریافت لیست تمام مکالمات کاربر با اطلاعات کاربر مقابل و آخرین پیام' })
  async getConversations(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getConversations(user.id, { page: Number(page), limit: Number(limit) });
  }

  @Post('conversations')
  @ApiOperation({ summary: 'ایجاد یا دریافت مکالمه', description: 'شروع مکالمه جدید با یک کاربر یا دریافت مکالمه موجود' })
  async createOrGetConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createOrGetConversation(user.id, dto.userId2, dto.requestId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'دریافت پیام‌های مکالمه', description: 'دریافت لیست پیام‌های یک مکالمه با صفحه‌بندی' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.chatService.getMessages(id, user.id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'ارسال پیام', description: 'ارسال پیام جدید در یک مکالمه' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, id, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'علامت‌گذاری به عنوان خوانده شده', description: 'علامت‌گذاری تمام پیام‌های خوانده نشده یک مکالمه' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.chatService.markAsRead(id, user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'حذف مکالمه', description: 'حذف مکالمه و تمام پیام‌های آن' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async deleteConversation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.chatService.deleteConversation(id, user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد پیام‌های خوانده نشده', description: 'دریافت تعداد کل پیام‌های خوانده نشده در تمام مکالمات' })
  async getUnreadCount(
    @CurrentUser() user: any,
  ) {
    return this.chatService.getUnreadCount(user.id);
  }
}
