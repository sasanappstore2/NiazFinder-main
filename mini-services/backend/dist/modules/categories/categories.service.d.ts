import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Request } from '../../entities/request.entity';
import { User } from '../../entities/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesService {
    private readonly categoryRepo;
    private readonly proposalRepo;
    private readonly requestRepo;
    private readonly userRepo;
    constructor(categoryRepo: Repository<Category>, proposalRepo: Repository<Proposal>, requestRepo: Repository<Request>, userRepo: Repository<User>);
    findAll(): Promise<{
        categories: any;
    }>;
    findPopular(): Promise<{
        categories: any;
    }>;
    findById(id: string): Promise<any>;
    findChildren(parentId: string): Promise<{
        parent: {
            id: any;
            name: any;
            slug: any;
        };
        subcategories: any;
    }>;
    create(dto: CreateCategoryDto): Promise<{
        category: any;
        message: string;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        category: any;
        message: string;
    }>;
    delete(id: string): Promise<{
        category: any;
        message: string;
    }>;
    incrementRequestCount(categoryId: string): Promise<void>;
    private countSpecialists;
}
