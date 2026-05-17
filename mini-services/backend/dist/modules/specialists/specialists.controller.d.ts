import { SpecialistsService } from './specialists.service';
import { UpdateSpecialistProfileDto } from './dto/update-specialist-profile.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QuerySpecialistsDto } from './dto/query-specialists.dto';
export declare class SpecialistsController {
    private readonly specialistsService;
    constructor(specialistsService: SpecialistsService);
    findAll(query: QuerySpecialistsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    getTopSpecialists(limit?: string): Promise<any>;
    search(q: string, city?: string, province?: string, minRating?: string, categoryId?: string): Promise<any>;
    getMyProfile(userId: string): Promise<any>;
    getMyPortfolio(userId: string): Promise<{
        data: any;
    }>;
    findOne(id: string): Promise<any>;
    updateProfile(userId: string, dto: UpdateSpecialistProfileDto): Promise<{
        message: string;
        data: any;
    }>;
    updateSkills(userId: string, dto: UpdateSkillsDto): Promise<{
        message: string;
        data: any;
    }>;
    addPortfolio(userId: string, dto: CreatePortfolioDto): Promise<{
        message: string;
        data: any;
    }>;
    updatePortfolio(userId: string, portfolioId: string, dto: UpdatePortfolioDto): Promise<{
        message: string;
        data: any;
    }>;
    deletePortfolio(userId: string, portfolioId: string): Promise<{
        message: string;
    }>;
}
