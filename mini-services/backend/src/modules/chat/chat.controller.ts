import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── Conversations ────────────────────────────────────────────────────────

  @Get('conversations')
  @ApiOperation({ summary: 'لیست مکالمات کاربر', description: 'دریافت لیست تمام مکالمات کاربر با اطلاعات کاربر مقابل و آخرین پیام' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد در هر صفحه' })
  async getConversations(
    @CurrentUser() user: any,
    @Query() query: QueryConversationsDto,
  ) {
    return this.chatService.getConversations(user.id, query);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'ایجاد یا دریافت مکالمه', description: 'شروع مکالمه جدید با یک کاربر یا دریافت مکالمه موجود' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user.id, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'اطلاعات مکالمه', description: 'دریافت اطلاعات کامل یک مکالمه با شرکت‌کنندگان' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async getConversationInfo(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversationInfo(id, user.id);
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

  // ─── Messages ─────────────────────────────────────────────────────────────

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'دریافت پیام‌های مکالمه', description: 'دریافت لیست پیام‌های یک مکالمه با صفحه‌بندی' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد در هر صفحه' })
  @ApiQuery({ name: 'before', required: false, description: 'تاریخ مبدأ برای صفحه‌بندی مبتنی بر کرسر (ISO date)' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.chatService.getMessages(id, user.id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'ارسال پیام', description: 'ارسال پیام جدید در یک مکالمه (REST fallback)' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, id, dto);
  }

  // ─── Read Receipts ────────────────────────────────────────────────────────

  @Put('conversations/:id/read')
  @ApiOperation({ summary: 'علامت‌گذاری به عنوان خوانده شده', description: 'علامت‌گذاری تمام پیام‌های خوانده نشده یک مکالمه' })
  @ApiParam({ name: 'id', description: 'شناسه مکالمه' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.chatService.markAsRead(id, user.id);
  }

  // ─── Message Deletion ─────────────────────────────────────────────────────

  @Delete('messages/:id')
  @ApiOperation({ summary: 'حذف پیام', description: 'حذف پیام (فقط پیام‌های خودتان)' })
  @ApiParam({ name: 'id', description: 'شناسه پیام' })
  async deleteMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.chatService.deleteMessage(id, user.id);
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  @Get('messages/search')
  @ApiOperation({ summary: 'جستجوی پیام‌ها', description: 'جستجو در پیام‌های یک مکالمه' })
  @ApiQuery({ name: 'conversationId', required: true, description: 'شناسه مکالمه' })
  @ApiQuery({ name: 'q', required: true, description: 'عبارت جستجو' })
  async searchMessages(
    @CurrentUser() user: any,
    @Query('conversationId') conversationId: string,
    @Query('q') query: string,
  ) {
    return this.chatService.searchMessages(conversationId, user.id, query);
  }

  // ─── Unread Count ─────────────────────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد پیام‌های خوانده نشده', description: 'دریافت تعداد کل پیام‌های خوانده نشده در تمام مکالمات' })
  async getUnreadCount(
    @CurrentUser() user: any,
  ) {
    return this.chatService.getUnreadCount(user.id);
  }
}
