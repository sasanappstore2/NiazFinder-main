import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
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
  @ApiOperation({ summary: 'دریافت درخت دسته‌بندی‌ها (عمومی)' })
  @ApiResponse({ status: 200, description: 'درخت دسته‌بندی‌ها' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('popular')
  @ApiOperation({ summary: 'دسته‌بندی‌های محبوب (عمومی)' })
  @ApiResponse({ status: 200, description: 'لیست 8 دسته‌بندی محبوب' })
  async findPopular() {
    return this.categoriesService.findPopular();
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات دسته‌بندی (عمومی)' })
  @ApiResponse({ status: 200, description: 'اطلاعات دسته‌بندی با زیردسته‌ها' })
  @ApiResponse({ status: 404, description: 'دسته‌بندی یافت نشد' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'زیردسته‌های دسته‌بندی (عمومی)' })
  @ApiResponse({ status: 200, description: 'لیست زیردسته‌ها' })
  async findChildren(@Param('id') id: string) {
    return this.categoriesService.findChildren(id);
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
  @ApiOperation({ summary: 'حذف دسته‌بندی (مدیر - غیرفعال‌سازی نرم)' })
  @ApiResponse({ status: 200, description: 'دسته‌بندی غیرفعال شد' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'دسته‌بندی یافت نشد' })
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
