import { IsNotEmpty, IsOptional, IsString, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'شناسه کاربر' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'نوع اعلان',
    example: 'MESSAGE',
    enum: ['MESSAGE', 'PROPOSAL', 'REVIEW', 'PAYMENT', 'SYSTEM', 'ACHIEVEMENT', 'NEW_MESSAGE', 'NEW_PROPOSAL', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['MESSAGE', 'PROPOSAL', 'REVIEW', 'PAYMENT', 'SYSTEM', 'ACHIEVEMENT', 'NEW_MESSAGE', 'NEW_PROPOSAL', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'])
  type: string;

  @ApiProperty({ description: 'عنوان اعلان', example: 'پیام جدید' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'متن اعلان', example: 'شما یک پیام جدید دریافت کردید' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'داده‌های اضافی', type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
