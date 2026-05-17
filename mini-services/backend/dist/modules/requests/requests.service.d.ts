import { Repository } from 'typeorm';
import { Request } from '../../entities/request.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Review } from '../../entities/review.entity';
import { Notification } from '../../entities/notification.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { RedisService } from '../../common/redis/redis.service';
export declare class RequestsService {
    private readonly requestRepo;
    private readonly categoryRepo;
    private readonly userRepo;
    private readonly proposalRepo;
    private readonly reviewRepo;
    private readonly notificationRepo;
    private readonly redis;
    constructor(requestRepo: Repository<Request>, categoryRepo: Repository<Category>, userRepo: Repository<User>, proposalRepo: Repository<Proposal>, reviewRepo: Repository<Review>, notificationRepo: Repository<Notification>, redis: RedisService);
    create(userId: string, dto: CreateRequestDto): Promise<any>;
    findAll(query: QueryRequestsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string, sessionId?: string): Promise<any>;
    update(id: string, userId: string, dto: UpdateRequestDto): Promise<any>;
    delete(id: string, userId: string): Promise<{
        message: string;
    }>;
    updateStatus(id: string, status: string, userId?: string): Promise<any>;
    findByUser(userId: string, query: QueryRequestsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    search(query: string, filters?: {
        categoryId?: string;
        city?: string;
        province?: string;
        status?: string;
    }): Promise<any>;
    getStats(): Promise<{
        total: any;
        open: any;
        inProgress: any;
        completed: any;
        cancelled: any;
        expired: any;
        totalViews: number;
        totalProposals: number;
    }>;
    private shouldIncrementView;
    private notifyMatchingSpecialists;
}
