import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'جستجوی کلی در پلتفرم' })
  @ApiQuery({ name: 'q', required: true, description: 'عبارت جستجو' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'نوع جستجو (all, requests, specialists, categories)',
    enum: ['all', 'requests', 'specialists', 'categories'],
  })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
  ) {
    if (!q || !q.trim()) {
      return {
        query: '',
        type: type || 'all',
        results: {
          requests: { items: [], total: 0 },
          specialists: { items: [], total: 0 },
          categories: { items: [], total: 0 },
        },
      };
    }

    return this.searchService.search(q, type);
  }
}
