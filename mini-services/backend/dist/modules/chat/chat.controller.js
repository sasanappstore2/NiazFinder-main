"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const chat_service_1 = require("./chat.service");
const create_conversation_dto_1 = require("./dto/create-conversation.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const query_messages_dto_1 = require("./dto/query-messages.dto");
const query_conversations_dto_1 = require("./dto/query-conversations.dto");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async getConversations(user, query) {
        return this.chatService.getConversations(user.id, query);
    }
    async createConversation(user, dto) {
        return this.chatService.createConversation(user.id, dto);
    }
    async getConversationInfo(user, id) {
        return this.chatService.getConversationInfo(id, user.id);
    }
    async deleteConversation(user, id) {
        return this.chatService.deleteConversation(id, user.id);
    }
    async getMessages(user, id, query) {
        return this.chatService.getMessages(id, user.id, query);
    }
    async sendMessage(user, id, dto) {
        return this.chatService.sendMessage(user.id, id, dto);
    }
    async markAsRead(user, id) {
        return this.chatService.markAsRead(id, user.id);
    }
    async deleteMessage(user, id) {
        return this.chatService.deleteMessage(id, user.id);
    }
    async searchMessages(user, conversationId, query) {
        return this.chatService.searchMessages(conversationId, user.id, query);
    }
    async getUnreadCount(user) {
        return this.chatService.getUnreadCount(user.id);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'لیست مکالمات کاربر', description: 'دریافت لیست تمام مکالمات کاربر با اطلاعات کاربر مقابل و آخرین پیام' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'شماره صفحه' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'تعداد در هر صفحه' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_conversations_dto_1.QueryConversationsDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Post)('conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'ایجاد یا دریافت مکالمه', description: 'شروع مکالمه جدید با یک کاربر یا دریافت مکالمه موجود' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_conversation_dto_1.CreateConversationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)('conversations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'اطلاعات مکالمه', description: 'دریافت اطلاعات کامل یک مکالمه با شرکت‌کنندگان' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه مکالمه' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversationInfo", null);
__decorate([
    (0, common_1.Delete)('conversations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف مکالمه', description: 'حذف مکالمه و تمام پیام‌های آن' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه مکالمه' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteConversation", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'دریافت پیام‌های مکالمه', description: 'دریافت لیست پیام‌های یک مکالمه با صفحه‌بندی' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه مکالمه' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'شماره صفحه' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'تعداد در هر صفحه' }),
    (0, swagger_1.ApiQuery)({ name: 'before', required: false, description: 'تاریخ مبدأ برای صفحه‌بندی مبتنی بر کرسر (ISO date)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, query_messages_dto_1.QueryMessagesDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('conversations/:id/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'ارسال پیام', description: 'ارسال پیام جدید در یک مکالمه (REST fallback)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه مکالمه' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Put)('conversations/:id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'علامت‌گذاری به عنوان خوانده شده', description: 'علامت‌گذاری تمام پیام‌های خوانده نشده یک مکالمه' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه مکالمه' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Delete)('messages/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف پیام', description: 'حذف پیام (فقط پیام‌های خودتان)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'شناسه پیام' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Get)('messages/search'),
    (0, swagger_1.ApiOperation)({ summary: 'جستجوی پیام‌ها', description: 'جستجو در پیام‌های یک مکالمه' }),
    (0, swagger_1.ApiQuery)({ name: 'conversationId', required: true, description: 'شناسه مکالمه' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, description: 'عبارت جستجو' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('conversationId')),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "searchMessages", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'تعداد پیام‌های خوانده نشده', description: 'دریافت تعداد کل پیام‌های خوانده نشده در تمام مکالمات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map