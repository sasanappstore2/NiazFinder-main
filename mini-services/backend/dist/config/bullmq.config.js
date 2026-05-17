"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BullMQConfigModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMQConfigModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const common_2 = require("@nestjs/common");
const QUEUE_NAMES = ['notification', 'email', 'cleanup', 'search-index'];
let BullMQConfigModule = BullMQConfigModule_1 = class BullMQConfigModule {
    static forRoot() {
        return {
            module: BullMQConfigModule_1,
            imports: [
                bullmq_1.BullModule.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: (config) => {
                        const logger = new common_2.Logger('BullMQ');
                        const redisOptions = {
                            host: config.get('BULLMQ_REDIS_HOST') || config.get('REDIS_HOST') || 'localhost',
                            port: config.get('BULLMQ_REDIS_PORT') || config.get('REDIS_PORT') || 6379,
                            password: config.get('REDIS_PASSWORD') || undefined,
                        };
                        logger.log(`Connecting to Redis at ${redisOptions.host}:${redisOptions.port}`);
                        return {
                            connection: redisOptions,
                            defaultJobOptions: {
                                removeOnComplete: { count: 100 },
                                removeOnFail: { count: 50 },
                                attempts: 3,
                                backoff: {
                                    type: 'exponential',
                                    delay: 2000,
                                },
                            },
                        };
                    },
                }),
            ],
            exports: [bullmq_1.BullModule],
        };
    }
    static registerQueues() {
        return {
            module: BullMQConfigModule_1,
            imports: [
                ...QUEUE_NAMES.map((name) => bullmq_1.BullModule.registerQueue({
                    name,
                })),
            ],
            exports: [bullmq_1.BullModule],
        };
    }
};
exports.BullMQConfigModule = BullMQConfigModule;
exports.BullMQConfigModule = BullMQConfigModule = BullMQConfigModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], BullMQConfigModule);
//# sourceMappingURL=bullmq.config.js.map