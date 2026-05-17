import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<{
        categories: any;
    }>;
    findPopular(): Promise<{
        categories: any;
    }>;
    findById(id: string): Promise<any>;
    findChildren(id: string): Promise<{
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
}
