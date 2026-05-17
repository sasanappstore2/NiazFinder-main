import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
export declare class RequestsController {
    private readonly requestsService;
    constructor(requestsService: RequestsService);
    findAll(query: QueryRequestsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(userId: string, dto: CreateRequestDto): Promise<any>;
    getMyRequests(userId: string, query: QueryRequestsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
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
    findOne(id: string, sessionId?: string): Promise<any>;
    update(id: string, userId: string, dto: UpdateRequestDto): Promise<any>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
}
