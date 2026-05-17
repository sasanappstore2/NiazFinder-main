import { BookmarksService } from './bookmarks.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';
export declare class BookmarksController {
    private readonly bookmarksService;
    constructor(bookmarksService: BookmarksService);
    getUserBookmarks(user: any, query: QueryBookmarksDto): Promise<{
        bookmarks: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    toggleBookmark(user: any, dto: ToggleBookmarkDto): Promise<{
        bookmarked: boolean;
        message: string;
    }>;
    checkBookmark(user: any, type: string, targetId: string): Promise<{
        bookmarked: boolean;
    }>;
    removeBookmark(user: any, type: string, targetId: string): Promise<{
        message: string;
    }>;
}
