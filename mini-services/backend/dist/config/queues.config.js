"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QueuesConfigModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesConfigModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
let QueuesConfigModule = QueuesConfigModule_1 = class QueuesConfigModule {
    static forRoot() {
        return {
            module: QueuesConfigModule_1,
            imports: [
                bullmq_1.BullModule.forRoot({
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT || '6379'),
                        password: process.env.REDIS_PASSWORD || undefined,
                    },
                    defaultJobOptions: {
                        removeOnComplete: { count: 100 },
                        removeOnFail: { count: 50 },
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                    },
                }),
            ],
            exports: [bullmq_1.BullModule],
        };
    }
};
exports.QueuesConfigModule = QueuesConfigModule;
exports.QueuesConfigModule = QueuesConfigModule = QueuesConfigModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], QueuesConfigModule);
//# sourceMappingURL=queues.config.js.map