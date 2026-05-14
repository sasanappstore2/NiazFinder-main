import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت درخت دسته‌بندی‌ها' })
  @ApiResponse({ status: 200, description: 'درخت دسته‌بندی‌ها' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('popular')
  @ApiOperation({ summary: 'دسته‌بندی‌های محبوب' })
  @ApiResponse({ status: 200, description: 'لیست دسته‌بندی‌های محبوب' })
  async getPopular() {
    return this.categoriesService.getPopular();
  }

  @Get('search')
  @ApiOperation({ summary: 'جستجوی دسته‌بندی‌ها' })
  @ApiResponse({ status: 200, description: 'نتایج جستجو' })
  async searchCategories(@Query('q') q: string) {
    return this.categoriesService.search(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات دسته‌بندی' })
  @ApiResponse({ status: 200, description: 'اطلاعات دسته‌بندی با زیردسته‌ها' })
  @ApiResponse({ status: 404, description: 'دسته‌بندی یافت نشد' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد دسته‌بندی جدید (مدیر)' })
  @ApiResponse({ status: 201, description: 'دسته‌بندی ایجاد شد' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 409, description: 'اسلاگ تکراری' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی دسته‌بندی (مدیر)' })
  @ApiResponse({ status: 200, description: 'دسته‌بندی بروزرسانی شد' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'دسته‌بندی یافت نشد' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف دسته‌بندی (مدیر)' })
  @ApiResponse({ status: 200, description: 'دسته‌بندی غیرفعال شد' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'دسته‌بندی یافت نشد' })
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
