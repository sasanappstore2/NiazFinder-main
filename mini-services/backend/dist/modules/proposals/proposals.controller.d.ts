import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
export declare class ProposalsController {
    private readonly proposalsService;
    constructor(proposalsService: ProposalsService);
    create(userId: string, dto: CreateProposalDto): Promise<any>;
    findByRequest(requestId: string): Promise<any>;
    getMyProposals(userId: string): Promise<any>;
    updateStatus(id: string, userId: string, dto: UpdateProposalStatusDto): Promise<any>;
    withdraw(id: string, userId: string): Promise<any>;
}
