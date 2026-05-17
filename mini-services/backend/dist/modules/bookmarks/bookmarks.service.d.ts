import { PrismaService } from '@/prisma/prisma.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';
export declare class BookmarksService {
    private prisma;
    constructor(prisma: PrismaService);
    toggleBookmark(userId: string, dto: ToggleBookmarkDto): Promise<{
        bookmarked: boolean;
        message: string;
    }>;
    getUserBookmarks(userId: string, query: QueryBookmarksDto): Promise<{
        bookmarks: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    isBookmarked(userId: string, type: string, targetId: string): Promise<{
        bookmarked: boolean;
    }>;
    removeBookmark(userId: string, type: string, targetId: string): Promise<{
        message: string;
    }>;
    private validateTarget;
}
