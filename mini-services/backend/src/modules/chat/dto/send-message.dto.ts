import { IsNotEmpty, IsOptional, IsIn, MinLength, MaxLength, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'محتوای پیام', minLength: 1, maxLength: 5000 })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ description: 'نوع پیام', enum: ['TEXT', 'IMAGE', 'FILE', 'VOICE'], default: 'TEXT' })
  @IsOptional()
  @IsIn(['TEXT', 'IMAGE', 'FILE', 'VOICE'])
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
}
