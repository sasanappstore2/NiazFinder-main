import { PrismaService } from '../../prisma/prisma.service';
import { SearchParams } from './search.interface';
export declare class SearchService {
    private readonly prisma;
    private readonly logger;
    private popularSearchesCache;
    private suggestionsCache;
    private readonly CACHE_TTL_SUGGESTIONS;
    private readonly CACHE_TTL_POPULAR;
    constructor(prisma: PrismaService);
    search(params: SearchParams): Promise<{
        query: string;
        type: "requests" | "specialists" | "all";
        results: any;
    }>;
    getSuggestions(query: string): Promise<{
        suggestions: any;
    }>;
    getPopularSearches(): Promise<{
        popularSearches: {
            query: string;
            count: number;
        }[];
    }>;
    private searchRequests;
    private searchSpecialists;
    private trackSearch;
}
