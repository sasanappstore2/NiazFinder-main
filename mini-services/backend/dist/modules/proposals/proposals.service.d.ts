import { Repository } from 'typeorm';
import { Proposal } from '../../entities/proposal.entity';
import { Request } from '../../entities/request.entity';
import { User } from '../../entities/user.entity';
import { Review } from '../../entities/review.entity';
import { Notification } from '../../entities/notification.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { RedisService } from '../../common/redis/redis.service';
export declare class ProposalsService {
    private readonly proposalRepo;
    private readonly requestRepo;
    private readonly userRepo;
    private readonly reviewRepo;
    private readonly notificationRepo;
    private readonly redis;
    constructor(proposalRepo: Repository<Proposal>, requestRepo: Repository<Request>, userRepo: Repository<User>, reviewRepo: Repository<Review>, notificationRepo: Repository<Notification>, redis: RedisService);
    create(specialistId: string, dto: CreateProposalDto): Promise<any>;
    findByRequest(requestId: string): Promise<any>;
    findBySpecialist(specialistId: string): Promise<any>;
    updateStatus(id: string, userId: string, dto: UpdateProposalStatusDto): Promise<any>;
    withdraw(proposalId: string, specialistId: string): Promise<any>;
    private acceptProposal;
    private rejectProposal;
    private withdrawProposal;
}
