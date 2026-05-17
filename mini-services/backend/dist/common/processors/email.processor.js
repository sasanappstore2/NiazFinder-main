"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EmailProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
let EmailProcessor = EmailProcessor_1 = class EmailProcessor extends bullmq_1.WorkerHost {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(EmailProcessor_1.name);
        this.rateLimits = new Map();
        this.dedupCache = new Map();
        this.RATE_LIMIT_MAX = 5;
        this.RATE_LIMIT_WINDOW_MS = 60_000;
        this.DEDUP_WINDOW_MS = 30_000;
    }
    async process(job) {
        const { to, subject, template, context } = job.data;
        const dedupKey = this.hashEmail(to, subject, template);
        const now = Date.now();
        if (this.dedupCache.has(dedupKey)) {
            const prevTime = this.dedupCache.get(dedupKey);
            if (now - prevTime < this.DEDUP_WINDOW_MS) {
                this.logger.warn(`⏭️ Duplicate email skipped: ${to} - ${subject}`);
                return { sent: false, reason: 'duplicate' };
            }
        }
        this.dedupCache.set(dedupKey, now);
        if (!this.checkRateLimit(to)) {
            this.logger.warn(`⏳ Email rate limited for ${to}`);
            throw new Error(`Rate limit exceeded for ${to}. Retrying later...`);
        }
        try {
            this.logger.log(`📧 Sending email to ${to}: ${subject} (template: ${template || 'none'})`);
            await this.simulateSend(to, subject);
            this.logger.log(`✅ Email sent successfully to ${to}: ${subject}`);
            return {
                sent: true,
                to,
                subject,
                template: template || null,
                sentAt: new Date().toISOString(),
            };
        }
        catch (err) {
            this.logger.error(`❌ Failed to send email to ${to}: ${err.message}`);
            throw err;
        }
    }
    checkRateLimit(recipient) {
        const now = Date.now();
        const entry = this.rateLimits.get(recipient);
        if (!entry || now - entry.windowStart > this.RATE_LIMIT_WINDOW_MS) {
            this.rateLimits.set(recipient, { count: 1, windowStart: now });
            return true;
        }
        if (entry.count >= this.RATE_LIMIT_MAX) {
            return false;
        }
        entry.count++;
        return true;
    }
    hashEmail(to, subject, template) {
        return `${to}:${subject}:${template || ''}`.toLowerCase();
    }
    async simulateSend(_to, _subject) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    cleanup() {
        const now = Date.now();
        for (const [key, ts] of this.dedupCache) {
            if (now - ts > this.DEDUP_WINDOW_MS * 2) {
                this.dedupCache.delete(key);
            }
        }
        for (const [key, entry] of this.rateLimits) {
            if (now - entry.windowStart > this.RATE_LIMIT_WINDOW_MS * 2) {
                this.rateLimits.delete(key);
            }
        }
    }
};
exports.EmailProcessor = EmailProcessor;
exports.EmailProcessor = EmailProcessor = EmailProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('email')
], EmailProcessor);
//# sourceMappingURL=email.processor.js.map