"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_1.WorkerHost {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(NotificationProcessor_1.name);
    }
    async process(job) {
        switch (job.data.type) {
            case 'push':
                this.logger.log(`🔔 Push notification: ${job.data.userId} - ${job.data.title}`);
                return { sent: true };
            case 'email':
                this.logger.log(`📧 Email: ${job.data.to} - ${job.data.subject}`);
                return { sent: true };
            case 'sms':
                this.logger.log(`📱 SMS: ${job.data.phone} - ${job.data.message}`);
                return { sent: true };
            case 'in_app':
                this.logger.log(`📢 In-app notification: ${job.data.userId}`);
                return { sent: true };
            default:
                this.logger.warn(`⚠️ Unknown notification type: ${job.data.type}`);
                return { sent: false };
        }
    }
};
exports.NotificationProcessor = NotificationProcessor;
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notification')
], NotificationProcessor);
//# sourceMappingURL=notifications.processor.js.map