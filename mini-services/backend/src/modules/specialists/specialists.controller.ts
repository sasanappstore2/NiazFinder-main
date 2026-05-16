import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SpecialistsService } from './specialists.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateSpecialistProfileDto } from './dto/update-specialist-profile.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QuerySpecialistsDto } from './dto/query-specialists.dto';

@ApiTags('Specialists')
@Controller('specialists')
export class SpecialistsController {
  constructor(private readonly specialistsService: SpecialistsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست کسب‌وکارها با فیلتر (عمومی، صفحه‌بندی شده)' })
  async findAll(@Query() query: QuerySpecialistsDto) {
    return this.specialistsService.findAll(query);
  }

  @Get('top')
  @ApiOperation({ summary: 'کسب‌وکارهای برتر (عمومی)' })
  @ApiResponse({ status: 200, description: 'لیست متخصصین برتر بر اساس امتیاز' })
  async getTopSpecialists(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.specialistsService.getTopSpecialists(Math.min(parsedLimit, 50));
  }

  @Get('search')
  @ApiOperation({ summary: 'جستجوی کسب‌وکارها (عمومی)' })
  async search(
    @Query('q') q: string,
    @Query('city') city?: string,
    @Query('province') province?: string,
    @Query('minRating') minRating?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    if (!q) {
      return { data: [], message: 'عبارت جستجو الزامی است' };
    }
    return this.specialistsService.search(q, {
      city,
      province,
      minRating: minRating ? parseFloat(minRating) : undefined,
      categoryId,
    });
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پروفایل من (محافظت شده)' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.specialistsService.findById(userId);
  }

  @Get('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نمونه‌کارهای من (محافظت شده)' })
  async getMyPortfolio(@CurrentUser('id') userId: string) {
    const profile = await this.specialistsService.findById(userId);
    return { data: profile.portfolios };
  }

  @Get(':id')
  @ApiOperation({ summary: 'پروفایل کسب‌وکار (عمومی)' })
  @ApiResponse({ status: 200, description: 'پروفایل کامل متخصص' })
  @ApiResponse({ status: 404, description: 'کسب‌وکار یافت نشد' })
  async findOne(@Param('id') id: string) {
    return this.specialistsService.findById(id);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی پروفایل (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'پروفایل بروزرسانی شد' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSpecialistProfileDto,
  ) {
    return this.specialistsService.updateProfile(userId, dto);
  }

  @Put('me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی مهارت‌ها (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'مهارت‌ها بروزرسانی شد' })
  async updateSkills(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSkillsDto,
  ) {
    return this.specialistsService.updateSkills(userId, dto);
  }

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'افزودن نمونه‌کار (محافظت شده)' })
  @ApiResponse({ status: 201, description: 'نمونه‌کار اضافه شد' })
  async addPortfolio(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.specialistsService.addPortfolio(userId, dto);
  }

  @Put('me/portfolio/:portfolioId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی نمونه‌کار (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'نمونه‌کار بروزرسانی شد' })
  @ApiResponse({ status: 404, description: 'نمونه‌کار یافت نشد' })
  async updatePortfolio(
    @CurrentUser('id') userId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.specialistsService.updatePortfolio(userId, portfolioId, dto);
  }

  @Delete('me/portfolio/:portfolioId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف نمونه‌کار (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'نمونه‌کار حذف شد' })
  @ApiResponse({ status: 404, description: 'نمونه‌کار یافت نشد' })
  async deletePortfolio(
    @CurrentUser('id') userId: string,
    @Param('portfolioId') portfolioId: string,
  ) {
    return this.specialistsService.deletePortfolio(userId, portfolioId);
  }
}
