export declare class CreateReviewDto {
    targetUserId: string;
    proposalId: string;
    requestId: string;
    rating: number;
    comment?: string;
    qualityRating?: number;
    timingRating?: number;
    communicationRating?: number;
    professionalismRating?: number;
    pros?: string;
    cons?: string;
    isRecommended?: boolean;
}
