import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Portfolio } from '../../entities/portfolio.entity';
import { Review } from '../../entities/review.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Skill } from '../../entities/skill.entity';
import { UserSkill } from '../../entities/user-skill.entity';
import { UpdateSpecialistProfileDto } from './dto/update-specialist-profile.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QuerySpecialistsDto } from './dto/query-specialists.dto';
export declare class SpecialistsService {
    private readonly userRepo;
    private readonly portfolioRepo;
    private readonly reviewRepo;
    private readonly proposalRepo;
    private readonly skillRepo;
    private readonly userSkillRepo;
    constructor(userRepo: Repository<User>, portfolioRepo: Repository<Portfolio>, reviewRepo: Repository<Review>, proposalRepo: Repository<Proposal>, skillRepo: Repository<Skill>, userSkillRepo: Repository<UserSkill>);
    findAll(query: QuerySpecialistsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<any>;
    updateProfile(specialistId: string, dto: UpdateSpecialistProfileDto): Promise<{
        message: string;
        data: any;
    }>;
    updateSkills(specialistId: string, dto: UpdateSkillsDto): Promise<{
        message: string;
        data: any;
    }>;
    addPortfolio(specialistId: string, dto: CreatePortfolioDto): Promise<{
        message: string;
        data: any;
    }>;
    updatePortfolio(specialistId: string, portfolioId: string, dto: UpdatePortfolioDto): Promise<{
        message: string;
        data: any;
    }>;
    deletePortfolio(specialistId: string, portfolioId: string): Promise<{
        message: string;
    }>;
    getTopSpecialists(limit?: number): Promise<any>;
    search(query: string, filters?: {
        city?: string;
        province?: string;
        minRating?: number;
        categoryId?: string;
    }): Promise<any>;
    private getUserAvgRating;
    private calcAvg;
    private replaceSkills;
}
