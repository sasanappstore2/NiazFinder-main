import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(q: string, type?: string, city?: string, province?: string, categoryId?: string, minBudget?: string, maxBudget?: string, minRating?: string, sort?: string, page?: string, limit?: string): Promise<{
        query: string;
        type: "requests" | "specialists" | "all";
        results: any;
    } | {
        query: string;
        type: string;
        results: {
            requests: {
                items: never[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            };
            specialists: {
                items: never[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            };
        };
    }>;
    getSuggestions(q: string): Promise<{
        suggestions: any;
    }>;
    getPopularSearches(): Promise<{
        popularSearches: {
            query: string;
            count: number;
        }[];
    }>;
}
