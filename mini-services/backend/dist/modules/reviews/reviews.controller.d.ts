import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    findByUser(userId: string, page?: string, limit?: string): Promise<{
        user: any;
        averageRating: {
            overall: number;
            quality: number | null;
            timing: number | null;
            communication: number | null;
            professionalism: number | null;
            totalReviews: any;
        };
        totalReviews: any;
        ratingDistribution: Record<number, number>;
        page: number;
        limit: number;
        totalPages: number;
        reviews: any;
    } | {
        message: string;
        reviews: never[];
        totalReviews: number;
    }>;
    findByRequest(requestId: string): Promise<{
        request: any;
        totalReviews: any;
        averageRating: number;
        reviews: any;
    }>;
    create(user: any, dto: CreateReviewDto): Promise<{
        message: string;
        review: any;
    }>;
    respond(id: string, user: any, dto: RespondReviewDto): Promise<{
        message: string;
        review: any;
    }>;
    delete(id: string, user: any): Promise<{
        message: string;
    }>;
}
