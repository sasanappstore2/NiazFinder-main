import { BaseEntity } from './base.entity';
export declare class Review extends BaseEntity {
    rating: number;
    qualityRating: number | null;
    timingRating: number | null;
    communicationRating: number | null;
    professionalismRating: number | null;
    pros: string | null;
    cons: string | null;
    isRecommended: boolean;
    comment: string | null;
    response: string | null;
    isPublished: boolean;
    proposalId: string | null;
    proposal: any | null;
    authorId: string;
    author: any;
    targetUserId: string;
    targetUser: any;
    requestId: string;
    request: any;
    communication: number;
    quality: number;
    timing: number;
    professionalism: number;
}
