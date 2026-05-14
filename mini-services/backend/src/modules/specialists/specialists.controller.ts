import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'لیست متخصص‌ها با فیلتر' })
  async findAll(@Query() query: QuerySpecialistsDto) {
    return this.specialistsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'پروفایل متخصص' })
  async findOne(@Param('id') id: string) {
    return this.specialistsService.findOne(id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی پروفایل متخصص' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSpecialistProfileDto,
  ) {
    return this.specialistsService.updateProfile(userId, dto);
  }

  @Put('skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی مهارت‌ها' })
  async updateSkills(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSkillsDto,
  ) {
    return this.specialistsService.updateSkills(userId, dto);
  }

  @Get('me/portfolios')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نمونه‌کارهای من' })
  async getMyPortfolios(@CurrentUser('id') userId: string) {
    return this.specialistsService.getPortfolios(userId);
  }

  @Post('portfolios')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'افزودن نمونه‌کار' })
  async addPortfolio(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.specialistsService.addPortfolio(userId, dto);
  }

  @Put('portfolios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی نمونه‌کار' })
  async updatePortfolio(
    @CurrentUser('id') userId: string,
    @Param('id') portfolioId: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.specialistsService.updatePortfolio(userId, portfolioId, dto);
  }

  @Delete('portfolios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف نمونه‌کار' })
  async deletePortfolio(
    @CurrentUser('id') userId: string,
    @Param('id') portfolioId: string,
  ) {
    return this.specialistsService.deletePortfolio(userId, portfolioId);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تایید/لغو تایید متخصص (ادمین)' })
  async toggleVerification(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
  ) {
    return this.specialistsService.toggleVerification(adminId, userId);
  }
}
