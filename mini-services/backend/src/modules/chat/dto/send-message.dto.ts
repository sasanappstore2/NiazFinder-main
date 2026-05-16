import { IsNotEmpty, IsOptional, IsIn, MinLength, MaxLength, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'محتوای پیام', minLength: 1, maxLength: 10000 })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ description: 'نوع پیام', enum: ['TEXT', 'IMAGE', 'FILE', 'AUDIO'], default: 'TEXT' })
  @IsOptional()
  @IsIn(['TEXT', 'IMAGE', 'FILE', 'AUDIO'])
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO';

  @ApiPropertyOptional({ description: 'URL فایل پیوست شده' })
  @IsOptional()
  @IsString()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'نام فایل' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({ description: 'حجم فایل به بایت' })
  @IsOptional()
  @IsString()
  fileSize?: number;
}
