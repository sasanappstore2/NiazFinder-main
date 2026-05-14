import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'شناسه کاربر' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'نوع اعلان', example: 'NEW_MESSAGE' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: 'عنوان اعلان' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'متن اعلان' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'داده‌های اضافی', type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
