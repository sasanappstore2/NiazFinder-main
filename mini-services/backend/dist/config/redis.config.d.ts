import { DynamicModule } from '@nestjs/common';
export declare const REDIS_DEFAULT = "REDIS_DEFAULT";
export declare const REDIS_PUBLISHER = "REDIS_PUBLISHER";
export declare const REDIS_SUBSCRIBER = "REDIS_SUBSCRIBER";
export declare const REDIS_BULLMQ = "REDIS_BULLMQ";
export interface RedisOptions {
    host: string;
    port: number;
    password?: string;
    db?: number;
}
export declare function getRedisToken(name: string): string;
export declare class RedisModule {
    static forRoot(): DynamicModule;
    static forFeature(): DynamicModule;
}
