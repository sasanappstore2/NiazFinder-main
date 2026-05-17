import { DynamicModule } from '@nestjs/common';
export declare class BullMQConfigModule {
    static forRoot(): DynamicModule;
    static registerQueues(): DynamicModule;
}
