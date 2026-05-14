import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر جدید' })
  async register(@Body() dto: RegisterDto) {
    const { user, token } = await this.authService.register(dto);
    return {
      message: 'ثبت‌نام با موفقیت انجام شد',
      user,
      token,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'ورود به حساب کاربری' })
  async login(@Body() dto: LoginDto) {
    const { user, token } = await this.authService.login(dto);
    return {
      message: 'ورود با موفقیت انجام شد',
      user,
      token,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'خروج از حساب کاربری' })
  async logout(
    @CurrentUser() user: any,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader;
    return this.authService.logout(user.id, token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت اطلاعات پروفایل کاربر فعلی' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ویرایش پروفایل کاربر' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    const updatedUser = await this.authService.updateProfile(user.id, dto);
    return {
      message: 'پروفایل با موفقیت به‌روزرسانی شد',
      user: updatedUser,
    };
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر رمز عبور' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تمدید توکن احراز هویت' })
  async refreshToken(@CurrentUser() user: any) {
    const { token } = await this.authService.refreshToken(user.id);
    return {
      message: 'توکن با موفقیت تمدید شد',
      token,
    };
  }
}
