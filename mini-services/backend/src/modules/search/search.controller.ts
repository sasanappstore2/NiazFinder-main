import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchParams } from './search.interface';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'جستجوی کلی در پلتفرم (عمومی)' })
  @ApiQuery({ name: 'q', required: true, description: 'عبارت جستجو' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'نوع جستجو',
    enum: ['all', 'requests', 'specialists'],
  })
  @ApiQuery({ name: 'city', required: false, description: 'فیلتر شهر' })
  @ApiQuery({ name: 'province', required: false, description: 'فیلتر استان' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'فیلتر دسته‌بندی' })
  @ApiQuery({ name: 'minBudget', required: false, description: 'حداقل بودجه' })
  @ApiQuery({ name: 'maxBudget', required: false, description: 'حداکثر بودجه' })
  @ApiQuery({ name: 'minRating', required: false, description: 'حداقل امتیاز' })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'مرتب‌سازی',
    enum: ['relevance', 'newest', 'price_low', 'price_high', 'rating'],
  })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد نتایج' })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('province') province?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('minRating') minRating?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || !q.trim()) {
      return {
        query: '',
        type: type || 'all',
        results: {
          requests: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
          specialists: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };
    }

    const params: SearchParams = {
      query: q,
      type: (type as any) || 'all',
      city,
      province,
      categoryId,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      sort: (sort as any) || 'relevance',
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 50) : 10,
    };

    return this.searchService.search(params);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'پیشنهادهای خودکار جستجو (عمومی)' })
  @ApiQuery({ name: 'q', required: true, description: 'عبارت جستجو' })
  async getSuggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q);
  }

  @Get('popular')
  @ApiOperation({ summary: 'جستجوهای محبوب (عمومی)' })
  async getPopularSearches() {
    return this.searchService.getPopularSearches();
  }
}
