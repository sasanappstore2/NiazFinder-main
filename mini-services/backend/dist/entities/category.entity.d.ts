import { BaseEntity } from './base.entity';
export declare class Category extends BaseEntity {
    name: string;
    slug: string;
    description: string;
    icon: string;
    image: string;
    parentId: string | null;
    parent: Category | null;
    children: Category[];
    order: number;
    isActive: boolean;
    requestCount: number;
}
