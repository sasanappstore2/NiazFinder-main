import { BaseEntity } from './base.entity';
export declare enum BookmarkType {
    REQUEST = "REQUEST",
    SPECIALIST = "SPECIALIST"
}
export declare class Bookmark extends BaseEntity {
    type: BookmarkType;
    userId: string;
    user: any;
    targetId: string;
}
