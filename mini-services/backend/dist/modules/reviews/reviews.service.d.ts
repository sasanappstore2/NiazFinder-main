import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
export declare class ReviewsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateReviewDto): Promise<{
        message: string;
        review: any;
    }>;
    findByUser(userId: string, query: {
        page?: number;
        limit?: number;
    }): Promise<{
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
    }>;
    findByRequest(requestId: string): Promise<{
        request: any;
        totalReviews: any;
        averageRating: number;
        reviews: any;
    }>;
    respond(reviewId: string, userId: string, dto: RespondReviewDto): Promise<{
        message: string;
        review: any;
    }>;
    delete(reviewId: string, userId: string, userRole: string): Promise<{
        message: string;
    }>;
    getAverageRating(userId: string): Promise<{
        overall: number;
        quality: number | null;
        timing: number | null;
        communication: number | null;
        professionalism: number | null;
        totalReviews: any;
    }>;
}
